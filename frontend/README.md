# PaintedLoops frontend — repaired edition

A complete React storefront for the existing PaintedLoops Express/MySQL API. This folder is part of the full-stack repository; see [../RENDER.md](../RENDER.md) for the recommended single-service Render setup. Product photos are bundled locally. Build output and dependencies are generated during deployment.

## Run locally

Use Node.js 22.12+ (Node 24 was used for validation).

```sh
npm ci
cp .env.example .env
npm run dev
```

Open **http://localhost:3000**. This matches the localhost origin already allowed by the supplied backend. On Windows, copy `.env.example` to `.env` through Explorer or use `copy .env.example .env`.

`VITE_API_URL` accepts either the server origin or an origin ending in `/api`. Requests append `/api` exactly once. The development default is `https://paintedloops-backend.onrender.com`; production defaults to same-origin `/api`. Environment changes require restarting development or rebuilding production.

```sh
npm run lint
npm run build
npm run preview
```

## What was repaired

- Replaced missing Home, Shop, ProductDetail and Cart modules and added login, registration, account, addresses, checkout and order screens.
- Replaced inactive Tailwind utility markup and starter styles with responsive, accessible CSS. Navigation, mobile menu, empty/error/loading states, focus indicators and unknown routes now work.
- Prices are loaded from the API and formatted as INR. No invented prices, fallback ratings or percentage discounts. A crossed-out old price is shown only if greater than the current price.
- Current backend shipping is **₹50 per order**. `src/lib/catalog.js` defines the matching display rule. Update both sides together if this business rule changes.
- Cart quantity counts sum units, reject stock overflow, and persist across reloads. Old incompatible carts are reset by a versioned migration.
- Cart and checkout refresh product prices and availability. A price change requires another explicit confirmation before submitting an order.
- COD order creation and confirmation are separate. A known created order is reused when confirmation is retried. An ambiguous creation result blocks automatic resubmission and directs the customer to check their orders.
- API failures no longer indiscriminately redirect failed logins. Expired sessions return customers to login and preserve the return destination.
- Bundled 28 original backend photos. Mapped verified images by product slug, including the swapped beret/bookmark filenames and 12 painted keychains. Known local photos take precedence over API image URLs. Products without a matching local photo use API URLs and then an explicit photo placeholder.
- Product details can fall back to catalog data when the older backend's review query fails. Reviews are explicitly marked unavailable in that case.
- Added SPA rewrites, page titles, favicon, meta description and a Render static-site configuration.

To replace a known product's image, replace its local file or update the slug mapping in `src/lib/catalog.js`. Unknown products use their API image URLs. No new product photos, ratings or prices were fabricated.

## Checkout scope and remaining backend issues

**Online payment is intentionally unavailable in this frontend.** The backend code reviewed in this session verifies a Razorpay signature without securely binding it to the order owner, stored Razorpay order and expected amount. A browser change cannot fix that trust boundary.

Before treating this as a production-ready store, repair the server:

1. Bind each Razorpay order to the authenticated user and shop order; derive amounts on the server, validate ownership and amount during verification, and make callbacks/webhooks idempotent.
2. Validate positive integer quantities, merge duplicate product IDs, check address ownership, lock stock rows, and use atomic stock updates. Validate state transitions and roll back before all early transaction exits.
3. Lock cancellation so stock is restored only once. Implement refunds separately; the current cancellation email promises a refund that the code does not issue.
4. Align the reviews schema with `photo_url` and `is_approved`, or change the queries to the actual schema.
5. Remove the duplicate `res.json` in `getAllOrders` and fix owner email item field names. Handle database acquisition/rejection errors in Express async handlers.
6. Rotate the publicly documented seeded admin password if it was used. Add server-side input validation and authentication rate limits.
7. Configure the backend CORS allowlist for the exact frontend deployment origin. A new Render frontend URL will not work until it is allowed.

No backend repository commits, database writes, production payments, emails, WhatsApp messages or deployment changes were made by this repair. Browser tests use controlled mock responses; they do not prove the live backend is healthy. The API remains the source of business data. No hardcoded demo catalog is shipped in the application.

## Deploy

The recommended setup is the repository-root Node service described in [../RENDER.md](../RENDER.md). The following are optional separate-frontend alternatives.

**Render Static Site:** build command `npm ci && npm run build`; publish directory `dist`; set `VITE_API_URL` if needed. Add a rewrite from `/*` to `/index.html`. Add your Render URL to backend CORS before testing authenticated requests.

**Netlify:** build command `npm run build`; publish directory `dist`. The included `public/_redirects` is copied into the build. For a separate static host, build with `VITE_API_URL` set to the backend origin and deploy the resulting `dist/`.

Do not put backend secrets, Razorpay secrets or database passwords in Vite variables. They are public client build values.

## Verification

Passed production compilation and ESLint. All 28 image files decode successfully. Browser tests checked desktop 1440px and mobile 390px views, image fallback, quantity limits, cart unit count, price-change confirmation, login return, COD confirmation retry without duplicate creation, cancellation, search, category filtering, API retry, route loading and horizontal overflow. No browser page errors occurred in those tests.

To repeat controlled browser checks:

```sh
npx playwright install chromium
npm run dev
# In a second terminal:
npm run test:smoke
```

The smoke test defaults to localhost:3000. Set `TEST_BASE_URL` if using a different port. Its fixtures intercept `/api/` requests and never contact the real backend. Diagnostic screenshots go into ignored `test-output/` and are not included in the repaired ZIP.
