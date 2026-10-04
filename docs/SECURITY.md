# MVP security review

## Controls implemented

- User signing keys never enter frontend source, backend custody, database, or logs. Freighter signs transactions.
- The immutable app verifier only sets address verification. It cannot change username ownership. Its Testnet key is stored in ignored `.env.local`, mode 0600.
- Owner auth protects registration and proposals/cancellations; new-owner auth protects acceptance. Unauthorized actions are contract-tested.
- Public usernames are canonical ASCII and validated on-chain; invalid/duplicate names fail.
- Config uses one network/passphrase/issuer/contract source. Horizon and RPC passphrases are queried; mixed official Circle issuers and contract network settings are rejected. Anchor network and asset configuration must match.
- Sign-in uses random short-lived server-stored challenges. Signature and unchanged transaction hash are checked, primary key weight must satisfy account thresholds, and challenges are consumed atomically. Session tokens are random, stored hashed, HTTP-only, SameSite-strict, and Secure in production.
- Mutating routes reject foreign origins. Input schemas validate accounts, names, amounts, IDs, hashes, profile fields, notes, and XDR size. Private routes derive the account from the session.
- Actual payment preparation and submission re-resolve the username; destination changes require review.
- Payment verification checks successful ledger evidence, network-bound envelope hash, sender, destination, one standard payment operation, exact USDC code+issuer, and exact integer amount. A client hash cannot mark confirmation.
- Pending records originate from authenticated submissions. Arbitrary unindexed verification requests do not poison the shared transaction index.
- Network + transaction hash is unique. Private notes are scoped to the authenticated sender/recipient; notes are never payment memos.
- Withdrawal idempotency is reserved in SQLite before calling an external provider. Retries with another amount/currency and the same key are rejected.
- Anchor discovery is server configuration only. Endpoints and interactive URLs must use HTTPS. SEP-10 signed challenges, network, client account, and server signing key are validated through SDK WebAuth.
- Provider instructions determine anchor transfers. The signed XDR must match the reviewed body; the exact transaction hash is reserved before submission and a second transfer cannot be silently prepared.
- Unknown provider states cause an error. Real completed status comes only from the provider. Demo mode is refused in production and on Mainnet, and never reports fiat payment completion.
- SQLite is mode 0600. Anchor tokens remain server-side; the DB and its backups must be protected as sensitive operational data.
- Structured logs record event/status/network, not keys, tokens, notes, KYC, or sensitive authentication bodies.

## Evidence

Contract auth tests; exact signed-envelope verification tests; idempotent payment/withdrawal/funding tests; SEP-10/SEP-24 adapter tests; disconnected/review/success/failure UI tests; browser tests for protected API routes and origin rejection; real Testnet API/auth/registry/payment flow recorded in LIVE-TEST.json.

Final audit on 2026-10-04: zero runtime dependency vulnerabilities reported by `npm audit --omit=dev`; source/docs and final browser JS scanned with no detected private-key literals or verifier-secret leaks. The complete tree reports five high-severity **development-only** findings through the Next ESLint plugin's fast-glob/micromatch/braces chain. The reported upstream braces range has no patched release; the audit's suggested forced downgrade would remove the current Next lint configuration. These tools run only against the local controlled repository and are not shipped as runtime endpoints. Recheck upstream fixes before adopting untrusted workspaces.

## Production work deliberately not claimed

No production audit, custody service, government KYC, privacy for Stellar settlement, guaranteed payout rail/liquidity, or actual bank payout is claimed. A configured anchor must be tested end-to-end before real cash-out is enabled operationally. No live provider is configured in this repository.

Further deployment controls: authenticated-route rate limits, durable hosted storage and encrypted backups, encrypted anchor-token storage at rest, verifier key rotation policy, detailed audit/incident response, contract TTL monitoring/restoration, external-payment indexing, and provider-specific reconciliation for ambiguous network timeouts. SQLite targets one process/server; it is not a horizontally scaled persistence design.

User authorization cannot be recovered after loss of wallet access. The MVP supports primary-key classic wallets, not arbitrary multisig, contract wallets, muxed payment recipients, or fee-bump payment envelopes.
