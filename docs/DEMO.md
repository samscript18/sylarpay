# Judge demo — 2–3 minutes

## Optional multi-send rehearsal (before presenting)

1. Connect the intended sender in Freighter on Stellar Testnet. Have enough configured USDC for the total and XLM for fees.
2. Use two existing registered usernames belonging to distinct funded accounts with authorized USDC trustlines. Do not describe seeded names as newly claimed.
3. Open **Send → Multiple recipients**, select both usernames and enter their individual amounts.
4. Choose **Review payments**. Check every username, verification state, destination, amount, total and Testnet label.
5. Choose **Confirm multi-send**, manually inspect all payment operations in Freighter, and approve once. Do not automate extension approval.
6. Check the actual transaction hash and wait for **Confirmed on Stellar Testnet**. If pending or the response is lost, use **Check confirmation** for the same hash; do not sign another transaction.
7. Open the explorer link and inspect both operations. Check the sender's two history entries share one hash and each recipient sees their own entry and actual updated balance.

This rehearsal has not been performed by the agent. Automated batch tests use real Stellar SDK signed envelopes with controlled Horizon boundaries; browser checks exercise editing and review without sending funds.

## Prepare before presenting

- Start MongoDB and verify `MONGODB_URI` in `.env.local`. Reconnect after the metadata migration; old SQLite sessions are intentionally not reused.
- `npm ci`, build/test/deploy the registry, and run `npm run dev`.
- `npm run test:live` creates and verifies a real `@sam` identity and actual 150 USDC payment. Public evidence is in `LIVE-TEST.json`; keys are in ignored `.data/test-wallets.json`. These are disposable **Testnet-only** wallets. Import them locally into separate Freighter profiles if using those exact accounts for the live judge flow; never show or share their secrets.
- To show a fresh claim, use an available variant such as `@sam_design`, or deploy a fresh registry and register `@sam` through the UI first. Do not pretend an already claimed username was just registered.
- Fund test accounts via Friendbot; enable Circle USDC trustlines; provide the sender 150 Testnet USDC. The live test can buy it using free Testnet XLM if liquidity is available. Circle’s public faucet is another option, subject to its limits.
- For an offline demo, clear `ANCHOR_HOME_DOMAIN`. For an unconfigured live anchor, set `NEXT_PUBLIC_DEMO_MODE=true` **only in local development**, restart, and confirm the Demo Off-Ramp label. This changes only cash-out simulation; payments remain real Testnet transactions.
- Keep the actual explorer page ready. Do not use a placeholder hash.

## 0:00–0:15 — Problem

Show the landing page.

> “Crypto payments still ask people to understand wallet addresses.”

## 0:15–0:40 — Identity

Open SylarPay’s landing page.

> “People understand usernames. They shouldn’t have to understand wallet addresses.”

For the primary 2–3 minute script, connect the recipient before presenting and show the **existing seeded @sam**. Say “Sam claimed this earlier.” The registry proves ownership, and completed public profile setup explains Sylar Verified.

If demonstrating an actual fresh claim instead, connect the recipient’s Freighter Testnet wallet, sign the one-use login request, and claim an available variant with a public display name. Approve registration. Use that variant consistently for the rest of the demo.

If `@sam` is preseeded, show its existing identity and explain that registration was performed earlier; do not reenact a false registration.

## 0:40–0:55 — Payment link

Open Receive, copy the payment link, and show its QR. Open `/@sam` (or the username actually claimed).

> “This is my public payment identity. My client needs one link.”

Show Sylar Verified and explain briefly: ownership plus public profile setup, not government KYC. The profile can be viewed without a wallet.

## Demo A — Real Testnet payment (0:55–1:30)

Switch to the sender’s Freighter Testnet wallet/browser profile. Open the recipient’s payment link and connect. Enter `150` USDC. Continue and show the actual username, verification, amount, asset, network, and full destination.

Confirm payment and approve the wallet signature. Show submitted/confirming state while the server checks Stellar. Only after verification show **Payment sent / Confirmed on Stellar Testnet**. Explain these are test assets with no monetary value.

## 1:30–1:50 — Proof

Open the generated Stellar Explorer link for the actual transaction. Switch to the recipient’s Overview. Activity and balance refresh automatically after relevant mutations, on focus and during background checks. Show the ledger balance and incoming payment; use a manual refresh only if checking an external update. Add an optional private note and explain it stays off-chain.

If liquidity or the network fails, show the honest error or pending state. Never describe pending as completed.

## Demo B — Anchor architecture and simulated fiat (1:50–2:30)

Open Cash Out.

With the current **SDF Test Anchor** configuration: show USD, Testnet, and **SDF Test Anchor — simulated fiat payout**. Use **2 USDC**, within the published 1–10 USDC limit. Open the actual SEP-24 hosted experience if a session has been manually authenticated. Show only the state actually reported; a confirmed Stellar transfer does not prove fiat completion. NGN is unavailable. The 150 USDC payment scene and this 2 USDC withdrawal are separate transactions.

