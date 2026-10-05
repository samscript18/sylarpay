# Definition of Done review

Checked against AGENTS.md section 94. This repository now contains the Testnet MVP, a deployed registry, and actual signed payment evidence. It is not a claim of production readiness or a live fiat payout integration.

## SDF Test Anchor integration audit — 2026-10-04

The existing SEP-24 abstraction is configured for `testanchor.stellar.org` in ignored local environment configuration and the public environment example. `ANCHOR_TRANSFER_SERVER` remains empty, so discovery uses the published endpoint. Live checks through **SylarPay's Sep24Provider** confirmed the Stellar Testnet passphrase, SEP-10/24/38 endpoints, Circle Testnet USDC issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, enabled USDC withdrawals, and the **1–10 USDC** range. SEP-38 advertises USD and CAD. The reference demo is configured for **USD**. NGN is not advertised and remains unavailable, including with `ANCHOR_SIMULATED_FIAT=true`.

The actual anchor's server-signed SEP-10 challenge was validated by the Stellar SDK for a disposable challenge-only public account, without `client_domain`. **This is challenge validation, not completed user authentication.** No wallet signing was automated. At the initial audit, the exact furthest live-verified state was **awaiting the user's Freighter signature of the SEP-10 challenge**. No JWT, interactive withdrawal session, funding instructions, funding transaction, or payout completion was obtained. Public evidence is in [SDF-ANCHOR-AUDIT.json](SDF-ANCHOR-AUDIT.json); it contains no secrets or authorization URLs.

### Live integration status

- [x] Anchor discovery and asset/fiat/limit verification.
- [x] Real server-signed SEP-10 challenge validation.
- [x] SEP-10 user authentication — subsequently user-initiated; existing session lookup succeeded on 2026-10-04. Provider access has since expired and requires another manual approval.
- [x] SEP-24 interactive initiation — subsequently user-initiated, with an existing anchor session observed.
- [ ] Hosted interactive session completed — the expired hosted URL currently blocks the user; provider recovery and manual interaction remain required.
- [ ] `pending_user_transfer_start` observed from the live provider.
- [ ] Real Testnet USDC funding transaction.
- [ ] Withdrawal funding transaction verified on the Stellar ledger.
- [ ] Live anchor status reconciliation.
- [ ] Provider-reported simulated USD payout completion.

The hosted reference origin expected for rehearsal is `https://anchor-ref-ui-testanchor.stellar.org`; an actual interactive URL was not obtained during this audit. The existing 150 USDC payment in LIVE-TEST.json is **not withdrawal evidence** and exceeds this anchor's limit. Use **2 USDC** for the manual rehearsal in DEMO.md.

### Integration reliability changes

- Published TOML/SEP-38 asset metadata is checked against the configured Circle issuer. All SEP-24 providers intersect configured fiat with SEP-38, including when fiat payout is simulated. The selected fiat is sent as SEP-24 `destination_asset`.
- Provider min/max limits are exposed in the UI and enforced before wallet authentication and before external initiation. Amount comparisons use exact decimal units.
- The real adapter remains separate from DemoOffRamp. `ANCHOR_SIMULATED_FIAT=true` labels this Testnet provider's fiat side and refuses Mainnet; it does not fake API responses or transfer confirmation. The label persists with the withdrawal and survives discovery failure/reload.
- Funding confirmation now requires the actual successful Stellar envelope and its network-bound hash to match the reviewed transaction body, including sender, destination, code/issuer, amount and memo. Failed ledger evidence is distinguished from pending evidence.
- Funding hashes persist on the server and in account/network/withdrawal-scoped browser storage before submission. Reload offers a read-only confirmation check instead of another signature.
- Lost real-provider initiation responses retain an unconfirmed `CREATED` reservation. Replaying the same idempotency key does not create another external session. Missing anchor IDs require provider reconciliation; no completion or session is invented.
- Polling remains controlled, does not overlap, and stops at terminal states or the existing attempt cap. Unreconciled reservations with no anchor ID are not polled. Reconciliation rejects a provider payout asset different from the selected currency when reported.

**Real when manually exercised:** SEP-10 authentication, SEP-24 session, provider status, and the wallet-approved Stellar Testnet USDC transfer. **Simulated:** fiat conversion and fiat/bank payout for USD. This audit only verified live discovery and the server challenge; later state-machine/funding behavior is covered by controlled tests, not claimed as live evidence. No real bank payout is claimed. Production requires a compatible real anchor and validated local payout rail.

