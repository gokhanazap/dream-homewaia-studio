// Room design API. Provider keys stay in the Worker environment.
const VISION_URL = 'https://fal.run/openrouter/router/vision';
const EDIT_URL = 'https://fal.run/fal-ai/flux-pro/kontext';
const PLANNER_MODEL = 'google/gemini-2.5-flash';
const SEARCH_MODEL = 'google/gemini-2.5-flash:online';
const MAX_IMAGE_CHARS = 3_000_000;
const MAX_REQUEST_CHARS = 400;

const PLANNER_PROMPT = `You are Waia, a room design assistant for US customers. Look at the room photo and the customer's request.
Return only JSON with this shape:
{"reply":"...","editPrompt":"...","items":[{"name":"...","reason":"...","query":"..."}]}
reply: one or two warm sentences explaining what you changed and why it suits this room.
editPrompt: instruction for an image editor. Start with "Keep the exact room, walls, furniture, camera angle and lighting." Then describe only the requested additions or changes and where they go.
items: 1 to 3 products to buy for those changes. name is a short product type. reason says why it fits this room. query is an Amazon search phrase with material, color and size.
Do not invent brands or prices.`;

function searchPrompt(items, budget) {
  const list = items.map((item, index) => `${index + 1}. ${item.query}`).join('\n');
  return `Search the web for products currently sold on amazon.com for each numbered need.
${budget ? `Total budget for all items: ${budget}.` : ''}
${list}
Return only JSON: [{"item":1,"products":[{"title":"...","price":"$00.00","url":"https://www.amazon.com/dp/ASIN"}]}]
Give up to 3 products per item at different price points. Use only real product pages you found. If you do not know the price, use null. Never invent an ASIN or URL.`;
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

function cleanPlan(raw) {
  if (typeof raw.editPrompt !== 'string' || !Array.isArray(raw.items)) throw new Error('Invalid plan');
  return {
    reply: String(raw.reply || 'Here is your updated room.').slice(0, 320),
    editPrompt: raw.editPrompt.slice(0, 900),
    items: raw.items.slice(0, 3).map(item => ({
      name: String(item.name || '').slice(0, 60),
      reason: String(item.reason || '').slice(0, 180),
      query: String(item.query || item.name || '').slice(0, 100),
    })).filter(item => item.name),
  };
}

async function findProducts(key, items, budget) {
  const found = items.map(() => []);
  try {
    const result = await callFal(VISION_URL, key, {
      model: SEARCH_MODEL,
      prompt: searchPrompt(items, budget),
      image_urls: [],
    });
    for (const entry of parseJson(result.output, '[', ']')) {
      const target = found[Number(entry.item) - 1];
      if (!target || !Array.isArray(entry.products)) continue;
      for (const product of entry.products.slice(0, 3)) {
        const title = String(product.title || '').trim().slice(0, 110);
        // A model can return a dead product page, so the link searches Amazon for the exact title.
        if (title) target.push({ title, price: product.price ? String(product.price).slice(0, 14) : null, url: amazonSearch(title) });
      }
    }
  } catch (error) {
    console.error('product search failed', error.message);
  }
  return found;
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

export async function designRoom(request, env) {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!env.FAL_KEY) return json({ error: 'Live design is not configured.' }, 503);

  const body = await request.json().catch(() => null);
  const wish = typeof body?.request === 'string' ? body.request.trim() : '';
  const budget = typeof body?.budget === 'string' ? body.budget.slice(0, 30) : '';
  const context = typeof body?.context === 'string' ? body.context.slice(0, 300) : '';
  if (!validImage(body?.image)) return json({ error: 'We could not read that photo.' }, 400);
  if (!wish || wish.length > MAX_REQUEST_CHARS) return json({ error: 'Tell us what you would like to change.' }, 400);

  try {
    const planned = await callFal(VISION_URL, env.FAL_KEY, {
      model: PLANNER_MODEL,
      system_prompt: PLANNER_PROMPT,
      prompt: `Customer request: ${wish}\nBudget: ${budget || 'not set'}\nPreferences: ${context || 'none'}`,
      image_urls: [body.image],
    });
    const plan = cleanPlan(parseJson(planned.output, '{', '}'));
    const [edited, products] = await Promise.all([
      callFal(EDIT_URL, env.FAL_KEY, { prompt: plan.editPrompt, image_url: body.image, output_format: 'jpeg', num_images: 1 }),
      findProducts(env.FAL_KEY, plan.items, budget),
    ]);
    const imageUrl = edited.images?.[0]?.url;
    if (!imageUrl) throw new Error('fal returned no image');
    return json({
      imageUrl,
      reply: plan.reply,
      items: plan.items.map((item, index) => ({ ...item, searchUrl: amazonSearch(item.query), products: products[index] })),
    });
  } catch (error) {
    console.error('design failed', error.message);
    return json({ error: 'We could not finish this design.' }, 502);
  }
}
