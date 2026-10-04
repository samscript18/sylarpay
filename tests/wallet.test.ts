import { beforeEach, expect, it, vi } from "vitest";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import { getConfig } from "@/lib/config";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  address: vi.fn(),
  network: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@stellar/freighter-api", () => ({
  requestAccess: mocks.access,
  getAddress: mocks.address,
  getNetworkDetails: mocks.network,
  signTransaction: mocks.sign,
}));
import { wallet } from "@/lib/wallet";
const account = Keypair.random().publicKey(),
  config = getConfig();
beforeEach(async () => {
  vi.clearAllMocks();
  await wallet.disconnect();
  mocks.access.mockResolvedValue({ address: account });
  mocks.address.mockResolvedValue({ address: account });
  mocks.network.mockResolvedValue({ networkPassphrase: config.passphrase });
  mocks.sign.mockResolvedValue({
    signedTxXdr: "signed",
    signerAddress: account,
  });
});
it("refuses unavailable wallets with a useful message", async () => {
  mocks.access.mockResolvedValue({ address: "" });
  await expect(wallet.connect(config)).rejects.toThrow(
    "Install and unlock Freighter",
  );
});
it("refuses the wrong network on both connection and restoration", async () => {
  mocks.network.mockResolvedValue({ networkPassphrase: Networks.PUBLIC });
  await expect(wallet.connect(config)).rejects.toThrow("Switch Freighter");
  await expect(wallet.getAddress(config)).rejects.toThrow("Switch Freighter");
});
it("requires reconnection after the selected account changes", async () => {
  await wallet.connect(config);
  mocks.address.mockResolvedValue({ address: Keypair.random().publicKey() });
  await expect(wallet.signTransaction("xdr", config)).rejects.toThrow(
    "account changed",
  );
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("refuses a network change before requesting a signature", async () => {
  await wallet.connect(config);
  mocks.network.mockResolvedValue({ networkPassphrase: Networks.PUBLIC });
  await expect(wallet.signTransaction("xdr", config)).rejects.toThrow(
    "network changed",
  );
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("reports wallet rejection and rejects an unexpected signer", async () => {
  await wallet.connect(config);
  mocks.sign.mockResolvedValue({
    error: { message: "Payment cancelled in wallet." },
  });
  await expect(wallet.signTransaction("xdr", config)).rejects.toThrow(
    "Payment cancelled",
  );
  mocks.sign.mockResolvedValue({
    signedTxXdr: "signed",
    signerAddress: Keypair.random().publicKey(),
  });
  await expect(wallet.signTransaction("xdr", config)).rejects.toThrow(
    "approval cancelled",
  );
});