Final validation results are recorded in Engineering below. Source/browser secret scans found no private-key literals or server-secret exposure; `.env.local` remains ignored and mode 0600. No credentials or local wallet data were staged or committed.

## Cash-out action clarity — 2026-10-05

The withdrawal screen now presents one Next step card instead of simultaneous verification, reconnect, provider details and status buttons. An active hosted session shows **Continue verification**; expired access shows **Reconnect to partner**; an expired hosted link shows **Open partner details** when the provider supplies a link, otherwise **Check for updates**. Funding review remains an explicit wallet-approved action. Processing explains that updates are checked automatically, and closed withdrawals do not offer verification or reconnect.

Technical identifiers, partner detail links and manual status checks are under **Transaction details & updates**. User-facing status labels use plain language. Testnet/simulated payout notices and all existing verification/idempotency boundaries remain in place. UI action labels and test expectations were updated together; no financial assertions were removed.

Validation: 151 app tests across 17 files pass; production build and typecheck pass; lint passes with 21 existing warnings. The new desktop/mobile action-layout browser assertions were added but not run because launching the production preview was declined. Earlier browser results apply to the preceding build.

## Hosted-session recovery — 2026-10-05

The user's existing SDF session was inspected without printing tokens. Stored metadata demonstrates that user-approved SEP-10 authentication and SEP-24 initiation have occurred since the initial audit. A live lookup on 2026-10-04 returned `incomplete` (AWAITING_KYC), USD metadata, and no funding destination or amount. The expired root interactive URL had real `transaction_id` and `token` parameters. The hosted UI's failed-start redirect produced `session_token=undefined`; SkylarPay did not construct that status URL.

A read-only lookup on 2026-10-05 returned HTTP 403, so current provider status is unavailable until the user reauthenticates. No funding or completion was observed. The new **Reconnect to partner** action requires a Freighter signature and updates authentication for the existing account/network/withdrawal only. It never initiates another session or transfers USDC. Status polling stops when provider access expires; the stored status is explicitly labeled last known. Expired hosted links are hidden, and HTTPS provider `more_info_url` is exposed when returned. Offline DemoOffRamp links remain usable.

This fixes SkylarPay's expired-access handling; it does not regenerate the anchor's expired interactive token or repair its hosted JavaScript. Recovery remains pending manual approval and any provider-side resume/cancellation required. No successful hosted recovery, funding transaction or simulated payout completion is claimed. See DEMO.md's expired-link instructions. Validation: 147 app tests across 16 files pass, production build and TypeScript checks pass, and lint passes with 21 existing warnings. Browser and contract suites were not rerun for this focused recovery change; their earlier results apply to the prior build.

## Final audit — 2026-10-04

The existing implementation was inspected, rather than relying on the prior report. Baseline validation passed, and the complete suite was rerun after reliability fixes. The deployed registry still resolves verified `@sam` to the recipient recorded in LIVE-TEST.json. The existing 150 Circle Testnet USDC payment was verified again against its actual ledger envelope; the recipient’s balance at audit time was **300.0000000 USDC**. Repeated verification produced no duplicate record. No new payment was sent during this audit.

Reliability fixes:

- Wait for the configured canonical origin before exposing public sharing/QR controls, avoiding a transient relative payment URL.
- Preserve the actual signed payment hash before sending the submission request; reject wallet changes to the reviewed transaction body. Response loss retains a checkable attempt, and reload resumes verification without another signature.
- Scope pending payment and withdrawal restoration to account and network. Reject changed wallet accounts and wrong networks before signing; show restoration/network errors clearly.
- Do not return a cached confirmation when a previously verified transaction is no longer available from Horizon. Replayed submissions require matching successful ledger evidence.
- Display attempted hashes during pending confirmation and distinguish definite ledger failure from uncertain submission. Pending incoming history is not described as received.
- Prevent overlapping withdrawal polls and stop polling at terminal states. Preserve the signed anchor transfer hash on response loss; provider status still controls payout completion.

New regression coverage exercises response loss, transaction-body tampering, wallet/network changes, restored pending attempts, failed ledger verification, account isolation, replayed submission, and ownership changes immediately before submission. No tests were removed or weakened.

At the start of this audit, the source tree was untracked and no baseline commit existed for a historical diff. The MVP is now organized into feature, fix, and chore commits. Developer utilities under `scripts/` remain untracked and excluded from commits by request. Private local configuration and test wallets are ignored, mode 0600, and were not staged or committed. Source/docs and the final browser bundle contain no detected private-key literals or verifier-secret exposure. Runtime dependency audit reports zero vulnerabilities; five development-only lint dependency findings remain documented in SECURITY.md.

