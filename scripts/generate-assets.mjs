import { createInterface } from 'node:readline';
import { writeFile } from 'node:fs/promises';

let key = process.env.FAL_KEY?.trim();
if (!key) {
  const input = createInterface({ input: process.stdin, terminal: false });
  process.stdout.write('Waiting for the fal API key.\n');
  for await (const line of input) {
    key = line.trim();
    break;
  }
}
if (!key) throw new Error('Set FAL_KEY or supply it via standard input.');
const headers = { Authorization: 'Key ' + key, 'Content-Type': 'application/json' };

async function generate(name, model, payload) {
  const response = await fetch('https://fal.run/' + model, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...payload, output_format: 'jpeg', num_images: 1 }),
    signal: AbortSignal.timeout(115000),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    const reason = typeof problem.detail === 'string' ? problem.detail.replaceAll(key, '[redacted]') : '';
    throw new Error(name + ': fal HTTP ' + response.status + (reason ? ' — ' + reason : ''));
  }
  const { images } = await response.json();
  const result = await fetch(images[0].url, { signal: AbortSignal.timeout(30000) });
  if (!result.ok) throw new Error(name + ': image HTTP ' + result.status);
  await writeFile(new URL('../public/assets/' + name + '.jpg', import.meta.url), Buffer.from(await result.arrayBuffer()));
  console.log(name + ' saved');
  return images[0].url;
}

const model = 'fal-ai/flux/schnell';
if (process.argv.includes('--onboarding')) {
  const image_url = await generate('makeover-before', model, {
    prompt: 'Vertical 2:3 photorealistic interior photograph looking straight down a neglected, empty Mediterranean home entry hall. Centered arched wooden front door at the far end, matching arched transom admitting daylight, side arch on the left and plain solid right wall. Peeling stained plaster, worn exposed wood beams, cracked concrete and a few bits of rubble. Honest architectural photography, no people, text or logos.',
    image_size: { width: 768, height: 1152 }, num_inference_steps: 4,
  });
  await generate('makeover-after', 'fal-ai/flux-pro/kontext', {
    image_url, aspect_ratio: '2:3',
    prompt: 'Photorealistic complete renovation of this exact Mediterranean entry hall. Keep camera position, perspective, portrait framing, proportions, and the exact locations and shapes of the door, transom, ceiling beams and side arch. Restore beams and paint the existing door soft blue, smooth the walls with powder blue limewash, replace concrete with a terracotta and blue patterned tile floor, add a brass pendant, a narrow bench with linen cushions and a potted olive tree. Clear the debris. Elegant and finished, natural daylight, no people, text or logos.',
  });
} else {
  const before = generate('room-before', model, {
    prompt: 'Photorealistic editorial interior photograph of a modest contemporary American apartment living room, straight on, warm ivory plaster wall entirely empty, oatmeal linen sofa centered against blank wall, low oak coffee table on a simple neutral rug, daylight from left tall side window, warm muted terracotta and sage hints in cushions, empty floor corners, tasteful honest lived-in interior, premium magazine grain, no floor lamp, no wall clock, no art, no text, no letters, no logos.',
    image_size: { width: 1024, height: 768 }, num_inference_steps: 4,
  }).then(image_url => generate('room-after', 'fal-ai/flux-pro/kontext', {
    image_url, aspect_ratio: '4:3',
    prompt: 'Keep the exact room, sofa, camera perspective, lighting and arrangement. Only add two small realistic purchasable home accessories: a simple round natural oak wall clock with a white face and black markers hanging above the right half of the sofa at 65 percent of image width and 32 percent of image height, and a warm floor lamp with a slender dark stem and wide off-white linen drum shade beside the left end of the sofa at 20 percent of image width. Warm lampshade slightly illuminated. Interior editorial photo, no overlay or typography.',
  }));
  const results = await Promise.allSettled([
    before,
    generate('bedroom', model, {
      prompt: 'Architectural Digest interior photography of a serene Mediterranean minimalist bedroom, raw linen bedding, warm sand plaster walls, upholstered bed and olive colored throw, arched shadow, oak bedside table, late afternoon warm sun, sophisticated editorial composition, no text, no logos.',
      image_size: { width: 1024, height: 640 }, num_inference_steps: 4,
    }),
    generate('styles', model, {
      prompt: 'Strict 2 by 2 contact sheet, four separate photorealistic living room interior photographs, each quadrant fills exactly one quarter of image without any gutters, margins, text or borders. Top left Scandinavian clean cream oak minimalist living room. Top right high-end modern contemporary charcoal and tan leather living room. Bottom left bohemian warm terracotta living room with rugs and tropical plants. Bottom right classic traditional living room with wall molding and traditional furniture. Interior design editorial photography, no typography.',
      image_size: 'square_hd', num_inference_steps: 4,
    }),
  ]);
  for (const result of results) {
    if (result.status === 'rejected') {
      process.exitCode = 1;
      console.error(result.reason.message);
    }
  }
}
