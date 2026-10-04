# SkylarPay — Engineering Agent Instructions

## 0. PROJECT IDENTITY

Project name: **SkylarPay**

Core tagline:

> **Get paid globally. Pay locally. Just use @username.**

Product principle:

> **The blockchain handles settlement. SkylarPay handles the experience.**

SkylarPay is a consumer payment application built on Stellar.

The product should make receiving and sending Stellar USDC feel like a normal consumer payment experience rather than a crypto infrastructure workflow.

The central idea is simple:

A user claims a human-readable `@username`, connects it to a Stellar account, and can then receive USDC through:

- a username
- a payment link
- a QR code

Example:

`@sam`

`https://skylarpay.app/@sam`

The sender should not need to manually copy or understand a long Stellar public key.

The recipient can later use a Stellar anchor/off-ramp to convert USDC into local fiat such as NGN where supported.

---

# 1. NON-NEGOTIABLE PRODUCT VISION

SkylarPay is NOT:

- a crypto exchange
- a trading platform
- a generic wallet clone
- a social network
- a P2P marketplace
- a fake banking app
- a custodial exchange
- a system that pretends Stellar transactions are private

SkylarPay IS:

> A consumer payment layer on Stellar that turns a Stellar account into a human-readable payment identity.

The product must feel like:

1. Open SkylarPay
2. Claim `@sam`
3. Get verified
4. Share `skylarpay.app/@sam`
5. Someone sends USDC
6. Payment settles on Stellar
7. Recipient sees the money
8. Recipient chooses Cash Out
9. Anchor handles conversion to local fiat
10. User sees the transaction and status

The blockchain should be visible as proof, not as unnecessary complexity.

---

# 2. PRIMARY USER STORY

The primary demo scenario is:

A designer in Nigeria finishes work for a client in the US.

The client wants to pay in dollars.

The designer does not want to send a long Stellar address.

The client does not want to understand wallets.

The designer sends:

`skylarpay.app/@sam`

The client opens it.

They see:

- @sam
- profile
- verification status
- Stellar payment destination
- amount input
- USDC payment action

The client sends `$150 USDC`.

The payment settles on Stellar.

SkylarPay detects and verifies the transaction.

The recipient sees:

`+$150.00 USDC`

Later, the recipient chooses:

`Cash Out → NGN`

SkylarPay starts a compatible Stellar anchor withdrawal flow.

The anchor handles the required KYC/interactive process.

The user completes the withdrawal.

The anchor converts/redeems the Stellar asset and pays the user through its supported local payout rail.

Do NOT claim that Stellar itself performs the NGN conversion.

Stellar provides the settlement network.

The anchor provides the fiat/off-ramp service.

---

# 3. CORE PRODUCT FEATURES

The MVP MUST contain these features.

## 3.1 Wallet/account connection

Users need a Stellar account.

Support a wallet connection/creation approach appropriate for a hackathon MVP.

The implementation must not hard-code private keys into the frontend.

Use an established wallet/authentication solution if appropriate.

If a wallet abstraction is used, isolate it behind a wallet service interface.

The application must know:

- Stellar public key
- network
- connection state
- signing capability

Never expose:

- secret keys
- seed phrases
- server private keys

in frontend source code.

---

# 4. USERNAME SYSTEM

Create a Soroban smart contract named conceptually:

`UsernameRegistry`

The contract is the source of truth for username ownership.

It must support at minimum:

### register

Register a username against a Stellar address.

Example:

`register("sam", G...)`

Rules:

- usernames are unique
- username normalization must be deterministic
- usernames cannot be registered twice
- registration must require authorization from the owner
- invalid usernames must be rejected
- empty usernames must be rejected
- excessively long usernames must be rejected

Recommended username rules:

- lowercase
- 3–24 characters
- letters
- numbers
- underscore
- optionally hyphen if implementation remains safe
- no spaces
- no `@` stored in contract

Store:

`sam`

Display:

`@sam`

---

## 4.1 Username lookup

The application must resolve:

`@sam`

into:

`Stellar public key`

before creating a payment.

Never trust a cached frontend result for the actual payment destination.

The payment flow should perform a fresh resolution.

Conceptually:

```text
@sam
 ↓
UsernameRegistry
 ↓
Stellar account
 ↓
confirm destination
 ↓
create payment
```

---

# 5. USERNAME OWNERSHIP

The contract must ensure only the current owner can modify their username.

Implement appropriate authorization using Soroban authentication.

Do not create an admin-controlled mapping where the backend can silently change ownership.

The blockchain contract must be the authority for username ownership.

---

# 6. USERNAME TRANSFER

Implement a safe transfer mechanism.

At minimum:

```text
transfer(username, new_owner)
```

must require authorization from the current owner.

Avoid accidental transfers.

If practical, implement a two-step ownership transfer:

```text
propose_transfer
accept_transfer
```

This is preferred.

---

# 7. USERNAME RECOVERY

The product description promises a recovery/transfer rule.

Implement a simple, honest mechanism.

Do NOT invent magical account recovery.

For MVP:

- username belongs to the Stellar account
- if the user loses wallet access, SkylarPay cannot magically recover it
- the app may provide an explicit transfer/recovery mechanism only if ownership can be cryptographically proven

