import {
  Asset,
  Horizon,
  TransactionBuilder,
  Operation,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { getConfig } from "@/lib/config";
import { AppError } from "./http";
import { units } from "@/lib/validation";
export async function horizon() {
  const c = getConfig();
  const s = new Horizon.Server(c.horizon);
  const root = await s.root();
  if (root.network_passphrase !== c.passphrase)
    throw new AppError("Stellar endpoint network mismatch.", 503);
  return s;
}
export async function balance(account: string) {
  const c = getConfig(),
    s = await horizon();
  try {
    const a = await s.loadAccount(account);
    const b = a.balances.find(
      (v) =>
        v.asset_type !== "native" &&
        "asset_code" in v &&
        v.asset_code === c.assetCode &&
        v.asset_issuer === c.issuer,
    );
    return b?.balance || "0.0000000";
  } catch (e) {
    if (
      e instanceof Error &&
      "response" in e &&
      (e.response as { status?: number })?.status === 404
    )
      throw new AppError(
        "Your Stellar account needs testnet funding before continuing.",
        409,
      );
    throw e;
  }
}
export async function preparePayment(
  sender: string,
  destination: string,
  amount: string,
) {
  const c = getConfig(),
    s = await horizon();
  const [source, recipient] = await Promise.all([
    s.loadAccount(sender),
    s.loadAccount(destination),
  ]);
  const available = source.balances.find(
    (v) =>
      "asset_code" in v &&
      v.asset_code === c.assetCode &&
      v.asset_issuer === c.issuer,
  );
  if (
    !available ||
    units(available.balance) -
      units(
        ("selling_liabilities" in available
          ? available.selling_liabilities
          : undefined) || "0",
      ) <
      units(amount)
  )
    throw new AppError("Insufficient USDC balance.");
  const trust = recipient.balances.find(
    (v) =>
      "asset_code" in v &&
      v.asset_code === c.assetCode &&
      v.asset_issuer === c.issuer,
  );
  if (!trust)
    throw new AppError(
      "Recipient needs a trustline for the configured USDC asset.",
    );
  if ("is_authorized" in trust && trust.is_authorized === false)
    throw new AppError("Recipient USDC trustline is not authorized.");
  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: c.passphrase,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: new Asset(c.assetCode, c.issuer),
        amount,
      }),
    )
    .setTimeout(180)
    .build()
    .toXDR();
}
