import { beforeEach, expect, it, vi } from "vitest";
import {
  Account,
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const mocks = vi.hoisted(() => ({
  account: "",
  resolve: vi.fn(),
  submit: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock("@/server/auth", () => ({
  requireAccount: async () => mocks.account,
  authenticate: vi.fn(),
  challenge: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@/server/registry", () => ({
  resolveUsername: mocks.resolve,
  prepareRegistry: vi.fn(),
  read: vi.fn(),
  submitRegistry: vi.fn(),
  verifyProfileOnChain: vi.fn(),
}));
vi.mock("@/server/stellar", () => ({
  horizon: async () => ({
    submitTransaction: mocks.submit,
    transactions: () => ({ transaction: () => ({ call: mocks.lookup }) }),
  }),
  balance: vi.fn(),
  preparePayment: vi.fn(),
}));
process.env.DATABASE_URL = join(
  mkdtempSync(join(tmpdir(), "skylar-routes-")),
  "test.sqlite",
);
process.env.STELLAR_NETWORK = "testnet";
import { handlePost } from "@/server/routes";
import { db } from "@/server/db";
import { getConfig } from "@/lib/config";
const sender = Keypair.random(),
  recipient = Keypair.random().publicKey(),
  c = getConfig();
function signed() {
  const tx = new TransactionBuilder(new Account(sender.publicKey(), "1"), {
    fee: "100",
    networkPassphrase: c.passphrase,
  })
    .addOperation(
      Operation.payment({
        destination: recipient,
        asset: new Asset(c.assetCode, c.issuer),
        amount: "150",
      }),
    )
    .setTimeout(180)
    .build();
  tx.sign(sender);
  return tx;
}
function request(xdr: string) {
  return new Request(`${c.appUrl}/api/payments/submit`, {
    method: "POST",
    headers: { Origin: c.appUrl, "Content-Type": "application/json" },
    body: JSON.stringify({ username: "sam", amount: "150", signed: xdr }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  db().exec("DELETE FROM payments");
  mocks.account = sender.publicKey();
  mocks.resolve.mockResolvedValue({
    username: "sam",
    address: recipient,
    verified: true,
  });
  mocks.submit.mockRejectedValue(
    Object.assign(new Error("Already submitted"), {
      response: { status: 400 },
    }),
  );
});
it("accepts replay only when the exact payment has successful ledger evidence", async () => {
  const tx = signed(),
    hash = Buffer.from(tx.hash()).toString("hex");
  mocks.lookup.mockResolvedValue({
    envelope_xdr: tx.toXDR(),
    successful: true,
    created_at: new Date().toISOString(),
  });
  expect((await handlePost(request(tx.toXDR()))).status).toBe(200);
  expect(await (await handlePost(request(tx.toXDR()))).json()).toEqual({
    txHash: hash,
  });
  expect(db().prepare("SELECT count(*) AS n FROM payments").get()).toEqual({
    n: 1,
  });
});
it("does not turn a rejected, unindexed submission into success", async () => {
  mocks.lookup.mockRejectedValue(
    Object.assign(new Error("Not found"), { response: { status: 404 } }),
  );
  expect((await handlePost(request(signed().toXDR()))).status).toBe(400);
  expect(db().prepare("SELECT count(*) AS n FROM payments").get()).toEqual({
    n: 0,
  });
});
it("stops a signed payment if username ownership changes before submission", async () => {
  mocks.resolve.mockResolvedValue({
    username: "sam",
    address: Keypair.random().publicKey(),
  });
  expect((await handlePost(request(signed().toXDR()))).status).toBe(400);
  expect(mocks.submit).not.toHaveBeenCalled();
});
