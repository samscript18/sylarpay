import {
  StellarToml,
  WebAuth,
  TransactionBuilder,
  Transaction,
} from "@stellar/stellar-sdk";
import { getConfig } from "@/lib/config";
import { AppError, log } from "./http";
import { db } from "./db";
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
}
export interface WithdrawalSession {
  id: string;
  status: WithdrawalStatus;
  interactiveUrl?: string;
  demo: boolean;
  amount: string;
  currency: string;
  provider: string;
  anchorId?: string;
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
  const r = await fetch(https(url), {
    ...options,
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!r.ok)
    throw new AppError("Cash out provider is temporarily unavailable.", 503);
  return r.json();
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
    const supported = Boolean(info.withdraw?.[c.assetCode]?.enabled);
    let currencies = (process.env.ANCHOR_SUPPORTED_FIAT || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (d.quotes) {
      const q = await anchorFetch(`${d.quotes}/info`);
      const fiat = (q.assets || [])
        .filter((a: { asset: string }) => a.asset.startsWith("iso4217:"))
        .map((a: { asset: string }) => a.asset.slice(8));
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
    const form = new FormData();
    for (const [k, v] of Object.entries({
      asset_code: c.assetCode,
      asset_issuer: c.issuer,
      account: p.account,
      amount: p.amount,
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
  async getWithdrawalStatus(id: string, token?: string) {
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
interface WithdrawalRow {
  id: string;
  account: string;
  amount: string;
  currency: string;
  provider: string;
  status: WithdrawalStatus;
  anchorId: string | null;
  interactiveUrl: string | null;
  token: string | null;
  demo: number;
}
export function publicWithdrawal(r: WithdrawalRow): WithdrawalSession {
  return {
    id: r.id,
    amount: r.amount,
    currency: r.currency,
    provider: r.provider,
    status: r.status,
    anchorId: r.anchorId || undefined,
    interactiveUrl: r.interactiveUrl || undefined,
    demo: Boolean(r.demo),
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
    existing = db()
      .prepare(
        "SELECT * FROM withdrawals WHERE account=? AND network=? AND idem=?",
      )
      .get(account, c.network, p.idempotencyKey) as WithdrawalRow | undefined;
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
  const token =
    adapter instanceof Sep24Provider && p.signed
      ? await adapter.authenticate(account, p.signed)
      : undefined;
  const id = randomUUID(),
    now = new Date().toISOString();
  // Reserve before calling the provider: retries never create a second external withdrawal.
  const reservation = db()
    .prepare(
      "INSERT OR IGNORE INTO withdrawals(id,account,network,idem,amount,currency,provider,status,demo,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      account,
      c.network,
      p.idempotencyKey,
      p.amount,
      p.currency,
      info.name,
      "CREATED",
      info.demo ? 1 : 0,
      now,
      now,
    );
  if (!reservation.changes)
    throw new AppError(
      "Withdrawal request already in progress. Check status before retrying.",
      409,
    );
  try {
    const session = await adapter.startWithdrawal({
      account,
      amount: p.amount,
      currency: p.currency,
      token,
    });
    db()
      .prepare(
        "UPDATE withdrawals SET anchorId=?,interactiveUrl=?,token=?,status=?,updatedAt=? WHERE id=?",
      )
      .run(
        session.id,
        session.url,
        token || null,
        "AWAITING_KYC",
        new Date().toISOString(),
        id,
      );
    log("withdrawal_created", { demo: info.demo });
  } catch (e) {
    db()
      .prepare("UPDATE withdrawals SET status='FAILED',updatedAt=? WHERE id=?")
      .run(new Date().toISOString(), id);
    throw e;
  }
  return publicWithdrawal(
    db()
      .prepare("SELECT * FROM withdrawals WHERE id=?")
      .get(id) as WithdrawalRow,
  );
}
export async function withdrawalStatus(account: string, id: string) {
  const row = db()
    .prepare("SELECT * FROM withdrawals WHERE id=? AND account=? AND network=?")
    .get(id, account, getConfig().network) as WithdrawalRow | undefined;
  if (!row) throw new AppError("Withdrawal not found.", 404);
  if (
    ["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(row.status) ||
    !row.anchorId
  )
    return publicWithdrawal(row);
  const adapter = row.demo ? new DemoOffRamp() : new Sep24Provider();
  const result = await adapter.getWithdrawalStatus(
    row.anchorId,
    row.token || undefined,
  );
  db()
    .prepare("UPDATE withdrawals SET status=?,updatedAt=? WHERE id=?")
    .run(result.status, new Date().toISOString(), id);
  log("withdrawal_status_updated", {
    status: result.status,
    demo: Boolean(row.demo),
  });
  return { ...publicWithdrawal({ ...row, status: result.status }), ...result };
}