Do not claim social recovery unless it is actually implemented.

---

# 8. VERIFICATION SYSTEM

SkylarPay should have a verification badge.

The badge must mean something.

Do not make verification a meaningless visual toggle.

Create an on-chain verification state or registry.

Conceptually:

```text
Verified
```

means the account has satisfied SkylarPay's defined verification requirements.

For MVP, the verification criteria can be:

- username owned by the connected account
- account has completed the required profile setup
- optional minimum account age/activity requirement
- optional demo/admin verification only if explicitly labeled

The UI must distinguish:

- Verified
- Unverified

Do not imply government identity verification unless actual KYC has occurred.

If verification is app-issued, call it something such as:

`Skylar Verified`

not:

`Government Verified`

---

# 9. PAYMENT PROFILE

Each username should have a public payment profile.

Example:

```text
@sam

✓ Skylar Verified

Available to receive USDC

[Pay @sam]

[Copy Link]

[Show QR]
```

The public profile should reveal only information intentionally made public.

Do not expose:

- email
- phone number
- private notes
- private payment history
- KYC information
- wallet secret information

---

# 10. PAYMENT LINKS

Every username should generate a payment URL.

Example:

```text
https://skylarpay.app/@sam
```

The route should dynamically resolve the username.

Invalid usernames must produce a proper not-found state.

The page must never assume the username exists.

---

# 11. PAYMENT LINKS WITH OPTIONAL AMOUNT

Support optional amount parameters if practical.

Example:

```text
/@sam?amount=150
```

or a safer structured route.

The sender must still confirm:

- recipient username
- recipient verification
- amount
- asset
- destination account

before signing.

Never automatically send money simply because a URL contains an amount.

---

# 12. QR CODES

Every payment profile should be able to generate a QR code.

The QR code should encode the SkylarPay payment URL.

Example:

```text
https://skylarpay.app/@sam
```

Do not encode sensitive information into the QR code.

QR should work on mobile.

The UI should provide:

- QR display
- copy link
- share link

---

# 13. PAYMENT FLOW

The payment flow is one of the most important parts of the project.

It must be extremely clear.

Example:

```text
Sender opens @sam
        ↓
SkylarPay resolves username
        ↓
Show recipient
        ↓
Sender enters amount
        ↓
Sender confirms
        ↓
Wallet signs Stellar transaction
        ↓
Transaction submitted
        ↓
Transaction hash received
        ↓
SkylarPay verifies transaction
        ↓
Payment marked confirmed
```

Before signing, show:

```text
Paying

@sam
✓ Skylar Verified

Amount
$150.00 USDC

Network
Stellar

Destination
G...ABCD
```

The user must explicitly confirm.

---

# 14. STELLAR PAYMENTS

Use Stellar's supported SDK/tooling rather than manually constructing unsafe transaction data.

USDC asset configuration must be environment/config driven.

Do not hard-code an assumed USDC issuer without verifying the network.

Create configuration such as:

```env
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=...
USDC_ASSET_CODE=USDC
USDC_ISSUER=...
```

For testnet development, use the correct Stellar testnet USDC configuration.

For production/mainnet, use the correct mainnet issuer.

NEVER mix testnet and mainnet assets.

---

# 15. NETWORK SAFETY

Every transaction must know its network.

Create a single network configuration layer.

Example:

```ts
type StellarNetwork = "testnet" | "mainnet";
```

The application should not scatter network strings throughout the codebase.

Do not allow:

- testnet frontend + mainnet contract
- mainnet frontend + testnet USDC
- testnet wallet + mainnet anchor
- mismatched network passphrases

without an explicit configuration error.

---

# 16. PAYMENT VERIFICATION

Never mark a payment as successful simply because the wallet returned a transaction hash.

Verify the transaction.

At minimum verify:

- transaction exists
- transaction succeeded
- correct source
- correct destination
- correct asset
- correct amount
- correct network
- correct transaction operation
- expected recipient

If the payment is associated with a username, resolve the username and verify that the transaction destination matches the currently resolved account.

---

# 17. PAYMENT RECORD

Create a backend payment record.

Suggested schema:

```text
Payment
- id
- txHash
- senderAddress
- recipientAddress
- recipientUsername
- assetCode
- assetIssuer
- amount
- network
- status
- createdAt
- confirmedAt
- failureReason
```

Statuses:

```text
PENDING
CONFIRMED
FAILED
```

Never use the database as the source of truth for whether funds moved.

The Stellar ledger is the source of truth.

The database is an indexed representation of the transaction.

---

# 18. DUPLICATE PAYMENT PROTECTION

The backend must prevent the same Stellar transaction from being recorded multiple times.

Use transaction hash as an idempotency key where appropriate.

If the same transaction is processed twice:

- do not create duplicate payment records
- return the existing record

---

# 19. TRANSACTION HISTORY

Users should have a simple payment history.

Example:

```text
Activity

+ $150.00 USDC
From @client
Completed
Stellar

- $20.00 USDC
To @designer
Completed
Stellar
```

Do not expose private notes on-chain.

---

# 20. PRIVACY MODEL