## Wallet reliability and stack update — 2026-10-04

The app now uses Zustand for wallet state, TanStack React Query for server-state caching and withdrawal polling, Axios for API requests, and MongoDB/Mongoose for persistence, as requested. The existing local profile and two indexed payments were imported without deleting the ignored legacy SQLite backup. Sessions were intentionally not imported; reconnect Freighter.

- Freighter availability, access, account/network checks and signing now have finite timeouts. Configuration and sign-in API requests also time out. Failed or unanswered requests release the disabled Connect button and display a retryable error, with progress messages for each connection stage.
- Private query caches are scoped to account/network. Withdrawal polling does not overlap and stops at terminal states. Fresh payment destination resolution and ledger verification remain in place.
- Mongoose awaits unique indexes before writes. Concurrent payment indexing cannot duplicate or downgrade a confirmed payment; concurrent withdrawal initiation reserves exactly one provider call. Private note isolation is tested against MongoDB.
- Actual Testnet wallet-signed API authentication passed against the MongoDB-backed app; a replayed challenge was rejected. Verified `@sam`, the actual 300 USDC ledger balance and two payment-history records loaded. No payment was sent during this update.
- All 70 app tests, seven contract tests, Wasm compilation, typecheck and production build passed. Ten browser checks passed against the production build at desktop/iPhone viewport sizes, including recovery when Freighter is unavailable. Actual extension approval remains manual.
- Lint passes with zero errors and 21 unused-import/variable warnings in concurrent landing/dashboard UI edits. Those UI changes were preserved.
- `MONGODB_URI` is configured locally and documented in `.env.example`. MongoDB must be running; tests use isolated temporary databases. Source and browser-bundle scans found no private-key literals or exposure of configured server secrets.

## Loading and typography update — 2026-10-04

Content-shaped skeletons replace initial profile, account, receive and cash-out loading placeholders. Availability checks and wallet/payment/withdrawal actions combine skeleton indicators with explicit progress messages; ledger confirmation requirements remain intact. Receive and Cash Out wait for their data before showing an empty or unavailable state. Skeletons expose accessible loading labels and respect reduced-motion preferences.

DM Sans is self-hosted through a packaged variable font. Everyday labels, usernames and amounts use consistent sans-serif typography; full technical addresses retain monospace. Desktop/mobile browser checks verify the font loads, skeletons fit the viewport, and the real profile replaces its placeholder. Validation: 72 app tests, 12 browser checks, lint (existing warnings), typecheck and production build pass.

## Recipient lookup update — 2026-10-04

Typing a valid recipient begins a 350 ms debounced lookup, with skeleton progress and field-level errors. Matching public accounts show username, display name, verification and abbreviated address; each result can be selected. Invalid input, no matches, registry failures and retry behavior are handled beneath the field. Late results from earlier input are hidden.

Discovery returns at most eight candidates from indexed public-profile username prefixes plus the exact requested on-chain name. Every result is resolved through Soroban and uses the current owner’s public profile; the database is not ownership authority. A fresh exact lookup still occurs for review, and existing preparation/submission destination checks remain intact. Unindexed names can be found by their exact username; prefix suggestions are not a complete registry index.

Validation: 80 app tests, 12 production browser checks, lint (existing warnings), typecheck and production build pass. Browser account/layout fixtures exercise multiple-match selection at desktop/mobile widths without signing or sending. The actual endpoint also resolved verified Testnet `@sam` to the expected public account. No new payment was sent.

## Receipt and recipient UI refinement — 2026-10-04

The confirmed receipt now has a centered amount, smaller confirmation icon, consistent spacing, clear primary/secondary actions and expandable transaction details. Full hash and actual network-aware explorer evidence remain available. Confirmation moves keyboard focus and scrolls the receipt clear of the fixed navigation.

Recipient loading uses a compact content-shaped skeleton row. Match rows place the verification mark beside the username, combine public name/address context on one secondary line, and retain accessible selection controls. General action progress uses quiet inline indicators instead of large outlined banners; explicit wallet/payment stage text remains visible.

Validation: all 80 app tests, the 12-check production browser suite, lint and typecheck passed. The final build passed after the receipt focus adjustment; two focused desktop/mobile checks additionally verified receipt centering, focus, navigation clearance, expandable hash details, compact loading height and recipient selection. Screenshots were inspected at both widths. No payment was signed or sent by this UI audit.

