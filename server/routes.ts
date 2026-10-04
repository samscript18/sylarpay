import { prepareFunding, submitFunding } from "./withdrawal-funding";
import { NextResponse } from "next/server";
import {
  Address,
  Asset,
  nativeToScVal,
  Transaction,
  TransactionBuilder,
  Operation,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { z } from "zod";
import { getConfig } from "@/lib/config";
import {
  addressSchema,
  amountSchema,
  hashSchema,
  paymentSchema,
  profileSchema,
  usernameSchema,
} from "@/lib/validation";
import { safe, json, sameOrigin, AppError } from "./http";
import { authenticate, challenge, logout, requireAccount } from "./auth";
import { balance, horizon, preparePayment } from "./stellar";
import {
  prepareRegistry,
  read,
  resolveUsername,
  submitRegistry,
  verifyProfileOnChain,
} from "./registry";
import {
  history,
  verifyPayment,
  assertPayment,
  storePayment,
} from "./payments";
import { db, Profile } from "./db";
import {
  createWithdrawal,
  provider,
  Sep24Provider,
  withdrawalStatus,
} from "./offramp";
function path(req: Request) {
  return new URL(req.url).pathname.slice(5).split("/");
}
function reply(value: unknown) {
  return NextResponse.json(value, { headers: { "Cache-Control": "no-store" } });
}
export function handleGet(req: Request) {
  return safe(async () => {
    const p = path(req),
      url = new URL(req.url),
      c = getConfig();
    if (p[0] === "config") return reply(c);
    if (p[0] === "session") return reply({ account: await requireAccount() });
    if (p[0] === "users" && p[1]) {
      const resolved = await resolveUsername(decodeURIComponent(p[1]));
      const profile = db()
        .prepare("SELECT displayName,bio FROM profiles WHERE account=?")
        .get(resolved.address) as
        Pick<Profile, "displayName" | "bio"> | undefined;
      return reply({
        ...resolved,
        profile: profile || { displayName: `@${resolved.username}`, bio: "" },
      });
    }
    if (p[0] === "availability") {
      const name = usernameSchema.parse(url.searchParams.get("username"));
      return reply({
        username: name,
        available: !(await read("exists", [
          nativeToScVal(name, { type: "string" }),
        ])),
      });
    }
    if (p[0] === "anchors") return reply(await provider().getInfo());
    const account = await requireAccount();
    if (p[0] === "me") {
      const profile = db()
        .prepare("SELECT * FROM profiles WHERE account=?")
        .get(account) as Profile | undefined;
      let identity = null;
      if (profile) {
        const r = await resolveUsername(profile.username);
        if (r.address === account) identity = r;
      }
      return reply({
        account,
        profile: identity ? profile : null,
        identity,
        balance: await balance(account),
        payments: history(account),
      });
    }
    if (p[0] === "payments") return reply(history(account));
    if (p[0] === "withdrawals" && p[1])
      return reply(
        await withdrawalStatus(account, z.string().uuid().parse(p[1])),
      );
    throw new AppError("Route not found.", 404);
  });
}
export function handlePost(req: Request) {
  return safe(async () => {
    sameOrigin(req);
    const p = path(req),
      body = await json(req),
      c = getConfig();
    if (p[0] === "auth" && p[1] === "challenge")
      return reply(challenge(addressSchema.parse(body.account)));
    if (p[0] === "auth" && p[1] === "login") {
      const v = z
        .object({ id: z.string().length(48), signed: z.string().max(20000) })
        .parse(body);
      return reply({ account: await authenticate(v.id, v.signed) });
    }
    if (p[0] === "auth" && p[1] === "logout") {
      await logout();
      return reply({ ok: true });
    }
    const account = await requireAccount();
    if (p[0] === "registry" && p[1] === "prepare") {
      const v = z
        .object({
          method: z.enum([
            "register",
            "propose_transfer",
            "accept_transfer",
            "cancel_transfer",
          ]),
          username: usernameSchema,
          newOwner: addressSchema.optional(),
        })
        .parse(body);
      const args = [nativeToScVal(v.username, { type: "string" })];
      if (v.method === "register") args.push(new Address(account).toScVal());
      if (v.method === "propose_transfer")
        args.push(new Address(addressSchema.parse(v.newOwner)).toScVal());
      return reply({ xdr: await prepareRegistry(account, v.method, args) });
    }
    if (p[0] === "registry" && p[1] === "submit") {
      const signed = z.string().max(20000).parse(body.signed);
      const tx = TransactionBuilder.fromXDR(signed, c.passphrase);
      if (
        !(tx instanceof Transaction) ||
        tx.source !== account ||
        tx.operations.length !== 1 ||
        tx.operations[0].type !== "invokeHostFunction"
      )
        throw new AppError("Invalid registry transaction.");
      return reply({ txHash: await submitRegistry(signed) });
    }
    if (p[0] === "profile") {
      const v = profileSchema.parse(body),
        r = await resolveUsername(v.username);
      if (r.address !== account)
        throw new AppError(
          "Only the current username owner may edit this profile.",
          403,
        );
      db()
        .prepare(
          "INSERT INTO profiles VALUES(?,?,?,?,?) ON CONFLICT(account) DO UPDATE SET username=excluded.username,displayName=excluded.displayName,bio=excluded.bio,updatedAt=excluded.updatedAt",
        )
        .run(
          account,
          v.username,
          v.displayName,
          v.bio,
          new Date().toISOString(),
        );
      if (!r.verified) await verifyProfileOnChain(account);
      return reply({ ok: true });
    }
    if (p[0] === "payments" && p[1] === "prepare") {
      const v = z
          .object({
            username: usernameSchema,
            amount: amountSchema,
            expectedAddress: addressSchema.optional(),
          })
          .parse(body),
        recipient = await resolveUsername(v.username);
      if (v.expectedAddress && v.expectedAddress !== recipient.address)
        throw new AppError(
          "Recipient ownership changed. Review the new destination before paying.",
          409,
        );
      return reply({
        recipient,
        xdr: await preparePayment(account, recipient.address, v.amount),
      });
    }
    if (p[0] === "payments" && p[1] === "submit") {
      const v = z
          .object({
            username: usernameSchema,
            amount: amountSchema,
            signed: z.string().max(20000),
          })
          .parse(body),
        r = await resolveUsername(v.username);
      const tx = TransactionBuilder.fromXDR(v.signed, c.passphrase);
      if (!(tx instanceof Transaction))
        throw new AppError("Invalid payment transaction.");
      const op = tx.operations[0];
      assertPayment(
        {
          hash: Buffer.from(tx.hash()).toString("hex"),
          successful: true,
          source: op?.source || tx.source,
          destination: op?.type === "payment" ? op.destination : "",
          assetCode: op?.type === "payment" ? op.asset.getCode() : "",
          issuer: op?.type === "payment" ? op.asset.getIssuer() || "" : "",
          amount: op?.type === "payment" ? op.amount : "0",
          network: c.network,
          operationCount: tx.operations.length,
          type: op?.type || "",
        },
        {
          hash: Buffer.from(tx.hash()).toString("hex"),
          sender: account,
          recipient: r.address,
          amount: v.amount,
          network: c.network,
          assetCode: c.assetCode,
          issuer: c.issuer,
        },
      );
      if (tx.source !== account || tx.memo.type !== "none")
        throw new AppError("Unsupported payment envelope.");
      const hash = Buffer.from(tx.hash()).toString("hex");
      const s = await horizon();
      try {
        await s.submitTransaction(tx);
      } catch (e) {
        // On transport ambiguity, return the locally derived hash for ledger verification.
        if (
          e instanceof Error &&
          "response" in e &&
          (e.response as { status?: number })?.status === 400
        ) {
          // Replaying the exact signed transaction may be rejected after it already settled.
          try {
            const previous = await verifyPayment(
              { txHash: hash, username: v.username, amount: v.amount },
              account,
            );
            if (previous.status === "CONFIRMED") return reply({ txHash: hash });
          } catch {
            /* No matching ledger evidence: preserve the rejection. */
          }
          throw new AppError(
            "Stellar rejected the payment. Check balance, trustlines, and account fees.",
          );
        }
      }
      storePayment({
        txHash: hash,
        network: c.network,
        senderAddress: account,
        recipientAddress: r.address,
        username: v.username,
        assetCode: c.assetCode,
        assetIssuer: c.issuer,
        amount: v.amount,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        confirmedAt: null,
        failureReason: null,
      });
      return reply({ txHash: hash });
    }
    if (p[0] === "payments" && p[1] === "verify")
      return reply(await verifyPayment(paymentSchema.parse(body), account));
    if (p[0] === "payments" && p[1] === "note") {
      const v = z
        .object({ txHash: hashSchema, note: z.string().max(500) })
        .parse(body);
      const found = db()
        .prepare(
          "SELECT 1 FROM payments WHERE txHash=? AND network=? AND (senderAddress=? OR recipientAddress=?)",
        )
        .get(v.txHash, c.network, account, account);
      if (!found) throw new AppError("Payment not found.", 404);
      db()
        .prepare(
          "INSERT INTO notes VALUES(?,?,?,?) ON CONFLICT(network,txHash,account) DO UPDATE SET note=excluded.note",
        )
        .run(c.network, v.txHash, account, v.note);
      return reply({ ok: true });
    }
    if (p[0] === "trustline") {
      const s = await horizon();
      const source = await s.loadAccount(account);
      return reply({
        xdr: new TransactionBuilder(source, {
          fee: BASE_FEE,
          networkPassphrase: c.passphrase,
        })
          .addOperation(
            Operation.changeTrust({ asset: new Asset(c.assetCode, c.issuer) }),
          )
          .setTimeout(180)
          .build()
          .toXDR(),
      });
    }
    if (p[0] === "trustline-submit") {
      const tx = TransactionBuilder.fromXDR(
        z.string().max(20000).parse(body.signed),
        c.passphrase,
      );
      if (
        !(tx instanceof Transaction) ||
        tx.source !== account ||
        tx.operations.length !== 1 ||
        tx.operations[0].type !== "changeTrust" ||
        !(tx.operations[0].line instanceof Asset) ||
        tx.operations[0].line.getCode() !== c.assetCode ||
        tx.operations[0].line.getIssuer() !== c.issuer
      )
        throw new AppError("Invalid USDC trustline transaction.");
      const s = await horizon();
      return reply({ txHash: (await s.submitTransaction(tx)).hash });
    }
    if (p[0] === "anchor-auth") {
      const a = provider();
      if (!(a instanceof Sep24Provider))
        throw new AppError("A real anchor is not configured.");
      return reply(await a.challenge(account));
    }
    if (p[0] === "withdrawals" && p[1] === "fund") {
      const v = z
        .object({
          id: z.string().uuid(),
          signed: z.string().max(20000).optional(),
        })
        .parse(body);
      return reply(
        v.signed
          ? await submitFunding(account, v.id, v.signed)
          : await prepareFunding(account, v.id),
      );
    }
    if (p[0] === "withdrawals")
      return reply(
        await createWithdrawal(
          account,
          z
            .object({
              amount: amountSchema,
              currency: z.string().regex(/^[A-Z]{3}$/),
              idempotencyKey: z.string().uuid(),
              signed: z.string().max(20000).optional(),
            })
            .parse(body),
        ),
      );
    throw new AppError("Route not found.", 404);
  });
}
