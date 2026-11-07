// Room design API. Provider keys stay in the Worker environment.
const VISION_URL = 'https://fal.run/openrouter/router/vision';
const EDIT_URL = 'https://fal.run/fal-ai/flux-pro/kontext';
const PLANNER_MODEL = 'google/gemini-2.5-flash';
const SEARCH_MODEL = 'google/gemini-2.5-flash:online';
const MAX_IMAGE_CHARS = 3_000_000;

const PLANNER_PROMPT = `You are Waia, a room design assistant for US customers. You receive a photo of the customer's room and their answers.
Find the revisions this room can realistically take, based on what you see and what they asked for.
Return only JSON with this shape:
{"summary":"...","editPrompt":"...","items":[{"name":"...","reason":"...","query":"..."}]}
summary: two warm sentences on what you will change and why it suits this room.
editPrompt: instruction for an image editor. Start with "Keep the exact room, walls, floor, camera angle and lighting." Then describe only the changes and where they go.
items: 2 to 4 products to buy for those changes. name is a short product type. reason says why it fits this room. query is an Amazon search phrase with material, color and size.
Respect the budget. Do not invent brands or prices.`;

const CHAT_PROMPT = `You are Waia, a friendly interior design assistant for US customers. Give short, practical advice in under 90 words. Do not invent prices or brands.`;

function searchPrompt(items, budget) {
  const list = items.map((item, index) => `${index + 1}. ${item.query}`).join('\n');
  return `Search the web for products currently sold on amazon.com for each numbered need.
${budget ? `Total budget for all items: ${budget}.` : ''}
${list}
Return only JSON: [{"item":1,"products":[{"title":"...","price":"$00.00"}]}]
Give up to 3 real products per item at different price points. Use the exact product title you found. If you do not know the price, use null. Never invent a product.`;
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function callFal(url, key, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Key ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('fal ' + response.status + ' ' + detail.slice(0, 200));
  }
  return response.json();
}

function parseJson(output, open, close) {
  const text = String(output);
  return JSON.parse(text.slice(text.indexOf(open), text.lastIndexOf(close) + 1));
}

function amazonSearch(query) {
  return 'https://www.amazon.com/s?k=' + encodeURIComponent(query);
}

function clip(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validImage(value) {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_CHARS) return false;
  if (value.startsWith('data:image/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.fal.media');
  } catch {
    return false;
  }
}

async function plan(body, key) {
  if (!validImage(body.image)) return json({ error: 'We could not read that photo.' }, 400);
  const answers = body.answers || {};
  const changes = Array.isArray(answers.changes) ? answers.changes.slice(0, 8).map(item => clip(item, 60)).join(', ') : '';
  const result = await callFal(VISION_URL, key, {
    model: PLANNER_MODEL,
    system_prompt: PLANNER_PROMPT,
    prompt: `Room type: ${clip(answers.room, 40) || 'not set'}
Style: ${clip(answers.style, 40) || 'not set'}
Wanted changes: ${changes || 'not set'}
Extra notes: ${clip(answers.note, 300) || 'none'}
Budget: ${clip(answers.budget, 40) || 'not set'}
Setup preferences: ${clip(body.context, 300) || 'none'}`,
    image_urls: [body.image],
  });
  const raw = parseJson(result.output, '{', '}');
  if (typeof raw.editPrompt !== 'string' || !Array.isArray(raw.items)) throw new Error('Invalid plan');
  return json({
    summary: clip(raw.summary, 360) || 'Here is your updated room.',
    editPrompt: clip(raw.editPrompt, 900),
    items: raw.items.slice(0, 4).map(item => ({
      name: clip(item.name, 60),
      reason: clip(item.reason, 180),
      query: clip(item.query || item.name, 100),
    })).filter(item => item.name),
  });
}

async function products(body, key) {
  const items = Array.isArray(body.items) ? body.items.slice(0, 4).map(item => ({ ...item, query: clip(item.query, 100) })) : [];
  const found = items.map(() => []);
  try {
    const result = await callFal(VISION_URL, key, {
      model: SEARCH_MODEL,
      prompt: searchPrompt(items, clip(body.budget, 40)),
      image_urls: [],
    });
    for (const entry of parseJson(result.output, '[', ']')) {
      const target = found[Number(entry.item) - 1];
      if (!target || !Array.isArray(entry.products)) continue;
      for (const product of entry.products.slice(0, 3)) {
        const title = clip(product.title, 110);
        // A model can return a dead product page, so the link searches Amazon for the exact title.
        if (title) target.push({ title, price: product.price ? clip(String(product.price), 14) : null, url: amazonSearch(title) });
      }
    }
  } catch (error) {
    console.error('product search failed', error.message);
  }
  return json({ items: items.map((item, index) => ({ ...item, searchUrl: amazonSearch(item.query), products: found[index] })) });
}

async function render(body, key) {
  if (!validImage(body.image)) return json({ error: 'We could not read that photo.' }, 400);
  const prompt = clip(body.editPrompt, 900);
  if (!prompt) return json({ error: 'The design plan is missing.' }, 400);
  const picks = Array.isArray(body.products) ? body.products.slice(0, 4).map(item => clip(item, 110)).filter(Boolean) : [];
  const result = await callFal(EDIT_URL, key, {
    prompt: picks.length ? `${prompt} The new pieces should look like these products: ${picks.join('; ')}.` : prompt,
    image_url: body.image,
    output_format: 'jpeg',
    num_images: 1,
  });
  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) throw new Error('fal returned no image');
  return json({ imageUrl });
}

async function chat(body, key) {
  const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
  const transcript = messages.map(message => `${message.from === 'you' ? 'Customer' : 'Waia'}: ${clip(message.text, 400)}`).join('\n');
  if (!transcript) return json({ error: 'Ask a question first.' }, 400);
  const result = await callFal(VISION_URL, key, {
    model: PLANNER_MODEL,
    system_prompt: CHAT_PROMPT,
    prompt: transcript + '\nWaia:',
    image_urls: [],
  });
  return json({ reply: clip(String(result.output).replace(/^\s*Waia:\s*/, ''), 700) });
}

const routes = { plan, products, render, chat };

export async function roomApi(name, request, env) {
  const handler = routes[name];
  if (!handler) return json({ error: 'Not found.' }, 404);
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!env.FAL_KEY) return json({ error: 'Live design is not configured.' }, 503);
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  try {
    return await handler(body, env.FAL_KEY);
  } catch (error) {
    console.error(name + ' failed', error.message);
    return json({ error: 'That step did not finish. Please try again.' }, 502);
  }
}
