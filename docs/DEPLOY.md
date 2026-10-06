# Hosted Testnet deployment

Deploy the full Next.js app (pages and API together) on either Vercel or Render. MongoDB must be hosted separately, for example on Atlas. A localhost database URL cannot work on either platform. Allow the hosting service's outbound connections in the database network policy and use a dedicated authenticated database user.

The installed Stellar SDK requires Node >=22.12.0. This project pins the Node 22 major through package engines; select Node 22.x on Vercel. Set Render's NODE_VERSION to 22 to select the latest Node 22 release.

## Vercel

Import `samscript18/sylarpay`, branch `main`, repository root. Choose Next.js, Node 22.x, install `npm ci --include=dev`, build `npm run build`, and leave the output directory at its framework default. Set these commands in the dashboard. API execution limits follow your hosting plan. No separate API host, CORS configuration or frontend API URL is required.

Copy the public settings below into the Production environment. Enter secrets through the dashboard, not the repository. Set NEXT_PUBLIC_APP_URL to the final HTTPS deployment/custom-domain origin and redeploy after changing it. Set NEXT_PUBLIC_DEMO_MODE=false before the build as well as at runtime: Next.js inlines public environment variables into the build, so changing only the start command is insufficient. For Preview, use a separate database and the matching preview origin; avoid sharing a presentation account's private records across environments.

## Render

Create a **Web Service** (not a Static Site):

| Setting | Value |
| --- | --- |
| Branch | main |
| Runtime | Node |
| Node version | Latest 22.x, >=22.12.0 |
| Root directory | Repository root |
| Build | `npm ci --include=dev && npm run build` |
| Start | `npm run start -- --hostname 0.0.0.0 --port $PORT` |
| Health check | `/api/config` |

Add MONGODB_URI, VERIFIER_SECRET, USERNAME_REGISTRY_CONTRACT_ID and NEXT_PUBLIC_APP_URL in the service Environment settings. Leave VERIFIER_SECRET empty if app-issued verification is intentionally unavailable. Select a service plan in Render; no paid deployment was initiated by this configuration task. The health endpoint validates app configuration; separately verify database-backed wallet activity after deployment.

## Environment settings for both hosts

```dotenv
NODE_ENV=production
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
USDC_ASSET_CODE=USDC
USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
USERNAME_REGISTRY_CONTRACT_ID=CCMWUH5LKJNXW4SGGDAKBVSTECBYQZK4G64ENCVBOULWPQGJRIZFAMFH
USERNAME_REGISTRY_NETWORK=testnet
NEXT_PUBLIC_APP_URL=https://YOUR-DEPLOYMENT-DOMAIN
NEXT_PUBLIC_DEMO_MODE=false
MONGODB_URI=YOUR-HOSTED-MONGODB-CONNECTION-STRING
VERIFIER_SECRET=YOUR-SERVER-ONLY-TESTNET-VERIFIER-SECRET
ANCHOR_HOME_DOMAIN=testanchor.stellar.org
ANCHOR_TRANSFER_SERVER=
ANCHOR_PROTOCOL=SEP24
ANCHOR_NETWORK=testnet
ANCHOR_ASSET_CODE=USDC
ANCHOR_ASSET_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
ANCHOR_SUPPORTED_FIAT=USD
ANCHOR_NAME=SDF Test Anchor
ANCHOR_SIMULATED_FIAT=true
```

Replace the URL/database/secret placeholders. The registry ID is the public deployment recorded in `docs/DEPLOYMENT.json`; a Testnet reset may require a new deployment. The verifier must match that registry's authorized verifier account. Never prefix MONGODB_URI or VERIFIER_SECRET with NEXT_PUBLIC_. Do not commit `.env.local` or copy its contents into public configuration.

NODE_ENV=production describes the hosted Node process, not Stellar Mainnet. Keep Stellar on Testnet. The SDF reference anchor uses a real Testnet USDC leg and **simulated USD fiat payout**; NGN is unavailable. Use 1–10 USDC, such as 2 USDC. NEXT_PUBLIC_DEMO_MODE must stay false in hosted production; this is separate from ANCHOR_SIMULATED_FIAT.

## Build and release checks

Production typechecking excludes local `/tests` and `/scripts`, which were excluded from publishing at the user's request. The remaining previously tracked tests still exist in history; do not use their old counts as proof of a hosted build. Current regression additions are local. Tests continue to run through Vitest locally; the deployment build does not run contract/deployment scripts or require Rust/Wasm compilation.

After setting environment variables, deploy and check `/api/config`, `/@sam`, wallet sign-in, dashboard activity and payment receipt links. Confirm Freighter Testnet and the intended account manually. Verify SEP-10/hosted-anchor access with user approval before demonstrating cash-out. Both hosts use the same API paths, cookie authentication and application origin. The optional hosting config files are not present locally; use the dashboard settings above. No remote deployment has been performed.

References: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Render Next.js](https://render.com/docs/deploy-nextjs-app), [Render Node versions](https://render.com/docs/node-version), [Render Blueprint specification](https://render.com/docs/blueprint-spec).