IMPORTANT:

Do NOT claim that Stellar payments are private.

Stellar transactions are publicly verifiable.

SkylarPay privacy means:

- private app metadata remains off-chain
- private payment notes remain off-chain
- internal labels remain off-chain
- personal UI context remains private
- on-chain settlement remains publicly verifiable

Correct wording:

> "SkylarPay keeps your payment context inside the app while the underlying Stellar transaction remains publicly verifiable."

Incorrect wording:

> "SkylarPay makes Stellar payments private."

Never use the incorrect claim.

---

# 21. PAYMENT NOTES

Users may optionally attach notes to payments.

Example:

```text
Invoice #104
```

These notes should be stored off-chain.

Never put private notes into Stellar transaction memo fields by default.

The transaction should remain minimal.

---

# 22. CASH OUT

Cash out is a major feature.

Architecture:

```text
SkylarPay
   ↓
Stellar USDC
   ↓
Stellar Anchor
   ↓
Fiat conversion/redemption
   ↓
Local payout rail
   ↓
User bank/mobile-money account
```

SkylarPay itself is NOT the bank.

SkylarPay itself does NOT guarantee NGN liquidity.

SkylarPay itself does NOT perform KYC unless explicitly implemented.

The anchor handles the off-ramp responsibilities.

---

# 23. PREFERRED OFF-RAMP: SEP-24

Use SEP-24 as the preferred MVP integration when the selected anchor supports it.

SEP-24 provides a hosted interactive experience where the anchor handles the required KYC/transaction interaction.

SkylarPay should:

1. discover/configure the anchor
2. authenticate as required
3. query supported assets/currencies
4. initiate withdrawal
5. receive the interactive URL
6. open the hosted anchor flow
7. allow the user to complete required information/KYC
8. monitor transaction status
9. show status inside SkylarPay

Do not recreate the anchor's KYC UI.

The anchor owns that flow.

---

# 24. SEP-24 ABSTRACTION

Create an interface similar to:

```ts
interface OffRampProvider {
  getInfo(): Promise<AnchorInfo>;

  startWithdrawal(params: {
    assetCode: string;
    assetIssuer?: string;
    account: string;
    amount?: string;
  }): Promise<WithdrawalSession>;

  getWithdrawalStatus(
    transactionId: string
  ): Promise<WithdrawalStatus>;
}
```

This allows the provider to be replaced without rewriting the product.

---

# 25. ANCHOR CONFIGURATION

Use environment variables/configuration.

Example:

```env
ANCHOR_HOME_DOMAIN=
ANCHOR_TRANSFER_SERVER=
ANCHOR_PROTOCOL=SEP24
ANCHOR_ASSET_CODE=USDC
ANCHOR_ASSET_ISSUER=
ANCHOR_SUPPORTED_FIAT=NGN
```

Do not hard-code a provider into business logic.

---

# 26. REAL ANCHOR VS MOCK

The application must clearly distinguish:

### REAL MODE

A real SEP-compatible anchor is configured.

Then the UI can show:

```text
Cash Out
NGN
Powered by [Anchor]
```

and execute the real flow.

### DEMO MODE

If no live anchor is available during development:

```text
Demo Off-Ramp
```

must be clearly labeled.

Do NOT fake a successful bank payout.

Never show:

```text
₦225,000 deposited to your bank
```

unless the transaction actually happened.

For demo mode, simulate only the UI/state transition.

---

# 27. NGN SUPPORT

NGN should be configuration-driven.

Do not assume every anchor supports NGN.

The application should inspect the anchor's supported currencies/assets where possible.

If NGN is unsupported:

```text
NGN cash out is currently unavailable with this provider.
```

Do not pretend otherwise.

---

# 28. OPAY / LOCAL PAYMENT RAILS

Do NOT hard-code claims that SkylarPay pays directly into OPay.

A local payout rail depends on the selected anchor/provider.

Only mention a specific Nigerian payout provider if the configured anchor actually supports it.

The general product language should be:

> "Cash out to local currency through a compatible Stellar anchor and its supported payout rails."

If a verified provider supports Nigerian bank/mobile-money payouts, the UI may expose those options.

---

# 29. WITHDRAWAL STATE MACHINE

Implement explicit withdrawal statuses.

Suggested:

```text
CREATED
AWAITING_KYC
AWAITING_USER_TRANSFER
PENDING
PROCESSING
COMPLETED
FAILED
EXPIRED
CANCELLED
```

The exact mapping should follow the selected SEP-24 provider.

Never assume:

```text
transaction initiated = fiat received
```

The user must see the actual provider status.

---

# 30. WITHDRAWAL UI

Example:

```text
Cash Out

Balance
150.00 USDC

You receive approximately
₦XXX,XXX

Rate
1 USDC = ₦XXX

Provider
[Anchor Name]

[Cash Out]
```

Then:

```text
Complete withdrawal

The secure verification step will open with our payment partner.

[Continue]
```

After returning:

```text
Withdrawal processing

$150 USDC
→ NGN

Status
Processing

Transaction ID
...
```

---

# 31. FEES AND RATES

Do not invent exchange rates.

If the anchor provides:

- exchange rate
- fees
- payout amount

