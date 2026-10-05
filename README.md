# SylarPay

**Get paid globally. Pay locally. Just use @username.**

SylarPay is a noncustodial consumer payment layer on Stellar. A Soroban contract turns an account into a human-readable payment identity. Share a link or QR, receive USDC directly in your wallet, verify settlement on Stellar, and request cash-out through a compatible anchor.

The blockchain handles settlement. SylarPay handles the experience.

## Implemented architecture

- Next.js App Router, TypeScript, Tailwind, responsive consumer UI.
- Freighter wallet adapter: connection, network checking, wallet transaction signing. No user signing keys on the server.
- Rust/Soroban UsernameRegistry: registration, lookup, uniqueness, canonical usernames, current-owner authorization, two-step transfer, address-based app verification.
- Wallet-signed one-use authentication challenges; HTTP-only sessions.
- Server-side Stellar SDK: centralized network/asset configuration, payment preparation and submission, ledger-envelope verification, Horizon balances.
- Zustand for wallet state; TanStack React Query for server-state caching and polling; Axios for API requests with bounded timeouts.
- MongoDB/Mongoose: public profiles, idempotent payment records, account-private notes, sessions and withdrawal tracking. Unique indexes protect payment and withdrawal retries; expired authentication records have TTL indexes.
- SEP-24 adapter: stellar.toml discovery, SEP-10 challenge validation/authentication, withdrawal initiation, interactive handoff, status polling. NGN depends on the configured provider. Rates and fees are supplied by the anchor.
- Explicit development-only Demo Off-Ramp. No fabricated transaction hash, balance, exchange rate, or bank payout.

See [architecture](docs/ARCHITECTURE.md), [demo](docs/DEMO.md), [security review](docs/SECURITY.md), and [readiness](docs/READINESS.md).

## Why Stellar

Stellar provides publicly verifiable asset settlement, standard USDC transfers, and anchor protocols for connecting on-chain assets to off-chain payout services. Soroban provides authenticated username ownership. The username contract does not process payments, and Stellar itself does not convert USDC to NGN.

## Local setup

Requirements: Node.js 22.12+ (tested with Node 26), npm, Rust with `wasm32v1-none`, a running MongoDB instance (local or Atlas), and a Freighter wallet extension for interactive signing.

```bash
npm ci
cp .env.example .env.local
rustup target add wasm32v1-none
npm run contract:test
npm run contract:build
npm run contract:deploy
npm run dev
```

Open `http://localhost:3000`. Deployment funds a generated disposable Testnet verifier via Friendbot, uploads real Wasm, and atomically initializes the registry with its verifier address. It writes the public contract ID and the **server-only** verifier secret to ignored `.env.local`, mode 0600. It never prints that secret. The Stellar CLI is optional; deployment uses the official Stellar SDK. A fresh clone should deploy its own registry to retain control of verification.

The app uses Webpack because Turbopack worker-port creation was blocked in the execution environment.

## Configuration

