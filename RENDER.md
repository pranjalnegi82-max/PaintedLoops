# Deploy PaintedLoops on Render

The Express server serves the built React frontend from `frontend/dist`, with the API at `/api`. Use **one Node Web Service** for the repository. The API, shop, images, login and checkout share the same origin.

## Update your existing service (recommended)

Use the existing `paintedloops-backend` service connected to this repository. Keep its database, JWT and notification environment values.

| Setting | Value |
| --- | --- |
| Repository | `pranjalnegi82-max/PaintedLoops-backend` |
| Branch | `main` |
| Root directory | Leave empty |
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `VITE_API_URL` | `/api` |

Save these settings and deploy the latest commit. The existing service URL will show the shop at `/`, API information at `/api`, and health JSON at `/healthz`. If your old health check uses `/`, change it to `/healthz`. Refreshing `/shop`, `/account` or `/orders` will load React correctly.

The new build command is essential: an existing service configured with only `npm install` will not build the frontend. A GitHub commit alone does not change settings for a manually configured service.

## New service through a Blueprint

The root `render.yaml` defines a free Node Web Service. Choose New → Blueprint and connect this repository. The service name matches the existing backend, so review Render's proposed changes carefully; prefer updating the existing service above rather than making a duplicate. The Blueprint's free plan is a starting configuration—retain your current plan when editing an existing service manually.

Provide `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and `JWT_SECRET` when prompted. Use the public/external hostname and port of your existing MySQL provider, not `localhost` or a private hostname only reachable inside a different provider. `DB_PORT` is usually 3306 but use the value from your provider. This Blueprint does not create or migrate a database. It does not run the seed SQL against an existing database.

Preserve the current JWT secret on an existing service to avoid invalidating sessions. Configure email and Twilio variables separately if notifications are required. The root `.env.example` lists their names. Never commit real credentials or put them in frontend/VITE variables.

## Verify after deployment

- `/healthz` returns success, and the Render logs show a successful MySQL connection.
- `/` loads the shop; `/api/products` returns product data.
- Directly opening `/shop` and refreshing a product URL works.
- Verify an existing account and its addresses. Test order creation only with an explicitly chosen test order.
- Check product prices against the actual database and shipping against the ₹50 server rule.
- If using the previous separately hosted frontend too, its existing CORS origins remain allowed. Extra origins can be supplied through comma-separated `FRONTEND_URLS`.

## Scope and remaining work

This commit prepares hosting and publishes the repaired frontend source. It does not configure your Render account, access the production database or verify a live deployment. Existing Render auto-deploy settings may trigger a deployment when `main` changes.

Online payment is disabled in the storefront pending the backend ownership/amount verification fixes identified in `frontend/README.md`. Backend stock locking, transaction handling, review schema and cancellation/refund issues also remain; the frontend's guards do not replace server enforcement. Rotate the seeded admin password if it is in use. Do not describe the store as production-secure until those server fixes are completed.

The repository excludes generated dependency folders, built assets, screenshots and the unrelated PDF from the uploaded frontend ZIP. Render recreates dependencies and the build. The original backend product image blobs are reused under `frontend/public/products`.

## Checks

```sh
npm ci
npm run build
npm run test:hosting
npm --prefix frontend run lint
```

For the controlled browser smoke test, run `npm --prefix frontend run dev` and then `npm --prefix frontend run test:smoke` in another terminal after installing Chromium with `npx --prefix frontend playwright install chromium`. These fixtures do not create real orders.

Render references: https://render.com/docs/deploy-node-express-app and https://render.com/docs/blueprint-spec