display those values.

If unavailable, clearly label the amount as an estimate.

Never hard-code:

```text
1 USDC = ₦1,500
```

unless it is explicitly a demo configuration.

---

# 32. SMART CONTRACT ARCHITECTURE

Use Soroban/Rust for the on-chain username registry.

Possible contract responsibilities:

```text
UsernameRegistry
├── register
├── resolve
├── owner_of
├── exists
├── transfer
├── propose_transfer
├── accept_transfer
├── set_verification
└── verification_status
```

Keep the contract small.

Do NOT put payment processing logic into the username contract.

Stellar payments should remain normal Stellar asset transfers.

The contract handles identity.

The Stellar ledger handles settlement.

---

# 33. CONTRACT SECURITY

The contract must:

- validate username format
- prevent duplicates
- enforce owner authorization
- protect transfers
- avoid unrestricted admin mutation
- use deterministic storage
- include tests for unauthorized access
- include tests for duplicate registration
- include tests for transfer
- include tests for invalid usernames
- include tests for verification permissions

Do not store unnecessary personal data on-chain.

Never store:

- email
- phone
- KYC documents
- addresses
- private payment notes

on the contract.

---

# 34. VERIFICATION CONTRACT DESIGN

Verification must not expose private information.

Store only the minimal state necessary.

Example:

```text
username → verification status
```

or:

```text
address → verification status
```

Prefer address-based verification where appropriate so verification is not permanently coupled to a username.

---

# 35. BACKEND

Use a backend/API where required.

Responsibilities:

- user profile metadata
- payment indexing
- transaction verification
- payment history
- private payment notes
- off-ramp session tracking
- anchor status polling
- rate/fee presentation
- API security

The backend MUST NOT become the source of truth for asset ownership.

---

# 36. DATABASE

Use a simple relational database if needed.

Suggested entities:

```text
User
- id
- walletAddress
- username
- createdAt
- updatedAt

Profile
- userId
- displayName
- avatarUrl
- bio
- verificationStatus

Payment
- id
- txHash
- senderAddress
- recipientAddress
- username
- assetCode
- assetIssuer
- amount
- status
- network
- createdAt
- confirmedAt

PaymentNote
- id
- paymentId
- ownerUserId
- note
- createdAt

Withdrawal
- id
- userId
- provider
- protocol
- assetCode
- amount
- fiatCurrency
- fiatAmount
- anchorTransactionId
- stellarTxHash
- status
- createdAt
- updatedAt
```

Adapt this schema to the chosen stack.

Do not over-engineer the database.

---

# 37. API DESIGN

Create clear API boundaries.

Suggested routes:

```text
GET  /api/users/:username
POST /api/users/profile

GET  /api/payments
POST /api/payments/verify

GET  /api/anchors
GET  /api/anchors/:id/info

POST /api/withdrawals
GET  /api/withdrawals/:id
```

Avoid unnecessary API endpoints.

---

# 38. API SECURITY

Validate all input server-side.

Never trust:

- username from client
- amount from client
- wallet address from client
- transaction status from client
- verification state from client

Use schemas such as Zod or equivalent.

Reject malformed Stellar addresses.

Reject invalid asset identifiers.

Reject negative/zero payment amounts.

Use idempotency where money-related operations are involved.

---

# 39. FRONTEND

Preferred stack:

- Next.js
- TypeScript
- Tailwind CSS
- modern component system
- responsive mobile-first UI

Use a clean architecture.

Suggested:

```text
app/
components/
lib/
services/
contracts/
hooks/
types/
server/
tests/
```

Do not put everything in page components.

---

# 40. DESIGN DIRECTION

SkylarPay should look like a premium consumer fintech application.

Avoid:

- excessive crypto terminology
- hacker aesthetics
- neon cyberpunk UI
- unnecessary gradients
- cluttered dashboards
- fake terminal interfaces
- excessive wallet jargon

Visual direction:

- clean
- modern
- trustworthy
- premium
- mobile-first
- strong typography
- generous spacing
- clear hierarchy
- subtle motion

The application should look credible in a hackathon demo screenshot.

---

# 41. LANDING PAGE

Create a strong landing page.

Hero:

```text
Get paid globally.
Pay locally.
Just use @username.
```

Supporting text:

```text
SkylarPay turns your Stellar account into a simple payment identity.
Receive USDC through a username, link, or QR code — then cash out through a compatible local off-ramp.
```

Primary CTA:

```text
Claim your @username
```

Secondary CTA:

```text
See how it works
```

---

# 42. LANDING PAGE SECTIONS

Include:

## Hero

Product value proposition.

## How it works

```text
1. Claim @username
2. Share your payment link
3. Get paid in USDC
4. Cash out locally
```

## Example payment profile

Show:

```text
@sam
✓ Skylar Verified

$150.00 received
```

## Why SkylarPay

Explain:

- no long addresses
- simple payment links
- Stellar settlement
- verifiable transactions
- local cash-out

## Stellar proof

Show that transactions remain verifiable on-chain.

## Final CTA

```text
Get your @username
```

---

# 43. DASHBOARD

After wallet connection:

