import mongoose, { Schema, type Model } from "mongoose";
import { AppError } from "./http";
export interface PaymentRecord {
	operationIndex?: number;
	txHash: string;
	network: "testnet" | "mainnet";
	senderAddress: string;
	recipientAddress: string;
	username: string;
	assetCode: string;
	assetIssuer: string;
	amount: string;
	status: "PENDING" | "CONFIRMED" | "FAILED";
	createdAt: string;
	confirmedAt: string | null;
	failureReason: string | null;
	note?: string;
}
export interface PaymentBatch {
	assetCode: string;
	assetIssuer: string;
	txHash: string;
	network: "testnet" | "mainnet";
	senderAddress: string;
	payments: { username: string; amount: string; expectedAddress: string }[];
	status: "PENDING" | "CONFIRMED" | "FAILED";
	createdAt: string;
	confirmedAt: string | null;
	failureReason: string | null;
}
export interface Profile {
	account: string;
	username: string;
	displayName: string;
	bio: string;
	updatedAt?: string;
}
export interface ChallengeRecord {
	id: string;
	account: string;
	xdr: string;
	expires: number;
	expiresAt: Date;
}
export interface SessionRecord {
	token: string;
	account: string;
	expires: number;
	expiresAt: Date;
}
export interface NoteRecord {
	network: string;
	txHash: string;
	account: string;
	note: string;
}
export interface WithdrawalRecord {
	id: string;
	account: string;
	network: string;
	idem: string;
	amount: string;
	currency: string;
	provider: string;
	status: import("./offramp").WithdrawalStatus;
	demo: number;
	simulatedFiat?: boolean;
	anchorId: string | null;
	interactiveUrl: string | null;
	token: string | null;
	createdAt: string;
	updatedAt: string;
	fundingXdr: string | null;
	fundingHash: string | null;
}
interface Models {
	Batch: Model<PaymentBatch>;
	Challenge: Model<ChallengeRecord>;
	Session: Model<SessionRecord>;
	Profile: Model<Profile>;
	Payment: Model<PaymentRecord>;
	Note: Model<NoteRecord>;
	Withdrawal: Model<WithdrawalRecord>;
}
const globals = globalThis as typeof globalThis & {
	sylarMongo?: Map<string, Promise<Models>>;
};
const cache = (globals.sylarMongo ??= new Map());
const required = { type: String, required: true };
export const publicFields = { _id: 0, __v: 0 } as const;
export function duplicateKey(e: unknown) {
	return !!e && typeof e === "object" && "code" in e && e.code === 11000;
}
export async function db(): Promise<Models> {
	const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sylarpay";
	if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new AppError("Configure a valid server-side MONGODB_URI.", 503);
	const cacheKey = `batch-v1:${uri}`;
	if (!cache.has(cacheKey)) {
		const opening = (async () => {
			const connection = mongoose.createConnection(uri, {
				serverSelectionTimeoutMS: 5000,
				maxPoolSize: 10,
			});
			try {
				await connection.asPromise();
				const options = { versionKey: false, bufferCommands: false } as const;
				const challenge = new Schema<ChallengeRecord>(
					{
						id: required,
						account: required,
						xdr: required,
						expires: Number,
						expiresAt: Date,
					},
					options,
				);
				challenge.index({ id: 1 }, { unique: true });
				challenge.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
				const session = new Schema<SessionRecord>(
					{
						token: required,
						account: required,
						expires: Number,
						expiresAt: Date,
					},
					options,
				);
				session.index({ token: 1 }, { unique: true });
				session.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
				const profile = new Schema<Profile>(
					{
						account: required,
						username: required,
						displayName: required,
						bio: { type: String, default: "" },
						updatedAt: String,
					},
					options,
				);
				profile.index({ account: 1 }, { unique: true });
				profile.index({ username: 1 });
				const payment = new Schema<PaymentRecord>(
					{
						txHash: required,
						network: required,
						senderAddress: required,
						recipientAddress: required,
						username: required,
						assetCode: required,
						assetIssuer: required,
						amount: required,
						status: {
							type: String,
							enum: ["PENDING", "CONFIRMED", "FAILED"],
							required: true,
						},
						createdAt: required,
						confirmedAt: { type: String, default: null },
						failureReason: { type: String, default: null },
					},
					options,
				);
				payment.index({ network: 1, txHash: 1 }, { unique: true });
				payment.index({ network: 1, senderAddress: 1, createdAt: -1 });
				payment.index({ network: 1, recipientAddress: 1, createdAt: -1 });
				const batch = new Schema<PaymentBatch>(
					{
						assetCode: required,
						assetIssuer: required,
						txHash: required,
						network: required,
						senderAddress: required,
						payments: [
							{
								_id: false,
								username: required,
								amount: required,
								expectedAddress: required,
							},
						],
						status: {
							type: String,
							enum: ["PENDING", "CONFIRMED", "FAILED"],
							required: true,
						},
						createdAt: required,
						confirmedAt: { type: String, default: null },
						failureReason: { type: String, default: null },
					},
					options,
				);
				batch.index({ network: 1, txHash: 1 }, { unique: true });
				batch.index({ network: 1, senderAddress: 1, createdAt: -1 });
				batch.index({
					network: 1,
					"payments.expectedAddress": 1,
					createdAt: -1,
				});
				const note = new Schema<NoteRecord>(
					{
						network: required,
						txHash: required,
						account: required,
						note: { type: String, default: "" },
					},
					options,
				);
				note.index({ network: 1, txHash: 1, account: 1 }, { unique: true });
				const withdrawal = new Schema<WithdrawalRecord>(
					{
						id: required,
						account: required,
						network: required,
						idem: required,
						amount: required,
						currency: required,
						provider: required,
						status: {
							type: String,
							required: true,
							enum: ["CREATED", "AWAITING_KYC", "AWAITING_USER_TRANSFER", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "EXPIRED", "CANCELLED"],
						},
						demo: { type: Number, default: 0 },
						simulatedFiat: { type: Boolean, default: false },
						anchorId: { type: String, default: null },
						interactiveUrl: { type: String, default: null },
						token: { type: String, default: null },
						fundingXdr: { type: String, default: null },
						fundingHash: { type: String, default: null },
						createdAt: required,
						updatedAt: required,
					},
					options,
				);
				withdrawal.index({ id: 1 }, { unique: true });
				withdrawal.index({ account: 1, network: 1, idem: 1 }, { unique: true });
				const models: Models = {
					Batch: connection.model<PaymentBatch>("PaymentBatch", batch),
					Challenge: connection.model<ChallengeRecord>("Challenge", challenge),
					Session: connection.model<SessionRecord>("Session", session),
					Profile: connection.model<Profile>("Profile", profile),
					Payment: connection.model<PaymentRecord>("Payment", payment),
					Note: connection.model<NoteRecord>("Note", note),
					Withdrawal: connection.model<WithdrawalRecord>("Withdrawal", withdrawal),
				};
				await Promise.all(Object.values(models).map((model) => model.init()));
				return models;
			} catch {
				await connection.close().catch(() => undefined);
				throw new AppError("Cannot connect to MongoDB. Check MONGODB_URI and ensure your database is running.", 503);
			}
		})();
		cache.set(cacheKey, opening);
		opening.catch(() => cache.delete(cacheKey));
	}
	return cache.get(cacheKey)!;
}
