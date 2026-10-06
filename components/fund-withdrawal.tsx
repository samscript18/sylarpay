"use client";
import { LoadingStatus } from "./skeleton";
import { useState } from "react";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
import { explorer } from "@/lib/config";
import { useWallet } from "./wallet-provider";
import type { FundingReview } from "@/server/withdrawal-funding";
export function FundWithdrawal({ id, fundingHash }: { id: string; fundingHash?: string }) {
	const w = useWallet();
	const storageKey = `sylar_funding_${w.config?.network}_${w.account}_${id}`;
	const [review, setReview] = useState<FundingReview | null>(null),
		[attemptHash, setHash] = useState(() => fundingHash || (typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : "") || ""),
		[status, setStatus] = useState(""),
		[busy, setBusy] = useState(false);
	const hash = attemptHash || fundingHash || "";
	function describe(result: { status: string }) {
		return result.status === "CONFIRMED"
			? "USDC transfer confirmed on Stellar. The provider is still responsible for payout."
			: result.status === "NOT_FOUND"
                ? "This signed attempt has expired and was not found on Stellar. Submission is not confirmed. Reconcile this withdrawal with the partner before making another transfer."
            : result.status === "FAILED"
				? "USDC transfer failed on Stellar. No USDC was transferred."
				: "No Stellar confirmation yet. A saved transaction hash does not prove submission. Check again before making another transfer.";
	}
	async function check() {
		setBusy(true);
		try {
			const result = await api<{ txHash: string; status: string }>("/api/withdrawals/fund", { id, check: true });
			setHash(result.txHash);
			setStatus(describe(result));
		} catch (e) {
			setStatus(e instanceof Error ? e.message : "Unable to check Stellar confirmation.");
		} finally {
			setBusy(false);
		}
	}
	async function prepare() {
		setBusy(true);
		try {
			setReview(await api<FundingReview>("/api/withdrawals/fund", { id }));
			setStatus("Review the exact provider destination and required memo before signing.");
		} catch (e) {
			setStatus(e instanceof Error ? e.message : "Could not prepare transfer.");
		} finally {
			setBusy(false);
		}
	}
	async function send() {
		if (!review || !w.config) return;
		setBusy(true);
		try {
			setStatus("Waiting for wallet approval…");
			const signed = await wallet.signTransaction(review.xdr, w.config);
			const { TransactionBuilder } = await import("@stellar/stellar-sdk");
			const tx = TransactionBuilder.fromXDR(signed, w.config.passphrase);
			const original = TransactionBuilder.fromXDR(review.xdr, w.config.passphrase);
			const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
			if (hex(tx.hash()) !== hex(original.hash())) throw new Error("Wallet changed the reviewed anchor transfer. No transfer was submitted.");
			setHash(hex(tx.hash()));
			sessionStorage.setItem(storageKey, hex(tx.hash()));
			setStatus("Submitting USDC transfer. Confirmation is not available yet.");
			const r = await api<{ txHash: string; status: string }>("/api/withdrawals/fund", { id, signed });
			setHash(r.txHash);
			setStatus(describe(r));
		} catch (e) {
			setStatus(`${e instanceof Error ? e.message : "Could not confirm transfer."} Check the transaction and provider status before making another transfer.`);
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="notice">
			{hash ? (
				<>
					<p className="mb-2 text-xs text-zinc-400">Transfer attempt · settlement not established by this hash alone</p>
                    <p className="account break-all">{hash}</p>
					<a className="text-link" href={explorer(w.config!.network, hash)} target="_blank" rel="noreferrer">
						Look up transfer on Stellar ↗
					</a>
					<button className="button secondary small" disabled={busy} onClick={check}>
						Check Stellar confirmation
					</button>
				</>
			) : review ? (
				<>
					<strong>
						Transfer {review.amount} {review.assetCode} to the anchor
					</strong>
					<div className="account">{review.destination}</div>
					<p className="tiny">
						Network: {review.network}
						<br />
						Issuer: {review.issuer}
						<br />
						Required memo: {review.memo ? `${review.memoType}: ${review.memo}` : "None"}
					</p>
					<button className="button w-full" disabled={busy} onClick={send}>
						Confirm USDC transfer
					</button>
				</>
			) : (
				<button className="button w-full" disabled={busy} onClick={prepare}>
					Review USDC transfer
				</button>
			)}
			{(status || hash) && (busy ? <LoadingStatus>{status}</LoadingStatus> : <p role="status">{status || "Transfer attempt restored. Check Stellar confirmation before making another transfer."}</p>)}
		</div>
	);
}
