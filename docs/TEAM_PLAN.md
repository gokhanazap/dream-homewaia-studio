# Waia Studio hackathon team plan

The product helps people find the pieces their room is missing, see what those pieces look like in place, and shop options that fit their space and budget. The target market is the United States. Use US English, dollars, inches, and Amazon.com.

## Work in parallel

| Owner | Live entry point | Files |
| --- | --- | --- |
| Onboarding and paywall | [/onboarding/](https://getwaia.com/onboarding/) | `public/onboarding/` |
| Room design, products, and profile | [/app/](https://getwaia.com/app/) | `public/app/` and room API modules |
| Shared deployment and assets | Both entry points | `worker.mjs`, `wrangler.jsonc`, `public/styles.css`, and `public/assets/` |

Start each piece of work from the latest `main`. Use a branch per owner, push each completed change, and merge through pull requests. Coordinate before editing a shared file. If a feature branch predates the split, move its room UI changes into `public/app/` and preserve the new routes when merging Worker changes.

## Integration contract

Choosing a plan or continuing for free opens `/app/`. The setup page passes the optional plan and the selected preferences through the same-origin session storage key `waia-room-demo-context`. The app also opens directly without setup. The existing `/onboarding/?demo` link redirects to `/app/`.

The paywall shows Weekly at $9.99 and Yearly at $39.99. These are demo prices. Payment integration is a separate work item.

## MVP priorities

1. Make the prepared living-room demo easy to present. Show the before and after images, open the clock and lamp product options, and show how a customer reaches Amazon.
2. Add room photo capture and upload. Analyze which useful items can be added or changed, then generate a new image with fal. Keep provider credentials on the server.
3. Add fit and budget support. An initial calculator can use the user's wall or sofa width and filter product suggestions by dimensions in inches. A budget indicator can compare selected items with the user's dollar budget.
4. Prepare the pitch, a demo QR code, and a recording of the prepared flow.

The fit calculator, live photo processing, billing, and affiliate revenue are future work until those features are wired into the public demo.
