import * as freighter from "@stellar/freighter-api";
import type { AppConfig } from "./config";
export interface WalletService {
  connect(config: AppConfig): Promise<string>;
  disconnect(): Promise<void>;
  getAddress(config?: AppConfig): Promise<string | null>;
  signTransaction(xdr: string, config: AppConfig): Promise<string>;
}
let address: string | null = null;
export const wallet: WalletService = {
  async connect(config) {
    const r = await freighter.requestAccess();
    if (r.error || !r.address)
      throw new Error(
        r.error?.message ||
          "Install and unlock Freighter to connect your Stellar wallet.",
      );
    const n = await freighter.getNetworkDetails();
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
  async getAddress() {
    const r = await freighter.getAddress();
    if (r.error || !r.address) return null;
    address = r.address;
    return address;
  },
  async signTransaction(xdr, config) {
    const n = await freighter.getNetworkDetails();
    if (n.networkPassphrase !== config.passphrase)
      throw new Error("Wallet network changed. Reconnect before signing.");
    const r = await freighter.signTransaction(xdr, {
      networkPassphrase: config.passphrase,
      address: address || undefined,
    });
    if (r.error || !r.signedTxXdr || r.signerAddress !== address)
      throw new Error(r.error?.message || "Wallet approval cancelled.");
    return r.signedTxXdr;
  },
};
