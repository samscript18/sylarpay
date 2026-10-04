import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DATABASE_URL = join(
  mkdtempSync(join(tmpdir(), "skylar-payments-")),
  "test.sqlite",
);
process.env.STELLAR_NETWORK = "testnet";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), resolve: vi.fn() }));
vi.mock("@/server/stellar", () => ({
  horizon: async () => ({
    transactions: () => ({ transaction: () => ({ call: mocks.lookup }) }),
  }),
}));
vi.mock("@/server/registry", () => ({ resolveUsername: mocks.resolve }));
import {
  assertPayment,
  Evidence,
  verifyPayment,
  history,
} from "@/server/payments";
import { getConfig } from "@/lib/config";
import { db } from "@/server/db";
const sender = Keypair.random(),
  recipient = Keypair.random(),
  c = getConfig();
function evidence(): Evidence {
  return {
    hash: "a".repeat(64),
    successful: true,
    source: sender.publicKey(),
    destination: recipient.publicKey(),
    assetCode: "USDC",
    issuer: c.issuer,
    amount: "150.0000000",
    network: "testnet",
    operationCount: 1,
    type: "payment",
  };
}
const expected = {
  hash: "a".repeat(64),
  sender: sender.publicKey(),
  recipient: recipient.publicKey(),
  amount: "150.00",
  network: "testnet",
  assetCode: "USDC",
  issuer: c.issuer,
};
describe("ledger verification boundary", () => {
  beforeEach(() => {
    db().exec("DELETE FROM payments");
    vi.clearAllMocks();
    mocks.resolve.mockResolvedValue({
      username: "sam",
      address: recipient.publicKey(),
      verified: true,
    });
  });
  it("accepts exact matching evidence", () =>
    expect(() => assertPayment(evidence(), expected)).not.toThrow());
  it.each([
    ["destination", sender.publicKey()],
    ["source", recipient.publicKey()],
    ["assetCode", "XLM"],
    ["issuer", sender.publicKey()],
    ["amount", "149"],
    ["network", "mainnet"],
    ["hash", "b".repeat(64)],
    ["type", "pathPaymentStrictSend"],
    ["operationCount", 2],
    ["successful", false],
  ])("rejects wrong %s", (key, value) =>
    expect(() =>
      assertPayment({ ...evidence(), [key]: value }, expected),
    ).toThrow(),
  );
  it("verifies a signed envelope and idempotently indexes the result", async () => {
    const tx = new TransactionBuilder(new Account(sender.publicKey(), "1"), {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: recipient.publicKey(),
          asset: new Asset(c.assetCode, c.issuer),
          amount: "150",
        }),
      )
      .setTimeout(180)
      .build();
    tx.sign(sender);
    const hash = Buffer.from(tx.hash()).toString("hex");
    mocks.lookup.mockResolvedValue({
      envelope_xdr: tx.toXDR(),
      successful: true,
      created_at: new Date().toISOString(),
    });
    const input = { txHash: hash, username: "sam", amount: "150.00" };
    expect((await verifyPayment(input, sender.publicKey())).status).toBe(
      "CONFIRMED",
    );
    await verifyPayment(input, sender.publicKey());
    expect(history(recipient.publicKey())).toHaveLength(1);
    mocks.lookup.mockRejectedValueOnce(
      Object.assign(new Error("Not indexed"), { response: { status: 404 } }),
    );
    await expect(verifyPayment(input, sender.publicKey())).rejects.toThrow(
      "Previously verified transaction is unavailable",
    );
    mocks.resolve.mockResolvedValue({
      username: "sam",
      address: sender.publicKey(),
    });
    await expect(verifyPayment(input, sender.publicKey())).rejects.toThrow(
      "does not match",
    );
  });
  it("keeps an unindexed hash pending and upgrades on ledger evidence", async () => {
    const tx = new TransactionBuilder(new Account(sender.publicKey(), "1"), {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: recipient.publicKey(),
          asset: new Asset(c.assetCode, c.issuer),
          amount: "150",
        }),
      )
      .setTimeout(180)
      .build();
    tx.sign(sender);
    const input = {
      txHash: Buffer.from(tx.hash()).toString("hex"),
      username: "sam",
      amount: "150",
    };
    mocks.lookup.mockRejectedValue(
      Object.assign(new Error("Not indexed"), { response: { status: 404 } }),
    );
    expect((await verifyPayment(input, sender.publicKey())).status).toBe(
      "PENDING",
    );
    mocks.lookup.mockResolvedValue({
      envelope_xdr: tx.toXDR(),
      successful: true,
      created_at: new Date().toISOString(),
    });
    expect((await verifyPayment(input, sender.publicKey())).status).toBe(
      "CONFIRMED",
    );
    expect(history(sender.publicKey())).toHaveLength(1);
  });
  it("rejects an envelope from the other network even at a valid endpoint", async () => {
    const tx = new TransactionBuilder(new Account(sender.publicKey(), "1"), {
      fee: "100",
      networkPassphrase: Networks.PUBLIC,
    })
      .addOperation(
        Operation.payment({
          destination: recipient.publicKey(),
          asset: new Asset(c.assetCode, c.issuer),
          amount: "150",
        }),
      )
      .setTimeout(180)
      .build();
    tx.sign(sender);
    mocks.lookup.mockResolvedValue({
      envelope_xdr: tx.toXDR(),
      successful: true,
    });
    await expect(
      verifyPayment(
        {
          txHash: Buffer.from(tx.hash()).toString("hex"),
          username: "sam",
          amount: "150",
        },
        sender.publicKey(),
      ),
    ).rejects.toThrow();
  });
  it("never confirms a failed ledger transaction", async () => {
    const tx = new TransactionBuilder(new Account(sender.publicKey(), "1"), {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: recipient.publicKey(),
          asset: new Asset(c.assetCode, c.issuer),
          amount: "150",
        }),
      )
      .setTimeout(180)
      .build();
    mocks.lookup.mockResolvedValue({
      envelope_xdr: tx.toXDR(),
      successful: false,
    });
    await expect(
      verifyPayment(
        {
          txHash: Buffer.from(tx.hash()).toString("hex"),
          username: "sam",
          amount: "150",
        },
        sender.publicKey(),
      ),
    ).rejects.toThrow("failed");
    expect(history(sender.publicKey())).toHaveLength(0);
  });
});
