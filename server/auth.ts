import { randomBytes, createHash } from "node:crypto";
import { Account, BASE_FEE, Keypair, Memo, Operation, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { cookies } from "next/headers";
import { getConfig } from "@/lib/config";
import { db } from "./db";
import { AppError } from "./http";
import { horizon } from "./stellar";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export async function challenge(account: string) {
	const c = getConfig();
	const id = randomBytes(24).toString("hex");
	const tx = new TransactionBuilder(new Account(account, "-1"), {
		fee: BASE_FEE,
		networkPassphrase: c.passphrase,
	})
		.addMemo(Memo.text("SylarPay sign in"))
		.addOperation(
			Operation.manageData({
				name: new URL(c.appUrl).host + " auth",
				value: randomBytes(32),
			}),
		)
		.setTimeout(300)
		.build();
	const { Challenge } = await db();
	const expires = Date.now() + 300000;
	await Challenge.create({
		id,
		account,
		xdr: tx.toXDR(),
		expires,
		expiresAt: new Date(expires),
	});
	return { id, xdr: tx.toXDR() };
}
export async function authenticate(id: string, signed: string) {
	const { Challenge, Session } = await db();
	const row = await Challenge.findOne({ id }).lean();
	if (!row || row.expires < Date.now()) throw new AppError("Sign-in request expired. Connect again.", 401);
	const c = getConfig();
	const tx = TransactionBuilder.fromXDR(signed, c.passphrase);
	const original = TransactionBuilder.fromXDR(row.xdr, c.passphrase);
	if (!(tx instanceof Transaction) || !Buffer.from(tx.hash()).equals(Buffer.from(original.hash()))) throw new AppError("Invalid sign-in transaction.", 401);
	const account = await (await horizon()).loadAccount(row.account);
	const signer = account.signers.find((s) => s.key === row.account && s.type === "ed25519_public_key");
	if (!signer || signer.weight < Math.max(1, account.thresholds.med_threshold)) throw new AppError("This MVP supports wallets whose primary key can authorize transactions.", 401);
	if (!tx.signatures.some((s) => Keypair.fromPublicKey(row.account).verify(tx.hash(), s.signature))) throw new AppError("Wallet signature is invalid.", 401);
	const consumed = await Challenge.deleteOne({
		id,
		expires: { $gt: Date.now() },
	});
	if (!consumed.deletedCount) throw new AppError("Sign-in request already used or expired.", 401);
	const token = randomBytes(32).toString("hex");
	const expires = Date.now() + 86400000;
	await Session.create({
		token: digest(token),
		account: row.account,
		expires,
		expiresAt: new Date(expires),
	});
	(await cookies()).set("sylar_session", token, {
		httpOnly: true,
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
		maxAge: 86400,
		path: "/",
	});
	return row.account;
}
export async function requireAccount() {
	const token = (await cookies()).get("sylar_session")?.value;
	const row = token
		? await (
				await db()
			).Session.findOne({
				token: digest(token),
				expires: { $gt: Date.now() },
			}).lean()
		: null;
	if (!row) throw new AppError("Connect your Stellar wallet to continue.", 401);
	return row.account;
}
export async function logout() {
	const jar = await cookies();
	const token = jar.get("sylar_session")?.value;
	if (token) await (await db()).Session.deleteOne({ token: digest(token) });
	jar.delete("sylar_session");
}
