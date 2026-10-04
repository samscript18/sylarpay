import { it, expect, beforeEach, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  Account,
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  submit: vi.fn(),
  lookup: vi.fn(),
  account: vi.fn(),
}));
vi.mock("@/server/offramp", () => ({ withdrawalStatus: mocks.status }));
vi.mock("@/server/stellar", () => ({
  balance: async () => "500",
  horizon: async () => ({
    loadAccount: mocks.account,
    submitTransaction: mocks.submit,
    transactions: () => ({ transaction: () => ({ call: mocks.lookup }) }),
  }),
}));
process.env.DATABASE_URL = join(
  mkdtempSync(join(tmpdir(), "skylar-funding-")),
  "test.sqlite",
);
import { db } from "@/server/db";
import { getConfig } from "@/lib/config";
import { prepareFunding, submitFunding } from "@/server/withdrawal-funding";
const key = Keypair.random(),
  destination = Keypair.random().publicKey(),
  id = crypto.randomUUID();
beforeEach(() => {
  vi.clearAllMocks();
  process.env.STELLAR_NETWORK = "testnet";
  process.env.NEXT_PUBLIC_DEMO_MODE = "false";
  db().exec("DELETE FROM withdrawals");
  db()
    .prepare(
      "INSERT INTO withdrawals(id,account,network,idem,amount,currency,provider,status,demo,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      key.publicKey(),
      "testnet",
      crypto.randomUUID(),
      "150",
      "NGN",
      "Test adapter",
      "AWAITING_USER_TRANSFER",
      0,
      "now",
      "now",
    );
  mocks.status.mockResolvedValue({
    status: "AWAITING_USER_TRANSFER",
    demo: false,
    amountIn: "150",
    withdrawalAccount: destination,
    withdrawalMemo: "123",
    withdrawalMemoType: "id",
  });
  mocks.account.mockResolvedValue(new Account(key.publicKey(), "1"));
  mocks.submit.mockResolvedValue({});
  mocks.lookup.mockResolvedValue({ successful: true });
});
it("reviews and signs the exact provider transfer including required memo; retries preserve hash", async () => {
  const review = await prepareFunding(key.publicKey(), id);
  expect(review.destination).toBe(destination);
  expect(review.amount).toBe("150");
  const tx = TransactionBuilder.fromXDR(review.xdr, getConfig().passphrase);
  tx.sign(key);
  const first = await submitFunding(key.publicKey(), id, tx.toXDR());
  expect(first.status).toBe("CONFIRMED");
  expect((await submitFunding(key.publicKey(), id, tx.toXDR())).txHash).toBe(
    first.txHash,
  );
  await expect(prepareFunding(key.publicKey(), id)).rejects.toThrow(
    "already submitted",
  );
});
it("requires owner authorization and complete real-provider instructions", async () => {
  await expect(
    prepareFunding(Keypair.random().publicKey(), id),
  ).rejects.toThrow("not found");
  mocks.status.mockResolvedValue({
    demo: true,
    status: "AWAITING_USER_TRANSFER",
  });
  await expect(prepareFunding(key.publicKey(), id)).rejects.toThrow("complete");
});
it("refuses a signed transaction changed after review", async () => {
  const review = await prepareFunding(key.publicKey(), id);
  const tx = TransactionBuilder.fromXDR(review.xdr, getConfig().passphrase);
  tx.sign(key);
  await expect(
    submitFunding(key.publicKey(), crypto.randomUUID(), tx.toXDR()),
  ).rejects.toThrow("not found");
  const changed = new TransactionBuilder(new Account(key.publicKey(), "1"), {
    fee: "100",
    networkPassphrase: getConfig().passphrase,
  })
    .addOperation(
      Operation.payment({
        destination: Keypair.random().publicKey(),
        asset: new Asset("USDC", getConfig().issuer),
        amount: "150",
      }),
    )
    .setTimeout(180)
    .build();
  changed.sign(key);
  await expect(
    submitFunding(key.publicKey(), id, changed.toXDR()),
  ).rejects.toThrow("does not match");
  expect(mocks.submit).not.toHaveBeenCalled();
});
it("returns pending when ledger evidence is missing", async () => {
  const review = await prepareFunding(key.publicKey(), id);
  const tx = TransactionBuilder.fromXDR(review.xdr, getConfig().passphrase);
  tx.sign(key);
  mocks.lookup.mockRejectedValue(new Error("Not indexed"));
  expect((await submitFunding(key.publicKey(), id, tx.toXDR())).status).toBe(
    "PENDING",
  );
});
