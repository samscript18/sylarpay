# Repository audit and build order

Initial repository contained only AGENTS.md. No package, lockfile, framework, routes, services, database, Stellar/wallet code, contracts, scripts, tests, README, environment example, or Git metadata existed. Nothing was deleted.

1. Next.js / TypeScript / Tailwind; centralized server-provided Stellar configuration; Freighter wallet adapter; Zustand wallet state, React Query and Axios; MongoDB/Mongoose and wallet-signed session authentication.
2. Soroban Rust registry with owner authorization, deterministic canonical username rules, two-step transfer, app-issued address verification; native tests, Wasm build, testnet deploy.
3. Claim and public profile, share URL and QR, account dashboard.
4. USDC payment preparation, explicit destination confirmation, wallet signature, submission, ledger verification, idempotent indexing, balance/history/private notes.
5. Environment-configured SEP-24/SEP-10 adapter; supported fiat configuration; provider status mapping; development-only Demo Off-Ramp.
6. Tests, mobile/desktop browser checks, security review, build, setup and demo documentation.

See READINESS.md for measured completion status and remaining external setup.
