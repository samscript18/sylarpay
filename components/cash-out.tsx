"use client";
import { FormSkeleton, LoadingStatus, Skeleton } from "./skeleton";
import { FundWithdrawal } from "./fund-withdrawal";
import { WithdrawalNextStep } from "./withdrawal-next-step";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { amountSchema, units, displayAmount } from "@/lib/validation";
import { wallet } from "@/lib/wallet";
import { useWallet, ConnectPrompt } from "./wallet-provider";
import { useAccount } from "@/lib/use-account";
import type { AnchorInfo, WithdrawalSession } from "@/server/offramp";
export function CashOut() {
	const w = useWallet();
	return <CashOutSession key={`${w.account}:${w.config?.network}`} />;
}
function CashOutSession() {
	const w = useWallet(),
		a = useAccount(),
		[amount, setAmount] = useState(""),
		[selectedCurrency, setCurrency] = useState(""),
		[restoredSession, setSession] = useState<WithdrawalSession | null>(null),
		[error, setError] = useState(""),
		[message, setMessage] = useState(""),
		[busy, setBusy] = useState(false);
	const anchorQuery = useQuery({
		queryKey: ["anchors", w.config?.network],
		queryFn: ({ signal }) => api<AnchorInfo>("/api/anchors", undefined, { signal }),
	});
	const info = anchorQuery.data;
	const idem = useRef("");
	const currency = selectedCurrency || info?.currencies[0] || "NGN";
	useEffect(() => {
		if (!w.account) return;
		const id = sessionStorage.getItem(`sylar_withdrawal_${w.account}_${w.config?.network}`) || sessionStorage.getItem(`skylar_withdrawal_${w.account}_${w.config?.network}`);
		if (id)
			api<WithdrawalSession>(`/api/withdrawals/${id}`)
				.then(setSession)
				.catch((e) => setError(e.message));
	}, [w.account, w.config?.network]);
	const pollCount = useRef(0);
	const statusQuery = useQuery({
		queryKey: ["withdrawal", w.config?.network, w.account, restoredSession?.id],
		queryFn: ({ signal }) => {
			++pollCount.current;
			return api<WithdrawalSession>(`/api/withdrawals/${restoredSession!.id}`, undefined, { signal });
		},
		enabled: (query) =>
			!!restoredSession && !!restoredSession.anchorId && !(query.state.data || restoredSession).providerAccessExpired && !["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes((query.state.data || restoredSession).status),
		refetchInterval: (query) => {
			if (["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(query.state.data?.status || "") || query.state.data?.providerAccessExpired || pollCount.current >= 30) return false;
			return 10000;
		},
	});
	const session = statusQuery.data?.id === restoredSession?.id ? statusQuery.data : restoredSession;
	const simulatedFiat = info?.simulatedFiat || session?.simulatedFiat;
	async function start(e: React.FormEvent) {
		e.preventDefault();
		if (!w.config) return;
		setBusy(true);
		setError("");
		try {
			amountSchema.parse(amount);
			if (!info?.currencies.includes(currency)) throw new Error("Currency unavailable with this provider.");
			if (info.minAmount && units(amount) < units(info.minAmount)) throw new Error(`Minimum withdrawal is ${info.minAmount} USDC.`);
			if (info.maxAmount && units(amount) > units(info.maxAmount)) throw new Error(`Maximum withdrawal is ${info.maxAmount} USDC.`);
			if (!info?.demo && a.data && units(amount) > units(a.data.balance)) throw new Error("Insufficient USDC balance.");
			const retryKey = `skylar_withdrawal_request_${w.account}_${w.config.network}_${amount}_${currency}`;
			if (!idem.current) idem.current = sessionStorage.getItem(retryKey) || crypto.randomUUID();
			sessionStorage.setItem(retryKey, idem.current);
			let signed: string | undefined;
			if (info?.authentication) {
				setMessage("Authenticating with the payment partner…");
				const c = await api<{ xdr: string }>("/api/anchor-auth", {});
				signed = await wallet.signTransaction(c.xdr, w.config);
			}
			setMessage("Starting withdrawal…");
			const r = await api<WithdrawalSession>("/api/withdrawals", {
				amount,
				currency,
				idempotencyKey: idem.current,
				signed,
			});
			setSession(r);
			sessionStorage.setItem(`skylar_withdrawal_${w.account}_${w.config.network}`, r.id);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unable to start withdrawal.");
		} finally {
			setBusy(false);
			setMessage("");
		}
	}
	async function reconnectProvider() {
		if (!session || !w.config) return;
		setBusy(true);
		setError("");
		try {
			setMessage("Waiting for wallet approval to refresh provider access…");
			const challenge = await api<{ xdr: string }>("/api/anchor-auth", {});
			const signed = await wallet.signTransaction(challenge.xdr, w.config);
			const restored = await api<WithdrawalSession>("/api/withdrawals/reauthenticate", { id: session.id, signed });
			setSession(restored);
			await statusQuery.refetch();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not refresh provider access.");
		} finally {
			setBusy(false);
			setMessage("");
		}
	}
	async function refresh() {
		if (!session) return;
		setBusy(true);
		try {
			const result = await statusQuery.refetch();
			if (result.error) throw result.error;
			setError("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not check status.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<main className="workspace max-w-xl mx-auto px-4 py-8">
			<div className="page-heading narrow text-center mb-8">
				<span className="eyebrow inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 tracking-wide uppercase">
					Your work. Your local currency.
				</span>
				<h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Cash out</h1>
				<p className="text-sm text-zinc-400 mt-2">Convert USDC to local fiat through a compatible Stellar anchor.</p>
			</div>
			{!w.account ? (
				<ConnectPrompt />
			) : (
				<div className="card narrow bg-[#070b09]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
					<div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

					{simulatedFiat && (
						<div role="note" className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
							<strong className="block mb-1">{info?.name || session?.provider} — simulated fiat payout</strong>
							{session?.currency || currency} Testnet withdrawal. Funding uses a real Stellar Testnet USDC transfer; fiat conversion and payout are simulated. No bank payout occurs.
						</div>
					)}
					{info?.demo && (
						<div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
							<strong className="block font-semibold mb-0.5">Demo Off-Ramp</strong>
							UI simulation only. No USDC is transferred and no bank payout occurs.
						</div>
					)}
					{session ? (
						<div className="space-y-4">
							<h2 className="text-xl font-bold text-white">{session.demo ? "Demo withdrawal" : "Your withdrawal"}</h2>
							<div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
								<div className="text-3xl font-extrabold text-white tracking-tight">
									{displayAmount(session.amount)} <span className="text-sm font-medium text-emerald-400">USDC → {session.currency}</span>
								</div>
							</div>
							<div className="flex justify-between items-center py-2.5 border-b border-white/5 text-sm">
								<span className="text-zinc-400">Provider</span>
								<strong className="text-white">{session.provider}</strong>
							</div>
							<div className="flex justify-between items-center py-2.5 border-b border-white/5 text-sm">
								<span className="text-zinc-400">Status</span>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
									{simulatedFiat && session.status === "COMPLETED"
										? `Simulated ${session.currency} payout completed`
										: session.providerAccessExpired
											? "Reconnect needed"
											: {
													CREATED: "Request started",
													AWAITING_KYC: "Your details needed",
													AWAITING_USER_TRANSFER: "Ready for transfer",
													PENDING: "Transfer pending",
													PROCESSING: "Processing",
													COMPLETED: "Completed",
													FAILED: "Unsuccessful",
													EXPIRED: "Expired",
													CANCELLED: "Cancelled",
												}[session.status]}
								</span>
							</div>
							{session.amountOut && (
								<div className="flex justify-between items-center py-2.5 border-b border-white/5 text-sm">
									<span className="text-zinc-400">{simulatedFiat ? "Simulated payout amount" : "Provider payout amount"}</span>
									<strong className="text-emerald-400">{session.amountOut}</strong>
								</div>
							)}
							{session.amountFee && (
								<div className="flex justify-between items-center py-2.5 border-b border-white/5 text-sm">
									<span className="text-zinc-400">Provider fee</span>
									<strong className="text-zinc-300">{session.amountFee}</strong>
								</div>
							)}
							<WithdrawalNextStep session={session} busy={busy} reconnect={reconnectProvider} refresh={refresh} />
							<details className="group border-t border-white/10 pt-4">
								<summary className="cursor-pointer text-sm font-medium text-zinc-400 marker:text-zinc-600">Transaction details & updates</summary>
								<div className="mt-4 space-y-4 text-xs text-zinc-400">
									<div>
										<p className="mb-1">Transaction ID</p>
										<p className="break-all font-mono text-zinc-300">{session.anchorId || session.id}</p>
									</div>
									{session.withdrawalAccount && (
										<div>
											<p className="mb-1">Stellar destination</p>
											<p className="break-all font-mono">{session.withdrawalAccount}</p>
											{session.withdrawalMemo && (
												<p className="mt-2">
													Required memo ({session.withdrawalMemoType}): {session.withdrawalMemo}
												</p>
											)}
										</div>
									)}
									{session.providerAccessExpired && <p>Status shown is the last known state until you reconnect.</p>}
									{session.moreInfoUrl && (
										<a className="text-link block" href={session.moreInfoUrl} target="_blank" rel="noreferrer">
											View partner’s transaction details ↗
										</a>
									)}
									{session.fundingHash && (session.providerAccessExpired || ["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(session.status)) && (
										<FundWithdrawal id={session.id} fundingHash={session.fundingHash} />
									)}
									<button className="button secondary small w-full" disabled={busy} onClick={refresh}>
										Check withdrawal status
									</button>
									<p className="leading-relaxed">
										{session.demo
											? "Demo remains processing. No real payout is simulated."
											: "Withdrawal updates come from the payment partner. A Stellar transfer alone does not confirm a payout."}
									</p>
								</div>
							</details>
						</div>
					) : anchorQuery.isPending ? (
						<FormSkeleton />
					) : info?.available ? (
						<form onSubmit={start} className="space-y-5">
							<div className="flex justify-between items-center py-2.5 border-b border-white/5 text-sm">
								<span className="text-zinc-400">Available balance</span>
								<strong className="text-white">
									{a.data ? (
										`${displayAmount(a.data.balance)} USDC`
									) : a.error ? (
										<span role="alert" className="text-rose-400">
											Balance unavailable
										</span>
									) : (
										<span role="status" aria-label="Checking USDC balance…">
											<Skeleton className="h-5 w-24" />
										</span>
									)}
								</strong>
							</div>
							<div className="flex justify-between items-center py-2.5 border-b border-white/5 text-sm">
								<span className="text-zinc-400">Provider</span>
								<strong className="text-emerald-400">{info.name}</strong>
							</div>
							<div className="space-y-2">
								<label htmlFor="withdraw-amount" className="text-sm font-medium text-zinc-300">
									Amount · USDC
								</label>
								<input
									id="withdraw-amount"
									inputMode="decimal"
									value={amount}
									onChange={(e) => {
										setAmount(e.target.value);
										idem.current = "";
									}}
									placeholder={info.minAmount || "0.00"}
									className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all text-base"
									required
								/>
							</div>
							{(info.minAmount || info.maxAmount) && (
								<p className="text-xs text-zinc-400">
									Provider withdrawal range: {info.minAmount || "0"}–{info.maxAmount || "unlimited"} USDC.
								</p>
							)}
							<div className="space-y-2">
								<label htmlFor="currency" className="text-sm font-medium text-zinc-300">
									Local currency
								</label>
								<select
									id="currency"
									value={currency}
									onChange={(e) => {
										setCurrency(e.target.value);
										idem.current = "";
									}}
									className="w-full bg-[#0a0f0d] border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all text-sm"
								>
									{/* <option value="NGN" disabled={!info.currencies.includes("NGN")}>
										NGN
										{info.currencies.includes("NGN") ? "" : " — unavailable"}
									</option> */}
									{info.currencies
										.filter((v) => v !== "NGN")
										.map((v) => (
											<option key={v}>{v}</option>
										))}
								</select>
							</div>
							{/* {!info.currencies.includes("NGN") && (
								<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">NGN cash out is currently unavailable with this provider.</div>
							)} */}
							<div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-zinc-400 leading-relaxed">
								Rates, fees, and payout estimates will be shown by the anchor in its hosted experience. A withdrawal request does not mean fiat has been received.
							</div>
							<button
								className="w-full py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 via-[#22634b] to-[#165b43] shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={busy || !info.currencies.includes(currency)}
							>
								{info.demo ? "Start demo withdrawal" : "Continue to cash out"}
							</button>
						</form>
					) : (
						<div className="empty-state text-center p-6">
							<h2 className="text-lg font-bold text-white mb-1">A local bridge is coming.</h2>
							<p className="text-xs text-zinc-400">Cash out is currently unavailable. A compatible anchor must be configured and support your currency.</p>
						</div>
					)}
					{message && <LoadingStatus>{message}</LoadingStatus>}
					{(error || anchorQuery.error || statusQuery.error) && (
						<div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300" role="alert">
							{error || anchorQuery.error?.message || statusQuery.error?.message}
						</div>
					)}
				</div>
			)}
		</main>
	);
}
