import { Networks, StrKey } from "@stellar/stellar-sdk";
export type StellarNetwork = "testnet" | "mainnet";
export interface AppConfig {
  network: StellarNetwork;
  passphrase: string;
  horizon: string;
  rpc: string;
  assetCode: string;
  issuer: string;
  contractId: string;
  appUrl: string;
  demo: boolean;
}
export function getConfig(): AppConfig {
  const network = process.env.STELLAR_NETWORK || "testnet";
  if (network !== "testnet" && network !== "mainnet")
    throw new Error("STELLAR_NETWORK must be testnet or mainnet.");
  const defaults =
    network === "testnet"
      ? {
          horizon: "https://horizon-testnet.stellar.org",
          rpc: "https://soroban-testnet.stellar.org",
          issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        }
      : {
          horizon: "https://horizon.stellar.org",
          rpc: "https://soroban.stellar.org",
          issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        };
  const issuer = process.env.USDC_ISSUER || defaults.issuer;
  if (!StrKey.isValidEd25519PublicKey(issuer))
    throw new Error("Invalid USDC issuer configuration.");
  const opposite =
    network === "testnet"
      ? "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
      : "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  if (issuer === opposite)
    throw new Error("USDC issuer belongs to the other network.");
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (demo && (network !== "testnet" || process.env.NODE_ENV === "production"))
    throw new Error("Demo Off-Ramp is only available in testnet development.");
  const horizon = process.env.STELLAR_HORIZON_URL || defaults.horizon;
  const rpc = process.env.STELLAR_RPC_URL || defaults.rpc;
  for (const url of [horizon, rpc]) {
    if (new URL(url).protocol !== "https:")
      throw new Error("Stellar endpoints must use HTTPS.");
  }
  const contractId = process.env.USERNAME_REGISTRY_CONTRACT_ID || "";
  if (contractId && !StrKey.isValidContract(contractId))
    throw new Error("Invalid username registry contract ID.");
  if (contractId && process.env.USERNAME_REGISTRY_NETWORK !== network)
    throw new Error("Registry network must match STELLAR_NETWORK.");
  const assetCode = process.env.USDC_ASSET_CODE || "USDC";
  if (!/^[A-Za-z0-9]{1,12}$/.test(assetCode))
    throw new Error("Invalid asset code configuration.");
  return {
    network,
    passphrase: Networks[network === "testnet" ? "TESTNET" : "PUBLIC"],
    horizon,
    rpc,
    issuer,
    assetCode,
    contractId,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    demo,
  };
}
export function explorer(network: StellarNetwork, hash: string) {
  if (!/^[a-f0-9]{64}$/.test(hash))
    throw new Error("Invalid transaction hash.");
  return `https://stellar.expert/explorer/${network === "mainnet" ? "public" : "testnet"}/tx/${hash}`;
}