| Variable                                                     | Purpose                                                                                                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STELLAR_NETWORK`                                            | `testnet` (default) or `mainnet`                                                                                                                     |
| `STELLAR_HORIZON_URL`                                        | Network-specific Horizon endpoint; network passphrase checked at runtime                                                                             |
| `STELLAR_RPC_URL`                                            | Soroban RPC endpoint; network passphrase checked at runtime                                                                                          |
| `USDC_ASSET_CODE`, `USDC_ISSUER`                             | Exact code + issuer; Circle defaults verified from its published Stellar addresses                                                                   |
| `USERNAME_REGISTRY_CONTRACT_ID`, `USERNAME_REGISTRY_NETWORK` | Deployed registry and its network; a mismatch is rejected                                                                                            |
| `VERIFIER_SECRET`                                            | Server-only key for the contract’s immutable verifier; only sets verification state                                                                  |
| `MONGODB_URI`                                                | Server-only MongoDB connection URI; defaults to `mongodb://127.0.0.1:27017/sylarpay`                                                                 |
| `NEXT_PUBLIC_APP_URL`                                        | Canonical link origin; use HTTPS on hosted deployments                                                                                               |
| `NEXT_PUBLIC_DEMO_MODE`                                      | `false` by default; `true` only permits off-ramp simulation in Testnet development                                                                   |
| `ANCHOR_SIMULATED_FIAT`                                      | Marks a Testnet reference provider’s fiat side as simulated; never enables DemoOffRamp                                                               |
| `ANCHOR_HOME_DOMAIN`                                         | Trusted configured anchor’s domain, without scheme                                                                                                   |
| `ANCHOR_TRANSFER_SERVER`                                     | Optional HTTPS SEP-24 endpoint override; otherwise discovered from TOML                                                                              |
| `ANCHOR_PROTOCOL`, `ANCHOR_NETWORK`                          | `SEP24` and matching Stellar network                                                                                                                 |
| `ANCHOR_ASSET_CODE`, `ANCHOR_ASSET_ISSUER`                   | Must match configured USDC                                                                                                                           |
| `ANCHOR_SUPPORTED_FIAT`                                      | Configured fiat codes, comma-separated, always intersected with SEP-38 where available. Simulation does not enable unsupported codes. |
| `ANCHOR_NAME`                                                | Display name of the configured provider                                                                                                              |

Never expose `VERIFIER_SECRET` via `NEXT_PUBLIC_*`, commit `.env.local`, or commit `.data/`. User wallet keys remain in Freighter. Mainnet needs a separately deployed contract, correct issuer, verifier, anchor, and an operational/security review. The deployment and live-test utilities deliberately refuse Mainnet.

## Database setup

Start your local MongoDB service before running the app or tests. Set `MONGODB_URI` in `.env.local` to your local database or MongoDB Atlas connection string. Keep it server-only; never use a `NEXT_PUBLIC_` variable for database credentials. Mongoose establishes its connection and required unique indexes before database operations; an unavailable database produces a readable error instead of indefinite loading.

The existing local SQLite metadata was imported into MongoDB without deleting the original file: one profile and two payment records. Local migration utility: `npx tsx scripts/migrate-mongo.ts` (Node 22.13+ for its read-only legacy SQLite reader). It imports metadata with idempotent upserts, retains the source file, and does not migrate authentication sessions; reconnect Freighter after migration. This utility is excluded from Git with the other scripts.

Database tests use a separate randomly named database and remove only that database after each test file. Optionally set `MONGODB_TEST_URI` to a dedicated test MongoDB server; tests do not use the application database.

## Wallet and test funds

