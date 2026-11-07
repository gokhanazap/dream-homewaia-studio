# Dream Room

Dream Room is a mobile web app that redesigns the room you already have. Upload a photo, pick a style and budget, and see your room before and after, with real products and prices placed on the image.

Built for the RevenueCat x Third Room x fal x Neon Apps AI Hackathon in November 2026, for the US market.

## How it works

1. The customer uploads a room photo and picks the room type, style, changes and budget on one page.
2. An AI planner looks at the photo and decides what can change.
3. A web search finds real products for each change, across any online store.
4. fal renders the new room using those products.
5. The result shows a before and after view, with a price on each product and a link to the store.
6. The customer can keep refining the design or ask the design chat for advice.

The home page also shows a short video of a room transforming, followed by the prices of its products. That video is a prepared example. The live flow creates images, not video.

## Plans

Each generated image uses 1 credit. Payments run through RevenueCat Web Billing in sandbox mode, so no real money is charged.

| Plan | Price | Credits |
| --- | --- | --- |
| Free | $0 | 1 |
| Weekly | $9.99 | 50 per week |
| Yearly | $39.99 | 300 per year, given up front |
| Credit pack | $4.99 | 20 |

## Tech stack

- Static front end in plain JavaScript, with no build step
- Cloudflare Worker for routing and the API
- fal for all AI work:
  - `openrouter/router/vision` with Gemini 2.5 Flash for planning, product search, chat and finding items in the image
  - `fal-ai/flux-pro/kontext` for editing the room photo
  - `minimax/h3/image-to-video` for the home page video, made ahead of time
- RevenueCat Web Billing with Stripe sandbox

## Run locally

You need Node.js and a [fal API key](https://fal.ai/dashboard/keys).

1. Create a `.dev.vars` file in the project root. Git ignores this file.

   ```
   FAL_KEY=your_key_here
   ```

2. Start the local server:

   ```sh
   npx wrangler dev
   ```

3. Open http://localhost:8787. First-time visitors go through onboarding, then land in the app.

Without the key the app opens but cannot create designs.

To test a payment, use the Stripe test card `4242 4242 4242 4242` with any future expiry date and any CVC.

## Project structure

```
public/app/          Home, Create, Result, Designs, Chat and Settings
public/onboarding/   First-visit flow and paywall
public/assets/       Shared images and the home page video
public/styles.css    Shared styles
room-api.mjs         API routes: plan, products, render, chat
worker.mjs           Routing for the Cloudflare Worker
scripts/             Image generation for the example rooms
docs/                Design template, team plan and pitch outline
```

## Keys

`FAL_KEY` stays on the server, in `.dev.vars` locally and as a Cloudflare secret in production. The key in `public/app/config.js` is RevenueCat's public sandbox key, which is meant to run in the browser. Never put a secret key in `public/`.

## Deploy

Run this with access to the Cloudflare account for `getwaia.com`:

```sh
npx wrangler deploy
```

## Known limits

- Credits and plans are checked in the browser, not on the server.
- Product links and prices come from a web search and can go out of date. Links that return a 404 fall back to a shopping search.
- Rendered products look like the real ones but are not exact copies.

## Next steps

- Move credit and plan checks to the server
- Verify product links and prices
- Add store affiliate links
- Offer video reveals in the live flow

See [HANDOFF.md](HANDOFF.md) for more project notes.