With a real configured provider: select NGN only if the provider supports it; start SEP-24, approve the partner authentication challenge, and open the partner’s hosted flow. The anchor supplies KYC, rates, payout rails, and transaction status. Show its actual state; initiation does not mean fiat has arrived.

With no configured provider: explicitly show **Demo Off-Ramp**. Enter 150, select demo NGN, open the demo handoff, and check simulated processing. State:

> “This segment demonstrates the partner handoff. No funds move and no bank payout occurs. A compatible anchor performs the actual conversion and payout.”

## 2:30–2:45 — Close

> “People understand usernames. They shouldn’t have to understand wallet addresses.”

> “The blockchain handles the settlement. SylarPay handles the experience.”

No OPay, exchange-rate, privacy, speed, liquidity, or bank-payout claims are made without actual provider evidence.

## Manual Freighter rehearsal — required on the presentation machine

This rehearsal is **not recorded as completed by automated tests**. Use two separate browser profiles to keep the recipient and sender accounts distinct. Never display import secrets, recovery phrases, or `.env.local` on the projector.

1. **Connect Freighter.** Install/unlock the extension, open SylarPay, click Connect Stellar wallet, allow access, and approve the one-use sign-in request. This first signature authenticates the app; it does not send USDC. Connection progress identifies configuration, wallet access and sign-in stages. If Freighter does not respond, the button becomes usable again after a timeout: unlock the extension, inspect pending requests and retry.
2. **Confirm Stellar Testnet.** Check the extension’s selected network and the app’s Testnet label. As a negative check, select Mainnet: connection/signing must refuse and instruct reconnection. Restore Testnet before proceeding.
3. **Confirm the correct account.** Compare the full sender public key in Freighter with the intended presentation account. Ensure it has at least 150 configured Circle Testnet USDC plus XLM for fees. In the recipient profile, ensure the selected account owns the seeded `@sam` and has a USDC trustline. The current public accounts are in `LIVE-TEST.json`; use them only if you control the matching local disposable keys.
4. **Open @sam.** Visit the application’s canonical `/@sam?amount=150` link. Confirm its display name, Sylar Verified badge, and destination. Show QR/copy link. The URL amount must not sign or submit anything automatically.
5. **Start a payment.** Click Pay @sam, Continue, and review 150 USDC, the network, full destination, and badge. The review destination must match the recipient account. First reject one approval to check the cancellation message; no success may appear. Then try again deliberately.
6. **Approve the transaction.** Click Confirm payment. Expect “Waiting for wallet approval…”. Manually inspect and approve the actual USDC payment in Freighter. Keep the presentation account selected throughout. Do not approve another payment while confirmation is pending.
7. **Confirm the hash appears.** During submission/confirmation, SylarPay retains the signed transaction’s actual hash and provides an explorer link. A hash alone is not proof of settlement. If a response is lost, use Check confirmation; reload restores this same pending attempt instead of requesting another signature.
8. **Confirm backend verification.** Wait for Payment sent / Confirmed on Stellar Testnet. If pending or verification fails, show the honest state and check this hash. Never narrate success or send another payment to work around uncertainty.
9. **Confirm history.** In the recipient browser profile, open Overview and refresh activity. Check the incoming 150 USDC entry and the actual ledger balance increase. Existing seeded balance may already be 300 USDC or more; do not expect a fixed total. Confirm repeated verification creates one record. An optional note remains off-chain and account-private.
10. **Open Stellar Explorer.** Follow the app-generated link. Confirm Testnet, successful payment, sender, destination, 150 USDC, and configured Circle issuer. This is the judge’s settlement proof.

Finally perform the SDF Test Anchor rehearsal below. Earlier user-approved authentication/initiation reached an incomplete session; hosted completion, funding and payout reconciliation remain outstanding. The offline DemoOffRamp is a separate development-only option and does not transfer USDC.

### Run-of-show checks

- Use `npx tsx scripts/audit-testnet.ts` for a read-only recheck of the deployed registry, seeded identity, existing payment, duplicate indexing, and current balance. It writes `AUDIT-TESTNET.json` and sends no payment. `npm run test:live` sends another actual Testnet payment and should be run deliberately.
- `@sam` is an **existing seeded identity**. Say “Sam claimed this earlier.” For an actual fresh claim, pick an available variant, complete its on-chain registration, and use that same variant in all links and narration.
- Set `NEXT_PUBLIC_APP_URL` to the actual presentation origin before starting. Local development uses localhost; the hosted deployment uses https://sylarpay.onrender.com.
- Run the mobile viewport checks and also rehearse on the actual presentation phone. Check `/@sam`, Pay, QR, Send review, pending/confirmed states, Overview, and Cash Out. Freighter extension approval is rehearsed in the desktop browser; viewport tests do not establish phone wallet compatibility.
- Testnet reset or expired contract storage: redeploy/reseed and update configuration, then rerun the read-only audit. Do not present historical evidence as current availability.