1. Install Freighter and select **Stellar Testnet**.
2. Fund your public account with [Friendbot](https://friendbot.stellar.org). Friendbot supplies test XLM for account reserves and fees, not USDC.
3. Connect in SylarPay. Approve the one-time sign-in challenge; it has sequence zero and cannot be submitted as a money-moving transaction.
   If connection stalls, unlock Freighter and check its pending request. Wallet access times out after 60 seconds and signing after 90 seconds; the Connect button becomes usable again with a clear error. Configuration and authentication requests also have finite timeouts. Confirm Testnet before retrying.

4. Claim an available name and complete your public display name/bio. Existing owners can choose **I already own this username** to save their profile.
5. In Overview, choose **Enable USDC receiving** and approve the configured USDC trustline.
6. Obtain Circle Testnet USDC from [Circle’s faucet](https://faucet.circle.com), or use the live-test utility’s capped swap against existing Testnet liquidity. Faucet availability and limits are external dependencies.

Sylar Verified means ownership and required public profile setup were checked by SylarPay. It is not government identity verification or anchor KYC. Verification is account-based and does not transfer with a username.

## Contract lifecycle

```bash
npm run contract:test
npm run contract:build
npm run contract:deploy
npm run contract:initialize # validate atomic constructor initialization
npm run demo:seed           # register / verify @sam without sending a payment
```

Deployment includes initialization through `__constructor`, avoiding an uninitialized contract that a third party could take over. Deployment is configuration-driven and requires no frontend source edit. Use `npm run test:live` to register the local demo identity and exercise the actual integration.

Usernames are stored without `@`: 3–24 lowercase ASCII letters, digits, or underscore. Frontend input normalizes case; the contract rejects noncanonical input. Transfers require a current-owner proposal and a new-owner acceptance. Losing wallet access cannot be repaired by SylarPay. On-chain entries use extended TTL; Testnet resets still remove them.

## Recipient lookup

Typing a valid username starts a debounced lookup after 350 ms. Matching accounts appear beneath the field with their public display name, verification state and abbreviated destination; click or keyboard-select a match. Invalid names, no matches and unavailable registry responses have field-level feedback and retry support.

Search returns at most eight suggestions: the exact on-chain username plus matching indexed public-profile usernames. It is not an exhaustive search of all contract registrations. Each suggestion is resolved against Soroban and uses the current owner’s public profile, so stale database ownership is never used as a payment destination. Continue performs a fresh exact resolution, and preparation/submission resolve again.

## Payments and privacy

Review the recipient, full destination, verification status, amount, asset, and network before signing. The destination is resolved again during final preparation and submission. If ownership changes, signing/submission is stopped and review is required.

The client preserves the signed transaction’s actual network-bound hash before submission and restores an unresolved attempt after a reload, scoped to account and network. A lost response leads to checking the same hash rather than signing another payment. A submitted hash is **pending**, never proof of success. The backend checks Horizon’s network, success, the signed envelope’s network-bound hash, source, current registry destination, exactly one standard payment operation, USDC code+issuer, and exact 7-decimal integer amount. Retries return/update the same indexed record; replaying an already settled signed transaction requires matching ledger evidence. If a previously indexed transaction disappears from Horizon, verification reports unavailable instead of returning a cached confirmation. Explorer URLs use the actual hash and network.

History contains payments verified by SylarPay; it is not an exhaustive index of every external wallet transfer. Balances come directly from Horizon. Notes belong to the authenticated account and stay in MongoDB, not Stellar memos. Stellar transactions remain public.

## Multi-send

Open **Send → Multiple recipients**. Add 2–10 distinct usernames and an amount for each, then review every destination, verification badge, amount, total and network. **Confirm multi-send** requests one Freighter approval for one Stellar transaction containing all the USDC payment operations. Stellar applies the operations atomically: all succeed or none transfer funds. Network fees apply per operation.

The server resolves every username again at preparation, submission and verification, checks the configured USDC issuer, available balance and recipient trustlines, and verifies every operation against the actual ledger envelope. Confirmation requires successful ledger evidence. A pending attempt retains its actual hash across reloads for the same account/network; check confirmation before starting another payment. History shows each recipient's payment under the same transaction hash. Private notes on a multi-send belong to the account and apply to the whole transaction.

Automated tests cover signed-envelope verification and the review UI. A live multi-send with real Freighter approval still needs the manual rehearsal in `docs/DEMO.md`; no new live batch payment is claimed by this implementation.

## Anchor setup

The default environment example configures SDF's public **Testnet reference anchor**, `testanchor.stellar.org`. Keep `ANCHOR_TRANSFER_SERVER` empty for stellar.toml discovery, `ANCHOR_SUPPORTED_FIAT=USD`, `ANCHOR_NAME=SDF Test Anchor`, `ANCHOR_SIMULATED_FIAT=true`, and `NEXT_PUBLIC_DEMO_MODE=false`. Its Circle Testnet USDC issuer must match `USDC_ISSUER`. The current withdrawal range is **1–10 USDC**; use **2 USDC** for rehearsal, never the 150 USDC payment-demo amount. SEP-38 advertises USD and CAD; NGN is not supported by this reference anchor.

This is the real SEP-10/SEP-24 adapter, not DemoOffRamp: funding is an actual user-approved Stellar Testnet transaction, while **fiat conversion and payout are simulated**. The UI labels the distinction throughout, including provider-reported completion. Live discovery and a server-signed SEP-10 challenge were verified; authentication and later stages still require manual Freighter/hosted interaction. See [anchor evidence](docs/SDF-ANCHOR-AUDIT.json) and the [rehearsal](docs/DEMO.md). No withdrawal was sent during this audit.

For a production anchor, replace the reference configuration, set `ANCHOR_SIMULATED_FIAT=false`, and verify its supported local fiat and actual payout rails. Mainnet refuses a configuration marked simulated fiat.

No live NGN payout rail has been chosen or configured. The Testnet reference flow can start a USD withdrawal with simulated fiat settlement through the same SEP-10/SEP-24 adapter. For a production provider, obtain its supported network, USDC asset, SEP-24 and SEP-10 endpoints, signing key via stellar.toml, supported fiat/payout rails, and any partner enablement it requires. Populate `ANCHOR_*` and set `ANCHOR_SIMULATED_FIAT=false`. The app validates the network/asset configuration, supported withdrawals, and signed SEP-10 challenge. It opens the provider’s own interactive verification flow and polls its transaction status. When the provider requests an on-chain transfer, SylarPay displays the destination, amount, network, issuer, and required memo for explicit review, asks the wallet to sign, and submits that exact transaction once. Provider status still determines payout completion.

If SEP-38 discovery is available, only fiat currencies in both that response and operator configuration are shown, including in simulated-fiat mode. Simulation does not add unsupported currencies. The SDF reference demo is configured for USD; NGN is unavailable. Without SEP-38, configured fiat support must be confirmed with the provider. Rates/fees are disclosed in the hosted flow and transaction details when provided. SylarPay promises neither liquidity nor a specific payout rail.

For an offline hackathon cash-out segment, clear `ANCHOR_HOME_DOMAIN`, set `NEXT_PUBLIC_DEMO_MODE=true` and run `npm run dev`. **Demo Off-Ramp** is visible throughout; it reaches simulated processing, never a fake bank payout. Production (`npm start`) and Mainnet reject demo mode. Set demo mode back to false before `npm run build` / `npm start`.

Developer utilities under `scripts/` are intentionally excluded from the committed snapshot. Deployment, seeding, live-test, and read-only audit commands above/below require those local utilities; they are not included in a clone of this snapshot.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run contract:test
npm run contract:build
npm run build
```

Browser checks (with the app running; use a stable production server for release verification):

```bash
npx playwright install chromium
npm run test:e2e
# Or target a production instance on another local port:
# PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e
```

Real network integration (with the development app running and the registry deployed):

```bash
npm run test:live
```

This test creates reusable disposable Testnet keys in ignored `.data/test-wallets.json`, authenticates through the actual APIs, claims `@sam` (or `DEMO_USERNAME`), saves/verifies the profile, sets trustlines, acquires Testnet USDC with a maximum of 500 free test XLM if needed, signs/submits a 150 USDC payment, verifies settlement, checks duplicate indexing and the recipient’s exact balance change. Public evidence is written to `docs/LIVE-TEST.json`. A retry can send another **real Testnet** payment; this is not a replay-only test.

For a read-only recheck of the existing Testnet deployment/payment, without sending another transaction:

```bash
npx tsx scripts/audit-testnet.ts
```

This requires the local deployed configuration and existing `LIVE-TEST.json`; it checks current registry resolution/verification, deployment success, exact payment evidence, duplicate indexing and ledger balance, and writes `docs/AUDIT-TESTNET.json`. Follow the explicit ten-step manual Freighter rehearsal in [DEMO.md](docs/DEMO.md) before presenting. Browser layout fixtures do not establish extension approval or phone wallet compatibility.

Primary integration references: [Stellar SDK](https://stellar.github.io/js-stellar-sdk/), [Circle Stellar addresses](https://www.circle.com/multi-chain-usdc/stellar), [Soroban SDK](https://github.com/stellar/rs-soroban-sdk), [SEP-24](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md), [SEP-10](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md).

Hosted deployment settings for Vercel and Render, including the required Node runtime and environment variables, are in [docs/DEPLOY.md](docs/DEPLOY.md).
