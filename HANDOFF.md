# Dream Room project handoff

Dream Room is a mobile web prototype for the US market. A customer uploads a room photo, picks a style and budget, and gets a redesigned image with products from online stores.

- `/app/` is the single entry point. First-time visitors are sent through `public/onboarding/`, then return to the app.
- `public/app/` holds Home, Create, Result, Designs, Chat and Settings. `room-api.mjs` holds the plan, products, render and chat API.
- `public/styles.css` and `public/assets/` are shared. The app has its own `public/app/app.css`.
- `worker.mjs` and `wrangler.jsonc` route the two Cloudflare entry points.
- [Team plan](docs/TEAM_PLAN.md) describes ownership and the session handoff. [Pitch outline](docs/PITCH_DECK.md) describes the public demo.

## Local development

Add `FAL_KEY=...` to a local `.dev.vars` file, then run `npx wrangler dev` and open `/`. Without the key the app opens but cannot create designs. RevenueCat runs in sandbox mode, so no real money is charged.

## Deploy

Run `npx wrangler deploy` with access to the Cloudflare account for `getwaia.com`. Publish source changes to the [GitHub repository](https://github.com/gokhanazap/dream-homewaia-studio).

## Next milestone

Move credits and plan checks to the server, verify product links, and add store-level affiliate links. Credits currently live in the browser.

The optional `scripts/generate-assets.mjs` script reads a fal API key from standard input and writes JPEG images. Convert the output to WebP before replacing the checked-in assets. Supply the key from a secure environment variable and keep it out of source control.

```sh
printf '%s\n' "$WAIA_FAL_KEY" | node scripts/generate-assets.mjs
```