## Multi-send implementation — 2026-10-04

- Send supports 2–10 distinct recipients with independent amounts, selectable username lookup, an explicit all-recipient review and one wallet approval.
- Selecting a recipient replaces search results with a compact account card in single-send and multi-send. Change restores the search field while retaining the amount; badges remain tied to the resolved verification state.
- One atomic Stellar transaction contains every payment. Preparation checks aggregate spendable USDC and destination trustlines; preparation/submission/verification resolve all usernames freshly.
- Confirmation requires a successful ledger envelope matching every operation, sender, destination, issuer, amount, operation count and network-bound hash. Extra operations and wallet body changes are rejected.
- MongoDB persists batches idempotently; history shows individual payments while recipient visibility and private transaction notes remain account-scoped. Pending attempts restore by account/network without another signature.
- Regression tests cover signed-envelope verification, mismatch rejection, failed/pending evidence, duplicate indexing, history isolation, response loss and UI review. No live multi-send or Freighter approval was performed; see the manual rehearsal in DEMO.md.

## Product

Activity and identity polish: successful account-changing API responses invalidate the connected account/network's React Query data; active activity/balance views refetch automatically. Visible account data also refreshes every 20 seconds and on window focus for incoming indexed payments. Initial skeletons are separate from background refresh. The identity card now prioritizes the username, canonical payment link, copy/share/QR actions and receiving status, with the full address under details. The misleading Pay privately toggle is removed. Regression coverage verifies active refetch, account/network isolation, interceptor cleanup, sharing controls and toggle absence. Build, typecheck, lint and 125 app tests pass. Earlier development-server checks timed out near reload/confirmation and their retry was declined. The current production-build suite subsequently passed these account-flow checks at both widths.

Trustline status fix: `/api/me` reports the configured USDC code/issuer's actual Horizon trustline state separately from balance. Dashboard hides setup for an authorized trustline even at zero balance, distinguishes missing/unauthorized states, and announces readiness only after a successful account refresh. Delayed confirmation offers a read-only recheck rather than another signature. Eight regression cases cover ledger asset matching, authorization, refresh failure and dashboard transitions. The earlier preview launch was declined; the updated browser assertions have now passed in the current production-build suite at both widths.

- [x] Landing page — mobile/desktop production browser checks.
- [x] Wallet connection — Freighter adapter, network and signer validation, wallet-signed server authentication; disconnected UI tested. A real extension approval check remains manual.
- [x] Username claim — on-chain registration exercised by live Testnet integration; availability UI tested.
- [x] Username resolution — actual Soroban lookup and public profile API exercised.
- [x] Public profile — real @sam verified profile checked in both browser sizes.
- [x] Payment link — `/@username`, URL-encoded route normalization, optional amount without automatic sending.
- [x] QR — actual payment URL, accessible SVG, mobile browser check.
- [x] USDC payment — real 150 Circle Testnet USDC transaction; wallet-signing adapter and signed API integration.
- [x] Confirmation — actual ledger-envelope verification, pending behavior, rejected mismatches; UI success/failure tests.
- [x] Payment history — idempotent indexing and recipient history verified in live flow; private notes scoped to account.
- [x] Verification UI — address-based on-chain app-issued verification; clear non-KYC meaning.
- [x] Cash-out UI — real provider adapter and unavailable state, development-only labeled demo, hosted flow/status and provider-directed transfer boundary implemented.

## Stellar

- [x] Soroban contract exists — Rust source and built Wasm.
- [x] Contract tested — seven registration, validation, authorization, transfer and verification tests.
- [x] Contract deployed to Testnet — public record in DEPLOYMENT.json.
- [x] Contract ID configured — ignored local environment; centralized runtime configuration.
- [x] Registration on-chain — @sam ownership verified through the live flow.
- [x] Resolution on-chain — actual RPC simulation of registry functions.
- [x] Real Stellar USDC transfer — public evidence in LIVE-TEST.json.
- [x] Transaction verification — network, successful envelope, hash, sender, current recipient, operation, code, issuer, exact amount.
- [x] Explorer links — generated from actual network/hash; format tested.

## Off-ramp