```text
Good morning, Sam

@sam
✓ Skylar Verified

Balance

150.00 USDC

[Receive] [Send] [Cash Out]

Recent activity
...
```

Keep the dashboard simple.

Do not turn it into a trading dashboard.

---

# 44. RECEIVE SCREEN

The receive screen should be excellent.

Show:

```text
Receive USDC

@sam

skylarpay.app/@sam

[Copy Link]

[Share]

[Show QR]
```

Also show a clear explanation:

```text
Anyone can pay you using this link.
```

---

# 45. SEND SCREEN

Show:

```text
Send USDC

Recipient
[@username]

Amount
[     ]

[Continue]
```

Allow:

```text
@sam
```

to resolve.

Before confirmation:

```text
You're sending

$150 USDC

To

@sam
✓ Skylar Verified

Stellar account
G...ABCD
```

Then:

```text
[Confirm Payment]
```

---

# 46. PAYMENT SUCCESS SCREEN

Make the success state visually strong.

Example:

```text
Payment sent

$150.00 USDC

to @sam

✓ Confirmed on Stellar

Transaction
G...XYZ

[View on Stellar Explorer]
```

The explorer link must be generated from the actual transaction hash and correct network.

Do not fabricate transaction URLs.

---

# 47. PUBLIC PROFILE

Route:

```text
/@username
```

Example:

```text
@sam

✓ Skylar Verified

Designer

Available for USDC payments

[Pay @sam]

[Share]

[QR]
```

The public profile must work without requiring the visitor to create an account just to view it.

---

# 48. ERROR STATES

Every important action needs clear failure states.

Examples:

### Username unavailable

```text
@sam is already taken.
Try @samdesign
```

### Invalid username

```text
That username isn't available.
```

### Wallet disconnected

```text
Connect your Stellar wallet to continue.
```

### Transaction rejected

```text
Payment cancelled.
No funds were sent.
```

### Transaction failed

```text
Payment failed.
Your funds were not transferred.
```

### Transaction pending

```text
Payment submitted.
Waiting for Stellar confirmation.
```

### Anchor unavailable

```text
Cash out is temporarily unavailable.
Try again later.
```

### Unsupported currency

```text
NGN cash out is not available with this provider.
```

---

# 49. LOADING STATES

Do not use generic blank spinners.

Use meaningful states:

```text
Resolving @sam...
```

```text
Preparing Stellar payment...
```

```text
Waiting for wallet approval...
```

```text
Confirming on Stellar...
```

```text
Checking withdrawal status...
```

---

# 50. DEMO MODE

Create a controlled development/demo mode.

Environment variable:

```env
NEXT_PUBLIC_DEMO_MODE=false
```

When enabled:

- sample users may be shown
- sample profile may be shown
- mock anchor may be available
- fake transaction states may be simulated

But every mock state must be visually or internally distinguishable.

Do not let demo mode accidentally run in production.

---

# 51. SAMPLE DEMO USER

Create seed/demo configuration for:

```text
@sam
```

Use a clearly configured testnet address.

The demo should be easy to reset.

Do not hard-code a real person's wallet.

---

# 52. TESTNET FIRST

The MVP should target Stellar Testnet first.

The entire application should be configurable so Mainnet can later be enabled.

Environment:

```env
STELLAR_NETWORK=testnet
```

All demo transactions should use testnet.

Never tell users that a testnet transaction is real money.

---

# 53. FAUCET / TEST FUNDS

If a testnet wallet needs funding, provide a developer utility or clear documentation.

Do not build a faucet into production.

---

# 54. STELLAR EXPLORER

Every confirmed transaction should have:

```text
View on Stellar Explorer
```

Generate the correct URL based on:

- network
- transaction hash

Never hard-code a testnet explorer URL for a mainnet transaction.

---

# 55. OBSERVABILITY

Add structured logging around:

- username resolution
- payment creation
- transaction verification
- anchor initialization
- withdrawal creation
- withdrawal status updates

Never log:

- secret keys
- seed phrases
- KYC documents
- authentication tokens
- private user information

---

# 56. ERROR HANDLING

Errors must be:

- typed where practical
- user-readable
- logged appropriately
- recoverable where possible

Avoid swallowing errors.

Do not use:

```ts
catch {
  return true;
}
```

for financial operations.

Never treat failure as success.

---

# 57. TESTING REQUIREMENTS

The project must have meaningful automated tests.

## Smart contract tests

Test:

- registration
- duplicate registration
- username resolution
- unauthorized registration
- unauthorized transfer
- valid transfer
- invalid username
- verification state
- nonexistent username

## Backend tests

Test:

- username lookup
- payment verification
- invalid transaction
- duplicate transaction
- wrong recipient
- wrong asset
- wrong amount
- failed Stellar transaction
- withdrawal creation
- withdrawal status

## Frontend tests

Test:

- username page
- payment form
- invalid username
- wallet disconnected state
- payment confirmation
- success state
- failure state
- cash-out state

---

# 58. END-TO-END TEST

Create at least one realistic test path:

```text
Create/connect wallet
↓
Register username
↓
Resolve username
↓
Create payment
↓
Submit Stellar transaction
↓
Verify transaction
↓
Display payment
```

