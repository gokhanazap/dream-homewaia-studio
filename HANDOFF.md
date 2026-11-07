# Waia Studio project handoff

Waia Studio is a mobile web prototype for the US market. It shows how a few useful additions can complete an existing room. The sample living room adds a wall clock and floor lamp. Each item opens two similar products on Amazon.com.

- [Onboarding and paywall](https://getwaia.com/onboarding/) lives in `public/onboarding/`.
- [Three-tab web app](https://getwaia.com/app/) lives in `public/app/`. The tabs are Design, Products, and Profile.
- `public/styles.css` and `public/assets/` are shared. The app has its own `public/app/app.css`.
- `worker.mjs` and `wrangler.jsonc` route the two Cloudflare entry points.
- [Team plan](docs/TEAM_PLAN.md) describes ownership and the session handoff. [Pitch outline](docs/PITCH_DECK.md) describes the public demo.

## Local development

Run `npx wrangler dev` from the repository root. Open `/onboarding/` for setup and the paywall or `/app/` for the demo. The Worker serves the same base stylesheet and images under both routes. The checked-in sample images are ready to use.

## Deploy

Run `npx wrangler deploy` with access to the Cloudflare account for `getwaia.com`. Publish source changes to the [GitHub repository](https://github.com/gokhanazap/dream-homewaia-studio).

## Next milestone

Connect camera capture or photo upload, room analysis, and fal image editing on the server. Use the prepared living-room images to keep the demo available before those services are configured.

The optional `scripts/generate-assets.mjs` script reads a fal API key from standard input and writes JPEG images. Convert the output to WebP before replacing the checked-in assets. Supply the key from a secure environment variable and keep it out of source control.

```sh
printf '%s\n' "$WAIA_FAL_KEY" | node scripts/generate-assets.mjs
```
