# Clownium Store — Static SellAuth site (Vercel)

Pre-renders every public page of the SellAuth shop **Clownium** (shop `261900`, theme `270335`)
into plain HTML using the real theme templates, then deploys it to Vercel.

Checkout stays on SellAuth: **Buy Now / Checkout** builds a SellAuth checkout-link
(`https://clownium.mysellauth.com/checkout-link?...`) and redirects there, so payments,
customer login and delivery are all handled by SellAuth. The static site never calls the
SellAuth internal API.

## What gets built

- `/` (shop: hero + products + reviews)
- `/products` (category/page layout)
- `/product/aimbetter-external` (per product, variant picker + Buy Now)
- `/cart` (client-side cart resolved from a baked product catalog, checkout-link on submit)
- `/feedback`, `/status`, `/faq`, `/blog`
- `/terms-of-service`, `/privacy-policy`, `/refund-policy` (fallback legal text)
- `/assets/*` copied from the theme
- `404.html`

`/customer/*` is redirected to the SellAuth storefront (`clownium.mysellauth.com/customer/...`).

## Local build

```bash
npm install
node build.mjs          # writes ./dist
node dev-server.mjs     # http://localhost:8137 (serves dist + /api/altcha)
```

`dev-server.mjs` serves the built `dist/` AND a working `/api/altcha` endpoint (it reads
`config.local.json` for the API key, same as `build.mjs`), so you can test the whole
customer login locally: **Login → "I'm not a robot" box → enter a real email → Continue →
6-digit code**. The OTP request goes straight to SellAuth (CORS-enabled).

The build fetches live data from `api.sellauth.com` (products, variants, prices, stock),
so re-run it whenever you change products/prices in the SellAuth dashboard.

### API key

The build needs `SELLAUTH_API_KEY`. For local builds you can create `config.local.json`
(next to `package.json`, it's gitignored):

```json
{ "apiKey": "your-key", "shopId": "261900" }
```

Or set the environment variable instead.

## Deploy to Vercel (and keep products/prices/status fresh)

1. The repo root must contain **both** `theme-270335/` (the theme source, read at build time)
   and `vercel-theme/` (this project). Push the repo to GitHub (a `.gitignore` is in place —
   `AGENTS.md`, `config.local.json`, `dist/`, dumps and scratch files are excluded).
2. Import the repo in Vercel and set:
   - **Root Directory:** `vercel-theme`
   - **Build Command:** `node build.mjs` (already in `vercel.json`)
   - **Output Directory:** `dist` (already in `vercel.json`)
3. Add environment variables in Vercel:
   - `SELLAUTH_API_KEY` = your SellAuth API key
     - Used at **build time** (products/prices/stock/status are fetched and baked into the pages)
     - Used at **runtime** by the `/api/altcha` serverless function (customer OTP login)
   - `SELLAUTH_SHOP_ID` = `261900` (optional, default)
   - `DEPLOY_HOOK_URL` = your Vercel Deploy Hook URL (optional, enables auto-updates — see below)
4. Deploy. Add your custom domain under Domains.

### Auto-updating products, prices and status

The site is a static pre-render, so it only reflects the latest SellAuth data when it's
(re)built. To keep it current without manual redeploys:

1. In Vercel: **Settings → Git → Deploy Hooks** → create a hook (branch `main`, production),
   copy its URL.
2. Set it as the `DEPLOY_HOOK_URL` environment variable.
3. Re-deploy once after adding it. From then on the cron in `vercel.json`
   (`/api/revalidate`, currently every 6 hours) POSTs to that hook, which triggers a fresh
   build of `build.mjs` — fetching the latest shop, products, prices, stock and status.

On Vercel's **Hobby** plan crons run at most **daily**; every 6 hours requires **Pro**.
You can also trigger the same revalidation manually by visiting
`https://<your-site>/api/revalidate`.

### Customer login (OTP) on the static site

The login modal uses the same inline OTP flow as the SellAuth storefront, but the captcha
challenge comes from the `/api/altcha` serverless function (it pulls a fresh challenge from
SellAuth's builder and the browser solves the proof-of-work, then calls
`request-otp` directly). It requires `SELLAUTH_API_KEY` to be set — without it the function
returns 500 and login won't work. The `/customer/*` paths redirect to the SellAuth storefront,
which handles the actual dashboard.

## How it works

- `build.mjs` fetches shop/product/feedback/blog data, enriches it into the shape the theme
  templates expect, and renders each page with Nunjucks.
- `lib/env.mjs` implements the theme's custom tags and filters:
  - `{% render_component ... %}` and `{% render_snippet ..., key=value %}` (custom Nunjucks
    extensions)
  - `assetUrl`, `shopUrl`, `apiInternalUrl`, `staticAsset`, `themeColor`, `hex_to_rgb`,
    `json`, `renderString`, `t`, `jsEscape`, `formatDate`, `formatDateTime`, `imageUrl`,
    `markup`, `ytEmbedVideoId`, `ytEmbedLink`, and the `formatPrice(...)` function
- `overrides/` layers on top of the theme (loaded first):
  - `components/hero.njk`, `components/products.njk` — clean fragments replacing the theme's
    broken full-page components (old shop refs, dead images)
  - `components/cart-page.njk`, `snippets/product-form.njk` — checkout via SellAuth
    checkout-link instead of the internal API
  - `snippets/customer-login-modal.njk` — inline OTP login (email + clickable captcha box + 6-digit code), challenge via `/api/altcha`
  - `snippets/script-integrations.njk` — injects `shopUrlBase` + the baked product catalog
  - `components/footer.njk` — fixed links/socials
  - `templates/faq.njk` — FAQ content (the theme ships it empty)
- The theme's product/status/feedback/cart components are reused as-is; their duplicate
  `<style id="theme-styles">` + canvas prologue is stripped automatically during load.