If a live testnet flow cannot run automatically, create integration tests around the transaction verification boundary.

---

# 59. CONTRACT DEPLOYMENT SCRIPTS

Provide scripts for:

```text
build contract
test contract
deploy contract
initialize contract
register demo username
```

The deployment configuration must support testnet.

Do not require manual editing of source code to change contract IDs.

Use environment variables.

Example:

```env
NEXT_PUBLIC_USERNAME_REGISTRY_CONTRACT_ID=
```

---

# 60. CONTRACT ID MANAGEMENT

After deployment, store the contract ID in configuration.

Never scatter contract IDs throughout the frontend.

Create a single configuration source.

---

# 61. CONTRACT CLIENT

Create a dedicated service for contract calls.

Example:

```text
lib/stellar/usernameRegistry.ts
```

Responsibilities:

- register username
- resolve username
- get owner
- transfer username
- get verification state

Do not call contract logic directly from random UI components.

---

# 62. STELLAR SERVICE

Create a central Stellar service.

Responsibilities:

- network config
- asset config
- transaction creation
- transaction submission
- transaction lookup
- transaction verification
- explorer URLs
- contract invocation helpers

---

# 63. WALLET SERVICE

Create an abstraction:

```ts
interface WalletService {
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string | null>;
  signTransaction(...): Promise<...>;
}
```

The UI should not depend directly on a specific wallet vendor.

---

# 64. USERNAME RESOLUTION SERVICE

Create:

```ts
resolveUsername(username)
```

It should:

1. normalize input
2. validate format
3. query Soroban
4. return owner
5. return verification state
6. return existence

---

# 65. PAYMENT SERVICE

Create:

```ts
sendUsdcPayment()
```

It must:

1. resolve username
2. verify destination
3. validate amount
4. construct transaction
5. ask wallet to sign
6. submit
7. return tx hash
8. verify transaction
9. persist indexed result

---

# 66. DO NOT TRUST FRONTEND STATE

The frontend can say:

```text
Payment submitted
```

after receiving a tx hash.

But only the backend/network verification can say:

```text
Payment confirmed
```

Do not let frontend state alone mark a transaction confirmed.

---

# 67. AMOUNT HANDLING

Never use floating-point arithmetic for financial amounts.

Use decimal/string representations appropriate for Stellar asset precision.

Example:

```ts
"150.00"
```

Avoid:

```ts
150.0000000001
```

Do not use JavaScript floating point for monetary comparisons.

---

# 68. INPUT VALIDATION

Validate:

- usernames
- Stellar addresses
- asset codes
- issuer addresses
- amounts
- transaction hashes
- network
- withdrawal IDs

Use a schema validation library.

---

# 69. ACCESS CONTROL

Users may only modify their own:

- profile
- payment notes
- private metadata
- withdrawal records

Do not authorize by trusting:

```text
userId
```

sent from the frontend.

Derive identity from the authenticated wallet/session.

---

# 70. PRIVATE METADATA

Private data belongs in the database.

Examples:

```text
payment note
internal label
private profile information
```

Do not write these to Stellar.

---

# 71. NO CUSTODY

SkylarPay should not custody user funds unless explicitly required.

Preferred architecture:

```text
User wallet
↓
Stellar
↓
Recipient wallet
```

The app coordinates the experience.

It should not create a centralized balance ledger pretending the database owns user funds.

Displayed balances should be derived from the Stellar account or clearly identified as indexed data.

---

# 72. BALANCE

The balance UI should read the actual Stellar account balance.

For USDC:

- identify asset by code + issuer
- do not treat every `USDC` asset as the same
- verify issuer

If the account has no USDC:

```text
0.00 USDC
```

---

# 73. SECURITY PRINCIPLES

Financial actions require extra caution.

Never:

- expose secrets
- fake successful transactions
- trust frontend payment confirmation
- silently change payment destination
- silently change username owner
- fabricate anchor status
- fabricate exchange rates
- fabricate bank payouts
- call testnet mainnet
- call mainnet testnet

---

# 74. DOCUMENTATION

Create:

```text
README.md
```

The README should explain:

1. What SkylarPay is
2. Product architecture
3. Why Stellar
4. Local setup
5. Environment variables
6. Smart contract setup
7. Testnet deployment
8. Database setup
9. Anchor configuration
10. Running tests
11. Running the application
12. Demo flow
13. Known limitations

---

# 75. ARCHITECTURE DOCUMENTATION

Create:

```text
docs/ARCHITECTURE.md
```

Include diagrams using Mermaid where useful.

Example:

```text
User
 ↓
SkylarPay UI
 ↓
Wallet
 ↓
Stellar
 ↓
UsernameRegistry
```

And:

```text
SkylarPay
 ↓
SEP-24
 ↓
Anchor
 ↓
NGN
 ↓
Local payout rail
```

---

# 76. HACKATHON DEMO DOCUMENTATION

Create:

```text
docs/DEMO.md
```

The demo should take approximately 2–3 minutes.

Recommended sequence:

### 1. Claim

Show:

```text
@sam
```

### 2. Verification

Show:

```text
✓ Skylar Verified
```

### 3. Receive

Open:

