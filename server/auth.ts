import { randomBytes, createHash } from "node:crypto";
import {
  Account,
  BASE_FEE,
  Keypair,
  Memo,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { cookies } from "next/headers";
import { getConfig } from "@/lib/config";
import { db } from "./db";
import { AppError } from "./http";
import { horizon } from "./stellar";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export function challenge(account: string) {
  const c = getConfig();
  const id = randomBytes(24).toString("hex");
  const tx = new TransactionBuilder(new Account(account, "-1"), {
    fee: BASE_FEE,
    networkPassphrase: c.passphrase,
  })
    .addMemo(Memo.text("SkylarPay sign in"))
    .addOperation(
      Operation.manageData({
        name: new URL(c.appUrl).host + " auth",
        value: randomBytes(32),
      }),
    )
    .setTimeout(300)
    .build();
  db().prepare("DELETE FROM challenges WHERE expires < ?").run(Date.now());
  db()
    .prepare("INSERT INTO challenges VALUES(?,?,?,?)")
    .run(id, account, tx.toXDR(), Date.now() + 300000);
  return { id, xdr: tx.toXDR() };
}
export async function authenticate(id: string, signed: string) {
  const row = db().prepare("SELECT * FROM challenges WHERE id=?").get(id) as
    { account: string; xdr: string; expires: number } | undefined;
  if (!row || row.expires < Date.now())
    throw new AppError("Sign-in request expired. Connect again.", 401);
  const c = getConfig();
  const tx = TransactionBuilder.fromXDR(signed, c.passphrase);
  const original = TransactionBuilder.fromXDR(row.xdr, c.passphrase);
  if (
    !(tx instanceof Transaction) ||
    !Buffer.from(tx.hash()).equals(Buffer.from(original.hash()))
  )
    throw new AppError("Invalid sign-in transaction.", 401);
  const account = await (await horizon()).loadAccount(row.account);
  const signer = account.signers.find(
    (s) => s.key === row.account && s.type === "ed25519_public_key",
  );
  if (!signer || signer.weight < Math.max(1, account.thresholds.med_threshold))
    throw new AppError(
      "This MVP supports wallets whose primary key can authorize transactions.",
      401,
    );
  if (
    !tx.signatures.some((s) =>
      Keypair.fromPublicKey(row.account).verify(tx.hash(), s.signature),
    )
  )
    throw new AppError("Wallet signature is invalid.", 401);
  const consumed = db().prepare("DELETE FROM challenges WHERE id=?").run(id);
  if (!consumed.changes)
    throw new AppError("Sign-in request already used.", 401);
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(digest(token), row.account, Date.now() + 86400000);
  (await cookies()).set("skylar_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 86400,
    path: "/",
  });
  return row.account;
}
export async function requireAccount() {
  const token = (await cookies()).get("skylar_session")?.value;
  const row = token
    ? (db()
        .prepare("SELECT account FROM sessions WHERE token=? AND expires>?")
        .get(digest(token), Date.now()) as { account: string } | undefined)
    : undefined;
  if (!row) throw new AppError("Connect your Stellar wallet to continue.", 401);
  return row.account;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("skylar_session")?.value;
  if (token)
    db().prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
  jar.delete("skylar_session");
}
