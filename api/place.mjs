// POST /api/place — seçilen gerçek ürünleri kullanıcının oda fotoğrafına fal ile yerleştirir.
// Gövde: { image: "data:image/jpeg;base64,..." | "https://...fal.media/...", asins: ["B0..."], sofaCm: 200 }
// Yanıt: { image: "https://...", model, products: [...] }
// Anahtar: FAL_KEY (Cloudflare secret, yerelde .dev.vars). Model: FAL_MODEL (varsayılan nano-banana/edit).

const MAX_IMAGE_CHARS = 6_000_000; // ~4.5 MB base64
const MAX_PRODUCTS = 3;
const PLACEMENT = {
  clock: 'hang it on the empty wall area above the sofa, centered over the sofa, at a natural height',
  lamp: 'stand it on the floor right beside one end of the sofa, so the shade sits above the armrest like a reading lamp',
  art: 'hang it on the wall above the sofa',
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function validImage(image) {
  if (typeof image !== 'string') return false;
  if (image.startsWith('data:image/')) return /^data:image\/(jpeg|png|webp);base64,/.test(image) && image.length <= MAX_IMAGE_CHARS;
  try {
    const url = new URL(image);
    return url.protocol === 'https:' && (url.hostname === 'fal.media' || url.hostname.endsWith('.fal.media'));
  } catch { return false; }
}

function sizeText(spec) {
  if (spec.type === 'clock' && spec.diameterCm) return `about ${spec.diameterCm} cm in diameter`;
  if (spec.type === 'lamp' && spec.heightCm) return `about ${spec.heightCm} cm tall`;
  return 'realistically sized';
}

function buildPrompt(items, sofaCm) {
  const lines = items.map((item, i) => {
    const ref = item.spec.imageUrl ? `the product shown in reference image ${item.refIndex}` : `a ${item.spec.name || item.spec.type}`;
    return `${i + 1}. Add ${ref} (${item.spec.brand ? item.spec.brand + ' ' : ''}${item.spec.name || item.spec.type}), ${sizeText(item.spec)}: ${PLACEMENT[item.spec.type] || 'place it naturally in the room'}.`;
  });
  return [
    'Edit the first image, which is a photo of a real living room.',
    'Keep the room exactly as it is: same walls, furniture, camera angle, perspective, lighting and colors. Do not remove or move anything.',
    ...lines,
    `For scale: the sofa is about ${sofaCm} cm wide. Products must keep their real proportions relative to the sofa.`,
    items.some(item => item.spec.imageUrl) ? 'Reproduce each referenced product faithfully: same shape, color, material and details as in its reference image.' : '',
    'Match the room lighting and add natural contact shadows. Photorealistic interior photo. No text, labels or watermarks.',
  ].filter(Boolean).join('\n');
}

export async function handlePlace(request, env) {
  if (request.method !== 'POST') return json({ error: 'Yalnızca POST' }, 405);
  if (!env.FAL_KEY) return json({ error: 'Sunucuda FAL_KEY tanımlı değil' }, 503);
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_IMAGE_CHARS + 10_000) return json({ error: 'Fotoğraf çok büyük' }, 413);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }
  const { image, asins } = body || {};
  const sofaCm = Math.min(400, Math.max(80, Number(body?.sofaCm) || 200));
  if (!validImage(image)) return json({ error: 'Geçersiz oda fotoğrafı' }, 400);
  if (!Array.isArray(asins) || !asins.length || asins.length > MAX_PRODUCTS) return json({ error: '1–3 ürün seç' }, 400);

  // Ürünler yalnızca katalogdan gelir; serbest prompt kabul edilmez.
  const catalogResponse = await env.ASSETS.fetch(new Request(new URL('/fit-data.json', request.url)));
  if (!catalogResponse.ok) return json({ error: 'Katalog okunamadı' }, 500);
  const catalog = await catalogResponse.json();

  const imageUrls = [image];
  const items = [];
  for (const asin of [...new Set(asins)]) {
    const spec = catalog.products?.[asin];
    if (!spec) return json({ error: 'Bilinmeyen ürün: ' + asin }, 400);
    const item = { asin, spec };
    if (spec.imageUrl) {
      imageUrls.push(spec.imageUrl);
      item.refIndex = imageUrls.length;
    }
    items.push(item);
  }

  const model = env.FAL_MODEL || 'fal-ai/nano-banana/edit';
  const prompt = buildPrompt(items, sofaCm);
  let response;
  try {
    response = await fetch('https://fal.run/' + model, {
      method: 'POST',
      headers: { Authorization: 'Key ' + env.FAL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_urls: imageUrls, num_images: 1, output_format: 'jpeg' }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    return json({ error: 'fal yanıt vermedi: ' + (error?.name === 'TimeoutError' ? 'zaman aşımı' : 'bağlantı hatası') }, 504);
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    const detail = typeof problem.detail === 'string' ? problem.detail : Array.isArray(problem.detail) ? problem.detail[0]?.msg : '';
    return json({ error: 'fal HTTP ' + response.status + (detail ? ' — ' + String(detail).replaceAll(env.FAL_KEY, '[gizli]') : '') }, 502);
  }
  const result = await response.json();
  const url = result?.images?.[0]?.url;
  if (!url) return json({ error: 'fal görsel döndürmedi' }, 502);
  return json({
    image: url,
    model,
    products: items.map(({ asin, spec }) => ({ asin, type: spec.type, brand: spec.brand, name: spec.name, usedReference: Boolean(spec.imageUrl) })),
  });
}
