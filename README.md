# jpsmoreira.com

Personal professional website of João Moreira — [jpsmoreira.com](https://jpsmoreira.com).

Static HTML/CSS served by [Cloudflare Workers](https://developers.cloudflare.com/workers/) static assets.

## Structure

- `public/` — the site (HTML, CSS, images)
- `wrangler.jsonc` — Cloudflare Workers configuration (custom domains, assets)

## Development

```bash
npm install
npm run dev      # local preview at http://localhost:8787
```

## Deployment

Pushing to `main` deploys automatically via [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

Manual deploy: `npm run deploy`
