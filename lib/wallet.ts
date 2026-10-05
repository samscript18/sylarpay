import * as freighter from "@stellar/freighter-api";
import type { AppConfig } from "./config";
export interface WalletService {
  connect(config: AppConfig): Promise<string>;
  disconnect(): Promise<void>;
  getAddress(config?: AppConfig): Promise<string | null>;
  signTransaction(xdr: string, config: AppConfig): Promise<string>;
}
let address: string | null = null;
export function walletRequest<T>(
  request: Promise<T>,
  message: string,
  milliseconds = 60000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([request, timeout]).finally(() => clearTimeout(timer));
}
const responseTimeout =
  "Freighter did not respond. Unlock the extension, check its pending request, and try again.";

export const wallet: WalletService = {
  async connect(config) {
    const available = await walletRequest(
      freighter.isConnected(),
      responseTimeout,
      4000,
    );
    if (available.error || !available.isConnected)
      throw new Error(
        "Install and unlock Freighter to connect your Stellar wallet.",
      );
    const r = await walletRequest(
      freighter.requestAccess(),
      "Wallet access timed out. Open Freighter and retry the connection.",
    );
    if (r.error || !r.address)
      throw new Error(
        r.error?.message ||
          "Install and unlock Freighter to connect your Stellar wallet.",
      );
    const n = await walletRequest(
      freighter.getNetworkDetails(),
      responseTimeout,
      5000,
    );
    if (n.error || n.networkPassphrase !== config.passphrase)
      throw new Error(
        `Switch Freighter to Stellar ${config.network} and reconnect.`,
      );
    address = r.address;
    return address;
  },
  async disconnect() {
    address = null;
  },
  async getAddress(config) {
    const r = await walletRequest(
      freighter.getAddress(),
      responseTimeout,
      5000,
    );
    if (r.error || !r.address) return null;
    if (config) {
      const n = await walletRequest(
        freighter.getNetworkDetails(),
        responseTimeout,
        5000,
      );
      if (n.error || n.networkPassphrase !== config.passphrase)
        throw new Error(
          `Switch Freighter to Stellar ${config.network} and reconnect.`,
        );
    }
    address = r.address;
    return address;
  },
  async signTransaction(xdr, config) {
    const current = await walletRequest(
      freighter.getAddress(),
      responseTimeout,
      5000,
    );
    if (current.error || !address || current.address !== address)
      throw new Error(
        "Wallet account changed or is unavailable. Reconnect before signing.",
      );
    const n = await walletRequest(
      freighter.getNetworkDetails(),
      responseTimeout,
      5000,
    );
    if (n.error || n.networkPassphrase !== config.passphrase)
      throw new Error("Wallet network changed. Reconnect before signing.");
    const r = await walletRequest(
      freighter.signTransaction(xdr, {
        networkPassphrase: config.passphrase,
        address: address || undefined,
      }),
      "Wallet approval timed out. Check Freighter’s pending request before trying again.",
      90000,
    );
    if (r.error || !r.signedTxXdr || r.signerAddress !== address)
      throw new Error(r.error?.message || "Wallet approval cancelled.");
    return r.signedTxXdr;
  },
};
