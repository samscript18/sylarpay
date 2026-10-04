import { beforeEach, it, expect, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
process.env.DATABASE_URL = join(
  mkdtempSync(join(tmpdir(), "skylar-withdrawals-")),
  "test.sqlite",
);
import {
  createWithdrawal,
  withdrawalStatus,
  mapStatus,
  provider,
  DemoOffRamp,
} from "@/server/offramp";
import { db } from "@/server/db";
const account = Keypair.random().publicKey();
beforeEach(() => {
  process.env.STELLAR_NETWORK = "testnet";
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  Object.assign(process.env, { NODE_ENV: "test" });
  delete process.env.ANCHOR_HOME_DOMAIN;
  db().exec("DELETE FROM withdrawals");
  vi.restoreAllMocks();
});
it("creates one demo session on retries and never reports a bank payout", async () => {
  const p = {
    amount: "150",
    currency: "NGN",
    idempotencyKey: crypto.randomUUID(),
  };
  const a = await createWithdrawal(account, p),
    b = await createWithdrawal(account, p);
  expect(a.id).toBe(b.id);
  expect(a.demo).toBe(true);
  const s = await withdrawalStatus(account, a.id);
  expect(s.status).toBe("PROCESSING");
  expect(s.amountOut).toBeUndefined();
  expect(db().prepare("SELECT count(*) AS n FROM withdrawals").get()).toEqual({
    n: 1,
  });
});
it("rejects unauthorized access and idempotency conflicts", async () => {
  const p = {
      amount: "150",
      currency: "NGN",
      idempotencyKey: crypto.randomUUID(),
    },
    a = await createWithdrawal(account, p);
  await expect(
    withdrawalStatus(Keypair.random().publicKey(), a.id),
  ).rejects.toThrow("not found");
  await expect(
    createWithdrawal(account, { ...p, amount: "151" }),
  ).rejects.toThrow("different withdrawal");
});
it("rejects unsupported fiat", async () => {
  await expect(
    createWithdrawal(account, {
      amount: "150",
      currency: "USD",
      idempotencyKey: crypto.randomUUID(),
    }),
  ).rejects.toThrow("not available");
});
it("reserves a withdrawal before external work; failed retries cannot duplicate it", async () => {
  vi.spyOn(DemoOffRamp.prototype, "startWithdrawal").mockRejectedValue(
    new Error("Provider transport failure"),
  );
  const p = {
    amount: "150",
    currency: "NGN",
    idempotencyKey: crypto.randomUUID(),
  };
  await expect(createWithdrawal(account, p)).rejects.toThrow();
  expect((await createWithdrawal(account, p)).status).toBe("FAILED");
  expect(db().prepare("SELECT count(*) AS n FROM withdrawals").get()).toEqual({
    n: 1,
  });
});
it("disables demo in production and provides an honest unavailable provider", async () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  expect(() => provider()).toThrow();
  process.env.NEXT_PUBLIC_DEMO_MODE = "false";
  expect((await provider().getInfo()).available).toBe(false);
});
it("maps SEP-24 provider states without equating initiation to completion", () => {
  expect(mapStatus("pending_user_transfer_start")).toBe(
    "AWAITING_USER_TRANSFER",
  );
  expect(mapStatus("completed")).toBe("COMPLETED");
  expect(mapStatus("error")).toBe("FAILED");
  expect(mapStatus("expired")).toBe("EXPIRED");
  expect(() => mapStatus("invented")).toThrow();
});
