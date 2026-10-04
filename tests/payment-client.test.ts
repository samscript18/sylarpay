import { beforeEach, expect, it, vi } from "vitest";
import {
  Account,
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { getConfig } from "@/lib/config";
const mocks = vi.hoisted(() => ({ api: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/lib/wallet", () => ({ wallet: { signTransaction: mocks.sign } }));
import { sendUsdcPayment } from "@/lib/payment-client";
const config = getConfig(),
  sender = Keypair.random(),
  recipient = Keypair.random().publicKey();
const params = { username: "sam", amount: "150", expectedAddress: recipient };
function transaction(amount = "150") {
  return new TransactionBuilder(new Account(sender.publicKey(), "1"), {
    fee: "100",
    networkPassphrase: config.passphrase,
  })
    .addOperation(
      Operation.payment({
        destination: recipient,
        asset: new Asset(config.assetCode, config.issuer),
        amount,
      }),
    )
    .setTimeout(180)
    .build();
}
beforeEach(() => {
  vi.clearAllMocks();
});
it("preserves the signed transaction hash before a lost submission response", async () => {
  const tx = transaction();
  tx.sign(sender);
  mocks.api.mockImplementation(async (url) => {
    if (url.endsWith("prepare"))
      return { xdr: tx.toXDR(), recipient: { address: recipient } };
    throw new Error("Connection lost");
  });
  mocks.sign.mockResolvedValue(tx.toXDR());
  const hash = vi.fn();
  await expect(sendUsdcPayment(params, config, vi.fn(), hash)).rejects.toThrow(
    "Connection lost",
  );
  expect(hash).toHaveBeenCalledWith(Buffer.from(tx.hash()).toString("hex"));
  expect(hash.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.api.mock.invocationCallOrder[1],
  );
});
it("rejects wallet changes to the reviewed body before submission", async () => {
  const tx = transaction(),
    changed = transaction("151");
  changed.sign(sender);
  mocks.api.mockResolvedValue({
    xdr: tx.toXDR(),
    recipient: { address: recipient },
  });
  mocks.sign.mockResolvedValue(changed.toXDR());
  const hash = vi.fn();
  await expect(sendUsdcPayment(params, config, vi.fn(), hash)).rejects.toThrow(
    "Wallet changed",
  );
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(hash).not.toHaveBeenCalled();
});
it("stops before wallet signing when fresh username resolution changes", async () => {
  mocks.api.mockResolvedValue({
    xdr: transaction().toXDR(),
    recipient: { address: sender.publicKey() },
  });
  await expect(
    sendUsdcPayment(params, config, vi.fn(), vi.fn()),
  ).rejects.toThrow("Recipient changed");
  expect(mocks.sign).not.toHaveBeenCalled();
});
