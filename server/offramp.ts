import {
  StellarToml,
  WebAuth,
  TransactionBuilder,
  Transaction,
} from "@stellar/stellar-sdk";
import { amountSchema, units } from "@/lib/validation";
import { getConfig } from "@/lib/config";
import { AppError, log } from "./http";
import { db, duplicateKey, WithdrawalRecord } from "./db";
import { randomUUID } from "node:crypto";
export type WithdrawalStatus =
  | "CREATED"
  | "AWAITING_KYC"
  | "AWAITING_USER_TRANSFER"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";
export interface AnchorInfo {
  name: string;
  demo: boolean;
  available: boolean;
  currencies: string[];
  assetCode: string;
  authentication?: boolean;
  minAmount?: string;
  maxAmount?: string;
  simulatedFiat?: boolean;
}
export interface WithdrawalSession {
  id: string;
  status: WithdrawalStatus;
  interactiveUrl?: string;
  interactiveUrlExpired?: boolean;
  providerAccessExpired?: boolean;
  moreInfoUrl?: string;
  demo: boolean;
  simulatedFiat?: boolean;
  amount: string;
  currency: string;
  provider: string;
  anchorId?: string;
  fundingHash?: string;
  amountIn?: string;
  amountOut?: string;
  amountFee?: string;
  withdrawalAccount?: string;
  withdrawalMemo?: string;
  withdrawalMemoType?: string;
}
export interface OffRampProvider {
  getInfo(): Promise<AnchorInfo>;
  startWithdrawal(params: {
    account: string;
    amount: string;
    currency: string;
    token?: string;
  }): Promise<{ id: string; url: string }>;
  getWithdrawalStatus(
    transactionId: string,
    token?: string,
  ): Promise<{
    status: WithdrawalStatus;
    amountIn?: string;
    amountOut?: string;
    amountOutAsset?: string;
    moreInfoUrl?: string;
    amountFee?: string;
    withdrawalAccount?: string;
    withdrawalMemo?: string;
    withdrawalMemoType?: string;
  }>;
}
export function mapStatus(s: string): WithdrawalStatus {
  const states: Record<string, WithdrawalStatus> = {
    incomplete: "AWAITING_KYC",
    pending_user_transfer_start: "AWAITING_USER_TRANSFER",
    pending_user_transfer_complete: "PENDING",
    pending_external: "PROCESSING",
    pending_anchor: "PROCESSING",
    pending_stellar: "PROCESSING",
    pending_trust: "PENDING",
    pending_user: "AWAITING_KYC",
    pending_customer_info_update: "AWAITING_KYC",
    pending_transaction_info_update: "AWAITING_KYC",
    completed: "COMPLETED",
    error: "FAILED",
    expired: "EXPIRED",
    no_market: "FAILED",
    too_small: "FAILED",
    too_large: "FAILED",
    refunded: "CANCELLED",
  };
  if (!states[s])
    throw new AppError(
      "Anchor returned an unsupported withdrawal status.",
      502,
    );
  return states[s];
}
const https = (s: string) => {
  if (new URL(s).protocol !== "https:")
    throw new AppError("Anchor endpoints must use HTTPS.", 503);
  return s.replace(/\/$/, "");
};
async function anchorFetch(url: string, options?: RequestInit) {
  let r: Response;
  try {
    r = await fetch(https(url), {
      ...options,
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
  } catch {
    throw new AppError(
      "Provider response unavailable. Check the existing withdrawal before retrying.",
      503,
      options?.method === "POST"
        ? "ANCHOR_RESPONSE_LOST"
        : "ANCHOR_UNAVAILABLE",
    );
  }
  if (
    (r.status === 401 || r.status === 403) &&
    options?.headers &&
    options.method !== "POST"
  )
    throw new AppError(
      "Provider access expired. Refresh provider access with your wallet to check this existing withdrawal.",
      401,
      "ANCHOR_AUTH_EXPIRED",
    );
  if (!r.ok)
    throw new AppError(
      "Cash out provider is temporarily unavailable.",
      503,
      options?.method === "POST" && r.status >= 500
        ? "ANCHOR_RESPONSE_LOST"
        : "ANCHOR_UNAVAILABLE",
    );
  try {
    return await r.json();
  } catch {
    throw new AppError(
      "Provider returned an unreadable response.",
      502,
      options?.method === "POST"
        ? "ANCHOR_RESPONSE_LOST"
        : "ANCHOR_UNAVAILABLE",
    );
  }
}
export class Sep24Provider implements OffRampProvider {
  async discover() {
    const c = getConfig();
    const home = process.env.ANCHOR_HOME_DOMAIN;
    if (!home)
      throw new AppError("No compatible cash-out provider is configured.", 503);
    if (
      process.env.ANCHOR_NETWORK !== c.network ||
      process.env.ANCHOR_ASSET_CODE !== c.assetCode ||
      process.env.ANCHOR_ASSET_ISSUER !== c.issuer ||
      process.env.ANCHOR_PROTOCOL !== "SEP24"
    )
      throw new AppError(
        "Anchor configuration does not match the Stellar network and asset.",
        503,
      );
    if (!/^[a-z0-9.-]+$/i.test(home))
      throw new AppError("Invalid anchor home domain.", 503);
    const toml = await StellarToml.Resolver.resolve(home);
    if (toml.NETWORK_PASSPHRASE && toml.NETWORK_PASSPHRASE !== c.passphrase)
      throw new AppError("Anchor reports a different network.", 503);
    if (
      Array.isArray(toml.CURRENCIES) &&
      !toml.CURRENCIES.some(
        (asset) => asset.code === c.assetCode && asset.issuer === c.issuer,
      )
    )
      throw new AppError(
        "Anchor does not advertise the configured asset issuer.",
        503,
      );
    if (process.env.ANCHOR_SIMULATED_FIAT === "true" && c.network !== "testnet")
      throw new AppError("Simulated fiat is only supported on Testnet.", 503);
    const server = https(
      process.env.ANCHOR_TRANSFER_SERVER ||
        String(toml.TRANSFER_SERVER_SEP0024 || ""),
    );
    return {
      home,
      server,
      auth: https(String(toml.WEB_AUTH_ENDPOINT || "")),
      signingKey: String(toml.SIGNING_KEY || ""),
      quotes: toml.ANCHOR_QUOTE_SERVER
        ? https(String(toml.ANCHOR_QUOTE_SERVER))
        : undefined,
    };
  }
  async getInfo(): Promise<AnchorInfo> {
    const c = getConfig(),
      d = await this.discover();
    const info = await anchorFetch(`${d.server}/info`);
    const asset = info.withdraw?.[c.assetCode];
    const supported = Boolean(asset?.enabled);
    const simulatedFiat = process.env.ANCHOR_SIMULATED_FIAT === "true";
    let currencies = (process.env.ANCHOR_SUPPORTED_FIAT || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (d.quotes) {
      const q = await anchorFetch(`${d.quotes}/info`);
      const assets: { asset: string }[] = q.assets || [];
      if (
        assets.some((a) => a.asset.startsWith("stellar:")) &&
        !assets.some((a) => a.asset === `stellar:${c.assetCode}:${c.issuer}`)
      )
        throw new AppError(
          "Anchor quote assets do not include the configured USDC issuer.",
          503,
        );
      const fiat = assets
        .filter((a: { asset: string }) => a.asset.startsWith("iso4217:"))
        .map((a: { asset: string }) => a.asset.slice(8));
      // Simulation labels fiat settlement; it does not extend provider support.
      currencies = currencies.filter((v) => fiat.includes(v));
    }
    log("anchor_initialized", { available: supported });
    return {
      name: process.env.ANCHOR_NAME || d.home,
      demo: false,
      available: supported,
      currencies,
      assetCode: c.assetCode,
      authentication: true,
      minAmount:
        asset?.min_amount == null ? undefined : String(asset.min_amount),
      maxAmount:
        asset?.max_amount == null ? undefined : String(asset.max_amount),
      simulatedFiat,
    };
  }
  async challenge(account: string) {
    const c = getConfig(),
      d = await this.discover();
    const result = await anchorFetch(
      `${d.auth}?${new URLSearchParams({ account, home_domain: d.home })}`,
    );
    if (result.network_passphrase !== c.passphrase)
      throw new AppError("Anchor authentication network mismatch.");
    const checked = WebAuth.readChallengeTx(
      result.transaction,
      d.signingKey,
      c.passphrase,
      d.home,
      new URL(d.auth).host,
    );
    if (checked.clientAccountID !== account)
      throw new AppError("Anchor authentication account mismatch.");
    return { xdr: result.transaction };
  }
  async authenticate(account: string, signed: string) {
    const c = getConfig(),
      d = await this.discover();
    const checked = WebAuth.readChallengeTx(
      signed,
      d.signingKey,
      c.passphrase,
      d.home,
      new URL(d.auth).host,
    );
    if (checked.clientAccountID !== account)
      throw new AppError("Anchor authentication account mismatch.");
    const tx = TransactionBuilder.fromXDR(signed, c.passphrase);
    if (!(tx instanceof Transaction))
      throw new AppError("Invalid authentication transaction.");
    WebAuth.verifyChallengeTxSigners(
      signed,
      d.signingKey,
      c.passphrase,
      [account],
      d.home,
      new URL(d.auth).host,
    );
    const result = await anchorFetch(d.auth, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: signed }),
    });
    if (typeof result.token !== "string")
      throw new AppError("Anchor did not authenticate this wallet.");
    return result.token as string;
  }
  async startWithdrawal(p: {
    account: string;
    amount: string;
    currency: string;
    token?: string;
  }) {
    if (!p.token)
      throw new AppError("Authenticate with the anchor to continue.", 401);
    const d = await this.discover(),
      c = getConfig();
    const info = await this.getInfo();
    if (!info.available || !info.currencies.includes(p.currency))
      throw new AppError(
        `${p.currency} cash out is not available with this provider.`,
      );
    validateWithdrawalAmount(p.amount, info);
    const form = new FormData();
    for (const [k, v] of Object.entries({
      asset_code: c.assetCode,
      asset_issuer: c.issuer,
      account: p.account,
      amount: p.amount,
      destination_asset: `iso4217:${p.currency}`,
    }))
      form.set(k, v);
    const r = await anchorFetch(
      `${d.server}/transactions/withdraw/interactive`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${p.token}` },
        body: form,
      },
    );
    if (
      r.type !== "interactive_customer_info_needed" ||
      typeof r.id !== "string" ||
      typeof r.url !== "string"
    )
      throw new AppError(
        "Anchor returned an invalid interactive session.",
        502,
      );
    return { id: r.id, url: https(r.url) };
  }
  async getWithdrawalStatus(
    id: string,
    token?: string,
  ): ReturnType<OffRampProvider["getWithdrawalStatus"]> {
    if (!token)
      throw new AppError(
        "Anchor authentication expired. Reauthenticate to check status.",
        401,
      );
    const d = await this.discover();
    const r = await anchorFetch(
      `${d.server}/transaction?${new URLSearchParams({ id })}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (
      r.transaction?.amount_in_asset &&
      r.transaction.amount_in_asset !==
        `stellar:${getConfig().assetCode}:${getConfig().issuer}`
    )
      throw new AppError(
        "Anchor requested an asset different from configured USDC.",
        502,
      );
    if (r.transaction?.id !== id)
      throw new AppError("Anchor transaction mismatch.", 502);
    return {
      status: mapStatus(r.transaction.status),
      amountIn: r.transaction.amount_in,
      amountOut: r.transaction.amount_out,
      amountOutAsset: r.transaction.amount_out_asset,
      moreInfoUrl: r.transaction.more_info_url
        ? https(r.transaction.more_info_url)
        : undefined,
      amountFee: r.transaction.amount_fee,
      withdrawalAccount: r.transaction.withdraw_anchor_account,
      withdrawalMemo: r.transaction.withdraw_memo,
      withdrawalMemoType: r.transaction.withdraw_memo_type,
    };
  }
}
export class DemoOffRamp implements OffRampProvider {
  async getInfo(): Promise<AnchorInfo> {
    if (!getConfig().demo)
      throw new AppError("Demo Off-Ramp is disabled.", 503);
    return {
      name: "Demo Off-Ramp",
      demo: true,
      available: true,
      currencies: ["NGN"],
      assetCode: getConfig().assetCode,
    };
  }
  async startWithdrawal() {
    await this.getInfo();
    return { id: `demo-${randomUUID()}`, url: "/cash-out/demo" };
  }
  async getWithdrawalStatus() {
    await this.getInfo();
    return { status: "PROCESSING" as const };
  }
}
export function provider(): OffRampProvider {
  if (process.env.ANCHOR_HOME_DOMAIN) return new Sep24Provider();
  if (getConfig().demo) return new DemoOffRamp();
  return {
    async getInfo() {
      return {
        name: "No provider configured",
        demo: false,
        available: false,
        currencies: [],
        assetCode: getConfig().assetCode,
      };
    },
    async startWithdrawal() {
      throw new AppError("Cash out is currently unavailable.", 503);
    },
    async getWithdrawalStatus() {
      throw new AppError("Cash out is currently unavailable.", 503);
    },
  };
}
type WithdrawalRow = WithdrawalRecord;
export function publicWithdrawal(r: WithdrawalRow): WithdrawalSession {
  return {
    id: r.id,
    amount: r.amount,
    currency: r.currency,
    provider: r.provider,
    status: r.status,
    anchorId: r.anchorId || undefined,
    interactiveUrl: r.interactiveUrl || undefined,
    interactiveUrlExpired: !r.demo && hostedLinkExpired(r.interactiveUrl),
    demo: Boolean(r.demo),
    simulatedFiat: Boolean(r.simulatedFiat),
    fundingHash: r.fundingHash || undefined,
  };
}
export async function createWithdrawal(
  account: string,
  p: {
    amount: string;
    currency: string;
    idempotencyKey: string;
    signed?: string;
  },
) {
  const c = getConfig(),
    { Withdrawal } = await db();
  const existing = await Withdrawal.findOne({
    account,
    network: c.network,
    idem: p.idempotencyKey,
  }).lean();
  if (existing) {
    if (existing.amount !== p.amount || existing.currency !== p.currency)
      throw new AppError(
        "Idempotency key already used for a different withdrawal.",
        409,
      );
    return publicWithdrawal(existing);
  }
  const adapter = provider(),
    info = await adapter.getInfo();
  if (!info.available || !info.currencies.includes(p.currency))
    throw new AppError(
      `${p.currency} cash out is not available with this provider.`,
    );
  validateWithdrawalAmount(p.amount, info);
  const token =
    adapter instanceof Sep24Provider && p.signed
      ? await adapter.authenticate(account, p.signed)
      : undefined;
  const id = randomUUID(),
    now = new Date().toISOString();
  // Reserve before calling the provider: retries never create a second external withdrawal.
  try {
    await Withdrawal.create({
      id,
      account,
      network: c.network,
      idem: p.idempotencyKey,
      amount: p.amount,
      currency: p.currency,
      provider: info.name,
      status: "CREATED",
      demo: info.demo ? 1 : 0,
      simulatedFiat: Boolean(info.simulatedFiat),
      createdAt: now,
      updatedAt: now,
    });
  } catch (e) {
    if (!duplicateKey(e)) throw e;
    throw new AppError(
      "Withdrawal request already in progress. Check status before retrying.",
      409,
    );
  }
  try {
    const session = await adapter.startWithdrawal({
      account,
      amount: p.amount,
      currency: p.currency,
      token,
    });
    await Withdrawal.updateOne(
      { id },
      {
        $set: {
          anchorId: session.id,
          interactiveUrl: session.url,
          token: token || null,
          status: "AWAITING_KYC",
          updatedAt: new Date().toISOString(),
        },
      },
    );
    log("withdrawal_created", { demo: info.demo });
  } catch (e) {
    const uncertain =
      adapter instanceof Sep24Provider &&
      e instanceof AppError &&
      e.code === "ANCHOR_RESPONSE_LOST";
    await Withdrawal.updateOne(
      { id },
      {
        $set: {
          status: uncertain ? "CREATED" : "FAILED",
          updatedAt: new Date().toISOString(),
        },
      },
    );
    if (uncertain)
      throw new AppError(
        `Provider initiation response lost. Retry the same request to restore withdrawal ${id}; do not create a new withdrawal or send USDC until the provider session is reconciled.`,
        503,
        "ANCHOR_RESPONSE_LOST",
      );
    throw e;
  }
  return publicWithdrawal((await Withdrawal.findOne({ id }).lean())!);
}
export async function withdrawalStatus(account: string, id: string) {
  const { Withdrawal } = await db();
  const row = await Withdrawal.findOne({
    id,
    account,
    network: getConfig().network,
  }).lean();
  if (!row) throw new AppError("Withdrawal not found.", 404);
  if (
    ["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(row.status) ||
    !row.anchorId
  )
    return publicWithdrawal(row);
  const adapter: OffRampProvider = row.demo
    ? new DemoOffRamp()
    : new Sep24Provider();
  let result: Awaited<ReturnType<OffRampProvider["getWithdrawalStatus"]>>;
  try {
    result = await adapter.getWithdrawalStatus(
      row.anchorId,
      row.token || undefined,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "ANCHOR_AUTH_EXPIRED")
      return { ...publicWithdrawal(row), providerAccessExpired: true };
    throw e;
  }
  if (
    result.amountOutAsset &&
    result.amountOutAsset !== `iso4217:${row.currency}`
  )
    throw new AppError(
      `Provider payout asset does not match the selected currency (${row.currency}). The partner reports ${result.amountOutAsset}. Do not fund this withdrawal; review it with the partner.`,
      409,
    );
  await Withdrawal.updateOne(
    { id, status: { $nin: ["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"] } },
    { $set: { status: result.status, updatedAt: new Date().toISOString() } },
  );
  const current = (await Withdrawal.findOne({ id }).lean())!;
  log("withdrawal_status_updated", {
    status: result.status,
    demo: Boolean(row.demo),
  });
  return { ...publicWithdrawal(current), ...result, status: current.status };
}

export function validateWithdrawalAmount(amount: string, info: AnchorInfo) {
  amountSchema.parse(amount);
  if (info.minAmount && units(amount) < units(info.minAmount))
    throw new AppError(`Minimum withdrawal is ${info.minAmount} USDC.`);
  if (info.maxAmount && units(amount) > units(info.maxAmount))
    throw new AppError(`Maximum withdrawal is ${info.maxAmount} USDC.`);
}

// Expiry is a navigation hint only. The provider remains the authentication authority.
export function hostedLinkExpired(link?: string | null) {
  if (!link) return false;
  try {
    const url = new URL(link);
    for (const name of ["token", "session_token"]) {
      const token = url.searchParams.get(name);
      if (token === "undefined" || token === "null" || token === "")
        return true;
      if (!token) continue;
      const parts = token.split(".");
      if (parts.length !== 3) continue;
      try {
        const claims = JSON.parse(
          Buffer.from(parts[1], "base64url").toString(),
        );
        if (
          typeof claims.exp === "number" &&
          claims.exp <= Math.floor(Date.now() / 1000)
        )
          return true;
      } catch {
        /* Opaque tokens remain provider-controlled; do not assume expiry. */
      }
    }
  } catch {
    return true;
  }
  return false;
}
export async function refreshWithdrawalAccess(
  account: string,
  id: string,
  signed: string,
) {
  const { Withdrawal } = await db(),
    c = getConfig();
  const row = await Withdrawal.findOne({
    id,
    account,
    network: c.network,
  }).lean();
  if (!row) throw new AppError("Withdrawal not found.", 404);
  if (row.demo || !row.anchorId)
    throw new AppError("No existing provider session to reconnect.");
  if (["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(row.status))
    throw new AppError("This withdrawal is already closed.", 409);
  if (
    row.provider !== (process.env.ANCHOR_NAME || process.env.ANCHOR_HOME_DOMAIN)
  )
    throw new AppError(
      "Restore the original withdrawal provider configuration before reconnecting.",
      409,
    );
  const token = await new Sep24Provider().authenticate(account, signed);
  await Withdrawal.updateOne(
    { id, account, network: c.network },
    { $set: { token, updatedAt: new Date().toISOString() } },
  );
  return withdrawalStatus(account, id);
}