- [x] Provider abstraction — OffRampProvider, Sep24Provider and DemoOffRamp.
- [x] SEP-24 implementation — discovery, SEP-10 signed auth, supported assets/currencies, interactive initiation, transaction statuses, reviewed funding transfer; protocol boundary tests pass.
- [x] Environment-driven provider — ANCHOR_* variables.
- [x] Withdrawal status tracking — persistent rows, controlled polling, terminal stop, manual refresh and session restoration.
- [x] NGN availability — explicit provider configuration intersected with SEP-38; simulation does not enable unsupported NGN.
- [x] No fake bank payout — demo remains simulated processing; real completion must come from provider.
- [ ] Live provider validation — no compatible NGN provider or partner credentials supplied; no real cash-out or bank payout claimed.

## Security

- [x] Secrets excluded — `.env.local` and `.data` ignored; source/docs and built browser JS scanned without secret literals.
- [x] No frontend signing keys — Freighter user signing; verifier secret server-only.
- [x] Input validation — Zod schemas and canonical contract validation.
- [x] Payment verification — ledger evidence required.
- [x] Duplicate transactions — unique network/hash and retry tests.
- [x] Withdrawal idempotency — account/network/key reservation before external initiation; exact signed funding hash reused.
- [x] Unauthorized username actions rejected — auth rejection contract tests.

## Engineering

- [x] 141 unit/integration/UI tests pass across 16 files.
- [x] Seven contract tests and Wasm build pass.
- [x] Existing real Testnet evidence reverified on 2026-10-04 without sending another payment; see AUDIT-TESTNET.json. Original signed integration evidence remains in LIVE-TEST.json.
- [x] Fourteen browser checks pass against the production build at desktop and iPhone 13 widths. Ten exercise live public/disconnected paths; four use explicit account/layout fixtures, including USD reference-anchor labels and limits. No wallet signing or hosted-anchor completion is automated.
- [x] Typecheck passes.
- [x] Lint passes with zero errors; unused-import/variable warnings remain in concurrent UI edits.
- [x] Production build passes (Webpack).
- [x] README, architecture, demo, security docs and environment exampylarist.

## External configuration and final rehearsal

1. Configure a trusted anchor's domain/SEP-24 server, network, asset/issuer, supported fiat and display name. Confirm the anchor actually supports NGN/payout rails and complete any partner enablement. Test SEP-10, interactive KYC, provider-directed USDC transfer and status reconciliation with that provider before presenting it as a live off-ramp.
2. Rehearse real Freighter approvals on the presentation machine. Automated browser checks do not install or approve a user's wallet extension. The backend/ledger flow was exercised with actual disposable Testnet signatures.
3. For the exact @sam presentation, use the disposable Testnet recipient wallet created locally, or explicitly transfer its username to the intended demo wallet with owner/new-owner authorization. Do not claim an existing registered name was freshly claimed.
4. The current reference-anchor rehearsal uses USD with simulated fiat payout, 1–10 USDC, `NEXT_PUBLIC_DEMO_MODE=false` and `ANCHOR_SIMULATED_FIAT=true`. Its real protocol/funding flow still requires manual approval; fiat payout is simulated. For offline DemoOffRamp, clear the anchor domain and enable demo mode only under `npm run dev`; it never reports payout completion.
5. Testnet resets invalidate public evidence/accounts/contracts; redeploy and reseed after a reset.

See SECURITY.md for the production controls and development-only dependency findings that remain outside this hackathon MVP.

## Presentation limits explicitly retained

- The ten-step Freighter extension rehearsal in DEMO.md is documented **but has not been performed by this agent**. Browser tests do not approve extensions or establish wallet compatibility on a phone.
- `@sam` is an existing seeded identity, not a fresh claim during this audit. A fresh registration demonstration must use an available username consistently.
- The canonical local payment links use the configured app origin. `skylarpay.app` in product examples does not establish a hosted deployment.
- SDF Test Anchor is configured and live discovery/challenge validation passed. USD is the configured demo fiat; NGN is unavailable and no live Nigerian payout provider is configured. Full SEP-10/SEP-24/funding/provider completion remains a manual rehearsal; controlled protocol tests are not live withdrawal evidence.

## Payout currency mismatch fix — 2026-10-05

Simulated-fiat mode previously bypassed the SEP-38 currency intersection, allowing an unsupported NGN request to the USD/CAD reference anchor. Currency discovery now always intersects the provider metadata. Local and example reference configuration select USD. A reported payout asset mismatch remains a blocking error (HTTP 409), identifies the requested and reported assets, and does not mutate the withdrawal or permit funding. Existing mismatched sessions require partner reconciliation; no funds were sent and no session was automatically cancelled by this fix. The supplied withdrawal ID was not found in the currently configured database, so its individual provider response was not independently verified. Regression coverage rejects unsupported NGN before external initiation even in simulated-fiat mode.
