# Judge demo — 2–3 minutes

## Prepare before presenting

- `npm ci`, build/test/deploy the registry, and run `npm run dev`.
- `npm run test:live` creates and verifies a real `@sam` identity and actual 150 USDC payment. Public evidence is in `LIVE-TEST.json`; keys are in ignored `.data/test-wallets.json`. These are disposable **Testnet-only** wallets. Import them locally into separate Freighter profiles if using those exact accounts for the live judge flow; never show or share their secrets.
- To show a fresh claim, use an available variant such as `@sam_design`, or deploy a fresh registry and register `@sam` through the UI first. Do not pretend an already claimed username was just registered.
- Fund test accounts via Friendbot; enable Circle USDC trustlines; provide the sender 150 Testnet USDC. The live test can buy it using free Testnet XLM if liquidity is available. Circle’s public faucet is another option, subject to its limits.
- For an unconfigured live anchor, set `NEXT_PUBLIC_DEMO_MODE=true` **only in local development**, restart, and confirm the Demo Off-Ramp label. This changes only cash-out simulation; payments remain real Testnet transactions.
- Keep the actual explorer page ready. Do not use a placeholder hash.

## 0:00–0:15 — Problem

Show the landing page.

> “Crypto payments still ask people to understand wallet addresses.”

## 0:15–0:40 — Identity

Open SkylarPay’s landing page.

> “People understand usernames. They shouldn’t have to understand wallet addresses.”

For the primary 2–3 minute script, connect the recipient before presenting and show the **existing seeded @sam**. Say “Sam claimed this earlier.” The registry proves ownership, and completed public profile setup explains Skylar Verified.

If demonstrating an actual fresh claim instead, connect the recipient’s Freighter Testnet wallet, sign the one-use login request, and claim an available variant with a public display name. Approve registration. Use that variant consistently for the rest of the demo.

If `@sam` is preseeded, show its existing identity and explain that registration was performed earlier; do not reenact a false registration.

## 0:40–0:55 — Payment link

Open Receive, copy the payment link, and show its QR. Open `/@sam` (or the username actually claimed).

> “This is my public payment identity. My client needs one link.”

Show Skylar Verified and explain briefly: ownership plus public profile setup, not government KYC. The profile can be viewed without a wallet.

## 0:55–1:30 — Payment

Switch to the sender’s Freighter Testnet wallet/browser profile. Open the recipient’s payment link and connect. Enter `150` USDC. Continue and show the actual username, verification, amount, asset, network, and full destination.

Confirm payment and approve the wallet signature. Show submitted/confirming state while the server checks Stellar. Only after verification show **Payment sent / Confirmed on Stellar Testnet**. Explain these are test assets with no monetary value.

## 1:30–1:50 — Proof

Open the generated Stellar Explorer link for the actual transaction. Switch to the recipient’s Overview and refresh. Show the ledger balance and the incoming payment. Add an optional private note and explain it stays off-chain.

If liquidity or the network fails, show the honest error or pending state. Never describe pending as completed.

## 1:50–2:30 — Cash out

Open Cash Out.

With a real configured provider: select NGN only if the provider supports it; start SEP-24, approve the partner authentication challenge, and open the partner’s hosted flow. The anchor supplies KYC, rates, payout rails, and transaction status. Show its actual state; initiation does not mean fiat has arrived.

With no configured provider: explicitly show **Demo Off-Ramp**. Enter 150, select demo NGN, open the demo handoff, and check simulated processing. State:

> “This segment demonstrates the partner handoff. No funds move and no bank payout occurs. A compatible anchor performs the actual conversion and payout.”

## 2:30–2:45 — Close

> “People understand usernames. They shouldn’t have to understand wallet addresses.”

> “The blockchain handles the settlement. SkylarPay handles the experience.”

No OPay, exchange-rate, privacy, speed, liquidity, or bank-payout claims are made without actual provider evidence.

## Manual Freighter rehearsal — required on the presentation machine