```text
skylarpay.app/@sam
```

### 4. Pay

From another wallet/user:

```text
$150 USDC
```

### 5. Stellar proof

Show actual transaction.

### 6. Cash out

Open:

```text
Cash Out
→ NGN
→ Anchor
```

### 7. Final message

Show:

> "The blockchain handled the settlement. SkylarPay made it feel like a payment."

---

# 77. PRODUCT COPY RULES

Prefer:

```text
Pay @sam
```

instead of:

```text
Send to wallet address
```

Prefer:

```text
Cash out
```

instead of:

```text
Initiate redemption transaction
```

Prefer:

```text
Confirmed on Stellar
```

instead of:

```text
Horizon transaction successfully indexed
```

Technical details can be available under:

```text
View transaction details
```

The consumer UI should speak human language.

---

# 78. STELLAR EXPLANATION

When explaining Stellar inside the product:

> "Payments settle on Stellar, giving you fast, verifiable on-chain settlement."

Do not make unsupported claims about:

- guaranteed speed
- zero fees
- privacy
- guaranteed liquidity

---

# 79. SMART CONTRACT EXPLANATION

The product may explain:

> "Your @username is registered through a Soroban smart contract."

Do not imply usernames are a native Stellar feature.

SkylarPay owns the username registry.

---

# 80. ANCHOR EXPLANATION

Use:

> "SkylarPay connects to compatible Stellar anchors for local cash-out."

Do not say:

> "Stellar converts your USDC to naira."

The anchor performs the fiat conversion/payout.

---

# 81. RESPONSIVE DESIGN

The app must work on:

- desktop
- mobile
- tablet

Mobile is especially important.

The public payment profile should look excellent on a phone.

The QR screen should work well on both desktop and mobile.

---

# 82. ACCESSIBILITY

Implement:

- keyboard navigation
- visible focus states
- semantic buttons
- readable contrast
- proper form labels
- accessible modal behavior
- useful error messages

---

# 83. PERFORMANCE

Do not unnecessarily ship huge libraries.

Optimize:

- initial bundle
- images
- fonts
- API calls
- Stellar queries

Do not poll aggressively.

Use reasonable intervals for transaction status.

---

# 84. POLLING

For transaction/anchor status:

- use controlled polling
- stop when terminal state is reached
- back off where appropriate
- handle network failures

Never create infinite uncontrolled polling loops.

---

# 85. IDEMPOTENCY

Financial operations must be safe against retries.

If an API request is repeated:

```text
POST /api/withdrawals
```

do not accidentally create two withdrawals.

Use idempotency keys where appropriate.

---

# 86. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

with all required configuration.

Never commit:

```text
.env
```

or secrets.

Include:

```env
STELLAR_NETWORK=
STELLAR_HORIZON_URL=
STELLAR_RPC_URL=
USDC_ASSET_CODE=
USDC_ISSUER=
USERNAME_REGISTRY_CONTRACT_ID=
ANCHOR_HOME_DOMAIN=
ANCHOR_TRANSFER_SERVER=
ANCHOR_PROTOCOL=
ANCHOR_ASSET_CODE=
ANCHOR_ASSET_ISSUER=
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEMO_MODE=
```

Adapt names to the actual stack.

---

# 87. NO FAKE INTEGRATIONS

This is critical.

Do not create fake code that merely looks like:

```ts
stellar.sendPayment()
```

if it does not actually submit a Stellar transaction.

Do not create fake:

- wallet signing
- Soroban contract calls
- transaction hashes
- anchor responses
- exchange rates
- bank payouts

If an external dependency cannot be configured yet:

1. create a clean adapter
2. provide a clearly marked mock implementation for development
3. document exactly what remains
4. ensure production mode refuses to pretend

---

# 88. EXTERNAL DOCUMENTATION

When implementing Stellar functionality, consult current official Stellar documentation rather than relying on memory.

Primary references:

- Stellar developer documentation
- Soroban documentation
- Stellar SDK documentation
- SEP specifications
- Anchor Platform documentation

Current Stellar documentation confirms Soroban contracts are Rust/Wasm-based and that the Stellar CLI supports building/testing/deploying contracts.

For off-ramp functionality, follow current SEP-24/SEP-10 requirements for the selected provider.

---

# 89. DO NOT OVER-ENGINEER

This is a hackathon project.

Do not add:

- social feeds
- token launches
- NFTs
- staking
- trading
- chat
- DAO governance
- unnecessary AI
- complicated referral systems
- unnecessary microservices

unless explicitly requested.

The MVP should be excellent at:

```text
username
→ payment
→ Stellar proof
→ cash out
```

---

# 90. BUILD PRIORITY

Priority order:

### P0

- project setup
- Stellar connection
- Soroban UsernameRegistry
- username registration
- username resolution
- payment profile
- USDC payment
- transaction verification
- dashboard
- receive
- send
- payment history

### P1

- verification
- QR code
- payment links
- private payment notes
- explorer links
- transaction states

### P2

- SEP-24 anchor integration
- cash-out UI
- withdrawal status
- NGN configuration
- anchor provider abstraction

### P3

- polish
- animations
- accessibility
- advanced error handling
- demo tooling
- documentation