## SDF Test Anchor manual withdrawal rehearsal

**Verified live during this integration:** published Testnet network, SEP-10/24/38 endpoints, exact Circle USDC issuer, USD availability, 1–10 USDC limits, and SDK validation of a real server-signed SEP-10 challenge without `client_domain`. **Subsequently observed:** an earlier user-approved SEP-10/SEP-24 session reached `incomplete`; access later expired. **Subsequent 2026-10-06 observation:** a user-initiated session reached `pending_user_transfer_start`, with 1 USDC funding instructions and 0.9 simulated USD output metadata. Its saved transfer hash was not found on Stellar after expiry. **Still unverified:** successful withdrawal USDC settlement and provider completion. The initial challenge audit is in `SDF-ANCHOR-AUDIT.json`; later session observations are recorded in READINESS.md. No wallet approval was automated.

Use a disposable Testnet wallet you control, with at least **2 Circle Testnet USDC**, an authorized trustline, and XLM for fees/reserve. Never display/import secrets on the projector. Restart the app after changing `.env.local`; the reference configuration uses `NEXT_PUBLIC_DEMO_MODE=false` and `ANCHOR_SIMULATED_FIAT=true`.

1. **Connect Freighter.** Unlock the extension, allow SylarPay access, and manually approve the app sign-in request.
2. **Confirm Testnet and account.** Compare the app/network label and sender public key with Freighter. Keep that account selected throughout.
3. **Open Cash Out.** Confirm **SDF Test Anchor — simulated fiat payout**. This uses the real provider API; it is different from the offline Demo Off-Ramp.
4. **Select USD.** The reference anchor advertises USD and CAD; this demo is configured for USD. NGN is unavailable, even with simulated fiat enabled. Do not narrate this as a real bank payout.
5. **Enter 2 USDC.** The provider allows 1–10 USDC. Check 0.5 and 11 are rejected before requesting a wallet signature. Do not use 150.
6. **Start the withdrawal.** Manually approve the SEP-10 authentication challenge in Freighter. It authenticates with `testanchor.stellar.org`; this signature does not transfer USDC. A prior user-approved session is recorded, but this rehearsal still requires manual approval.
7. **Complete the hosted reference UI.** Follow **Continue verification**. The expected hosted origin is `https://anchor-ref-ui-testanchor.stellar.org`; inspect the actual returned URL before continuing. Complete the reference form and any required confirmation manually. SylarPay does not recreate this form. Do not narrate it as production KYC or a bank payout.
8. **Return to SylarPay.** Wait for polling or use **Check withdrawal status**. `incomplete` means provider information is still needed. Only `pending_user_transfer_start` enables preparation of the funding transfer.
9. **Review funding instructions.** Choose **Prepare USDC transfer**. Inspect the exact provider destination, amount, Circle issuer, Stellar Testnet network, and required memo/payment identifier. Stop if any field is unexpected. Amount comes from the provider; no exchange rate is invented.
10. **Approve the USDC transfer in Freighter.** Choose **Confirm USDC transfer**, manually inspect the transaction, and approve once. This is a real transfer of valueless Testnet USDC; it is not a fiat payout.
11. **Show Stellar confirmation.** Record the actual hash and open the explorer. **Check Stellar confirmation** verifies the actual successful ledger envelope against the reviewed transaction, including network, sender, destination, asset/issuer, exact amount and memo.
12. **Show anchor reconciliation.** Continue polling/checking provider status. `pending_user_transfer_complete` is pending; `pending_stellar`, `pending_anchor`, and `pending_external` are processing. Submission or Stellar confirmation never marks the withdrawal completed by itself. Polls do not overlap and stop at terminal states (or after 30 attempts).
13. **Show simulated completion only if reported.** If the provider reports `completed`, show **Simulated USD payout completed** with the persistent simulated-fiat notice. Otherwise show its actual pending/failed/expired state. Say: “The USDC leg settled on Stellar Testnet. SDF's reference anchor simulates the fiat conversion and payout. No real bank payout occurred.”

### Withdrawal troubleshooting