This rehearsal is **not recorded as completed by automated tests**. Use two separate browser profiles to keep the recipient and sender accounts distinct. Never display import secrets, recovery phrases, or `.env.local` on the projector.

1. **Connect Freighter.** Install/unlock the extension, open SkylarPay, click Connect Stellar wallet, allow access, and approve the one-use sign-in request. This first signature authenticates the app; it does not send USDC.
2. **Confirm Stellar Testnet.** Check the extension’s selected network and the app’s Testnet label. As a negative check, select Mainnet: connection/signing must refuse and instruct reconnection. Restore Testnet before proceeding.
3. **Confirm the correct account.** Compare the full sender public key in Freighter with the intended presentation account. Ensure it has at least 150 configured Circle Testnet USDC plus XLM for fees. In the recipient profile, ensure the selected account owns the seeded `@sam` and has a USDC trustline. The current public accounts are in `LIVE-TEST.json`; use them only if you control the matching local disposable keys.
4. **Open @sam.** Visit the application’s canonical `/@sam?amount=150` link. Confirm its display name, Skylar Verified badge, and destination. Show QR/copy link. The URL amount must not sign or submit anything automatically.
5. **Start a payment.** Click Pay @sam, Continue, and review 150 USDC, the network, full destination, and badge. The review destination must match the recipient account. First reject one approval to check the cancellation message; no success may appear. Then try again deliberately.
6. **Approve the transaction.** Click Confirm payment. Expect “Waiting for wallet approval…”. Manually inspect and approve the actual USDC payment in Freighter. Keep the presentation account selected throughout. Do not approve another payment while confirmation is pending.
7. **Confirm the hash appears.** During submission/confirmation, SkylarPay retains the signed transaction’s actual hash and provides an explorer link. A hash alone is not proof of settlement. If a response is lost, use Check confirmation; reload restores this same pending attempt instead of requesting another signature.
8. **Confirm backend verification.** Wait for Payment sent / Confirmed on Stellar Testnet. If pending or verification fails, show the honest state and check this hash. Never narrate success or send another payment to work around uncertainty.
9. **Confirm history.** In the recipient browser profile, open Overview and refresh activity. Check the incoming 150 USDC entry and the actual ledger balance increase. Existing seeded balance may already be 300 USDC or more; do not expect a fixed total. Confirm repeated verification creates one record. An optional note remains off-chain and account-private.
10. **Open Stellar Explorer.** Follow the app-generated link. Confirm Testnet, successful payment, sender, destination, 150 USDC, and configured Circle issuer. This is the judge’s settlement proof.

Finally rehearse Cash Out in the intended mode. With no configured provider, production shows unavailable; the local development demo must explicitly show Demo Off-Ramp and simulated processing, with no bank payout. A live provider rehearsal requires actual provider access and remains outstanding.

### Run-of-show checks

- Use `npx tsx scripts/audit-testnet.ts` for a read-only recheck of the deployed registry, seeded identity, existing payment, duplicate indexing, and current balance. It writes `AUDIT-TESTNET.json` and sends no payment. `npm run test:live` sends another actual Testnet payment and should be run deliberately.
- `@sam` is an **existing seeded identity**. Say “Sam claimed this earlier.” For an actual fresh claim, pick an available variant, complete its on-chain registration, and use that same variant in all links and narration.
- Set `NEXT_PUBLIC_APP_URL` to the actual presentation origin before starting. The local setup currently uses localhost; `skylarpay.app` is product example copy, not evidence that this repository is hosted there.
- Run the mobile viewport checks and also rehearse on the actual presentation phone. Check `/@sam`, Pay, QR, Send review, pending/confirmed states, Overview, and Cash Out. Freighter extension approval is rehearsed in the desktop browser; viewport tests do not establish phone wallet compatibility.
- Testnet reset or expired contract storage: redeploy/reseed and update configuration, then rerun the read-only audit. Do not present historical evidence as current availability.