Do not delay the core payment flow for cosmetic work.

---

# 91. CODEx EXECUTION RULES

When working on the repository:

1. Inspect the repository before changing anything.
2. Read existing package configuration.
3. Read existing README.
4. Read existing environment files/example files.
5. Do not overwrite existing work blindly.
6. Preserve useful existing code.
7. Prefer incremental commits/changes.
8. Run tests after meaningful changes.
9. Run type checking.
10. Run linting.
11. Build the application before declaring completion.
12. Fix errors instead of hiding them.
13. Never silently remove functionality.
14. Keep architecture simple.

---

# 92. BEFORE IMPLEMENTATION

First inspect:

```text
package.json
tsconfig.json
next.config.*
src/
app/
components/
lib/
contracts/
scripts/
tests/
README.md
.env.example
```

Determine whether the repository is:

- empty
- partially initialized
- an existing Next.js app
- another framework

Then adapt rather than blindly recreating the project.

---

# 93. PHASED EXECUTION

Codex should execute the project in these phases.

## Phase 0 — Repository audit

Determine:

- existing stack
- package manager
- current dependencies
- existing routes
- existing database
- existing Stellar integration
- existing wallet integration

Output a short internal implementation plan before making large changes.

---

## Phase 1 — Foundation

Build:

- application shell
- design system
- routing
- environment configuration
- Stellar configuration
- database
- base services
- error handling

Then run:

```text
lint
typecheck
test
build
```

---

## Phase 2 — Soroban UsernameRegistry

Build:

- Rust contract
- contract tests
- deployment scripts
- client wrapper
- registration
- resolution
- ownership
- transfer
- verification state

Test thoroughly.

---

## Phase 3 — Payment Identity

Build:

- claim username page
- public profile
- dashboard
- verification badge
- payment URL
- QR

---

## Phase 4 — Stellar USDC Payments

Build:

- send flow
- receive flow
- transaction construction
- wallet signing
- transaction submission
- backend verification
- payment history
- explorer links

Use actual Stellar testnet transactions.

---

## Phase 5 — Cash Out

Build:

- anchor adapter
- SEP-24 discovery/configuration
- withdrawal creation
- hosted interactive flow
- withdrawal tracking
- status state machine
- NGN display where supported

If no real provider is configured, implement the adapter and a clearly labeled demo provider.

Do not fake a real payout.

---

## Phase 6 — UX Polish

Improve:

- responsive layout
- loading states
- error states
- success states
- animations
- mobile UX
- accessibility
- typography
- visual hierarchy

---

## Phase 7 — Testing

Run:

```text
unit tests
contract tests
integration tests
E2E tests
lint
typecheck
production build
```

Fix all critical failures.

---

## Phase 8 — Demo Readiness

Verify the complete path:

```text
connect wallet
→ claim @sam
→ verification
→ share profile
→ another wallet pays
→ Stellar transaction confirms
→ payment appears
→ open transaction explorer
→ cash out
→ anchor flow
→ status shown
```

No fake transaction should appear in the real flow.

---

# 94. DEFINITION OF DONE

SkylarPay is not considered complete until:

## Product

- [ ] Landing page works
- [ ] User can connect wallet
- [ ] User can claim username
- [ ] Username resolves
- [ ] Public profile works
- [ ] Payment link works
- [ ] QR works
- [ ] USDC payment works
- [ ] Payment confirmation works
- [ ] Payment history works
- [ ] Verification UI works
- [ ] Cash-out UI works

## Stellar

- [ ] Soroban contract exists
- [ ] Contract tested
- [ ] Contract deployed to testnet
- [ ] Contract ID configured
- [ ] Username registration is on-chain
- [ ] Username resolution is on-chain
- [ ] USDC payment uses real Stellar transaction
- [ ] Transaction verification works
- [ ] Explorer links work

## Off-ramp

- [ ] Anchor adapter exists
- [ ] SEP-24 flow implemented if provider supports it
- [ ] Provider configuration is environment-driven
- [ ] Withdrawal statuses are tracked
- [ ] NGN availability is provider-dependent
- [ ] No fake bank payout is shown

## Security

- [ ] No secrets committed
- [ ] No secret keys in frontend
- [ ] Input validation exists
- [ ] Payment verification exists
- [ ] Duplicate transactions prevented
- [ ] Withdrawal idempotency exists
- [ ] Unauthorized username actions rejected

## Engineering

- [ ] Tests pass
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Production build passes
- [ ] README exists
- [ ] Architecture docs exist
- [ ] Demo docs exist
- [ ] `.env.example` exists

---

# 95. FINAL QUALITY BAR

The finished application should feel like a real consumer payment product.

A judge should be able to understand the product in less than 30 seconds:

```text
This is a Stellar payment app.

Instead of sending a long wallet address,
I send @sam.

Someone pays me USDC.

The payment settles on Stellar.

Then I can cash out locally.
```

The product's strongest differentiator is not adding more features.

It is making the existing flow extremely simple.

The winning experience should communicate:

> **People understand usernames. They shouldn't have to understand addresses.**

And:

> **The blockchain handles the settlement. SkylarPay handles the experience.**