- **Wallet loading/unavailable/rejected:** unlock Freighter, inspect pending requests, and reconnect. A rejection is not a transfer. Never approve another transfer while the first hash is pending.
- **Account/network changes:** restore the intended account and Testnet, then reconnect. Signing refuses changed accounts and wrong networks. Session restoration is scoped to both.
- **Hosted tab closed:** closing the tab does not cancel the provider transaction. Return to its existing interactive link and check status; do not initiate another withdrawal. If the provider reports error, expiry or refund, SylarPay shows the corresponding terminal state.
- **Funding response lost/reload:** the exact signed hash is saved before submission and restored from account/network-scoped session storage or the server record. Use **Check Stellar confirmation** and the explorer for that hash; do not sign another transfer. An unrecorded attempt requires reconciliation rather than assuming success or failure.
- **Initiation response lost:** retry the same amount/currency request in the same browser; the saved idempotency key restores the reserved request. An unconfirmed reservation remains `CREATED`, not completed or a fabricated session. If no anchor session ID was returned, reconcile with the provider before starting a new request or transferring funds.
- **Authentication expired/provider unavailable:** retain the existing withdrawal ID and hash, refresh status when available, and complete reauthentication with the provider before continuing. Use Reconnect to partner to approve a new SEP-10 challenge for the same withdrawal. It restores provider access, not an expired interactive token; do not initiate a duplicate withdrawal to work around expiry.
- **Expired attempt / explorer not found:** a saved hash is not evidence of submission. Use Check Stellar confirmation. If the signed transaction expired and Horizon returns 404, reconcile the existing withdrawal and attempt with the partner before preparing another transfer. Never edit or clear the stored hash to bypass duplicate protection.
- **Stellar failure:** show the actual failed transaction. No USDC payout claim is made. Fees may still be charged in XLM; inspect the ledger before any deliberate retry.
- **No completion:** leave the real status visible. The judge can see protocol and Stellar evidence without a fabricated final state. The hosted form and reference payout progression require manual verification.

Production still needs a real anchor supporting the desired local fiat and payout rail. The broader USDC → anchor → supported local fiat vision remains intact; this reference demo uses USD with simulated fiat settlement.

### Expired SDF hosted link / `session_token=undefined`

A user-initiated session was inspected on 2026-10-04: SkylarPay had stored the original anchor-issued root URL with `transaction_id` and `token`, not a fabricated `session_token`. Its initial hosted JWT had expired. The public reference UI reads `sessionId` from its `/start` response without checking for a successful response first, so a failed session start can redirect to a URL containing `undefined`. Do not edit a token into that URL or reuse the broken status link.

On 2026-10-05, the existing provider lookup also returned HTTP 403. SkylarPay now preserves the existing withdrawal and last known status, flags expired provider access, hides the expired hosted link, and offers **Reconnect to partner**. Connect the original Testnet wallet and approve the new SEP-10 challenge in Freighter. This updates authentication for the same withdrawal ID; it creates no withdrawal and sends no USDC. Use **Open provider transaction details** if the refreshed anchor response supplies `more_info_url`.

Refreshing SEP-10 access does **not** mint a replacement interactive token. If provider details do not offer a usable resume flow, the expired hosted session still requires provider-side recovery/cancellation. Do not start another withdrawal or fund anything to work around it. Fresh authentication and any recovery link still require manual verification; no automated recovery or completion is claimed.

### Payout currency mismatch

If a saved withdrawal reports a different payout currency from the requested one, do not fund it. Open the partner’s transaction details and reconcile or cancel that session with the partner. Restart the app after changing anchor environment configuration. New reference-anchor requests must select USD; enabling simulated fiat does not enable NGN. Existing withdrawal records are not silently relabeled or marked cancelled.

### Wallet-free first impression

Open the landing page and point out the persistent Testnet disclosure. Use the sandbox's **Resolve** button for an actual public username lookup; no wallet is needed. **Simulate payment** is illustrative and sends no funds. For settlement proof, use the direct **View UsernameRegistry** and **View verified 150 USDC transaction** links: these are existing Testnet evidence, not transactions created by the preview. Open the payment profile and connect Freighter only when continuing to a real payment. Cash-out initiation also requires Freighter authentication/approval and the anchor's hosted interaction; it cannot be completed by a visitor without a Stellar wallet. The configured reference demo uses USD and simulates fiat payout; no NGN rail or bank transfer is live.

### Homepage-first judge walkthrough — 2026-10-06

Use the hosted Render origin shown by the app, not an undeployed custom-domain example. The hero’s 150 USDC card is explicitly **historical Testnet evidence**, with the recorded date and a direct explorer link. **Watch the payment flow** scrolls to the four-step explanation; it is not a recorded video. The real-vs-simulated proof details identify the deployed contract, recorded owner and exact payment hash. **Simulate payment** in the wallet-free sandbox is only an illustrative preview; it does not sign, submit, confirm or update any account balance.

For the live payment scene, open the actual @sam profile and complete the existing manual Freighter sequence above. Do not narrate the historical hero card or sandbox as a fresh transfer. A recorded demo video still needs authentic manual wallet/anchor footage; no synthetic approval or bank-payout footage has been produced.
