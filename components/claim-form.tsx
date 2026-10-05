"use client";
import { LoadingStatus } from "./skeleton";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { usernameSchema } from "@/lib/validation";
import { wallet } from "@/lib/wallet";
import { useWallet, ConnectPrompt } from "./wallet-provider";
export function ClaimForm() {
	const w = useWallet(),
		router = useRouter();
	const [name, setName] = useState(""),
		[displayName, setDisplayName] = useState(""),
		[bio, setBio] = useState(""),
		[available, setAvailable] = useState<boolean | null>(null),
		[error, setError] = useState(""),
		[status, setStatus] = useState(""),
		[busy, setBusy] = useState(false),
		[registered, setRegistered] = useState(false);
	useEffect(() => {
		if (!name) return;
		let active = true;
		const timer = setTimeout(async () => {
			try {
				const n = usernameSchema.parse(name);
				const a = await api<{ available: boolean }>(`/api/availability?username=${n}`);
				if (active) {
					setAvailable(a.available);
					setError("");
				}
			} catch (e) {
				if (active) {
					setAvailable(null);
					setError(e instanceof Error ? e.message : "Could not check availability.");
				}
			}
		}, 350);
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [name]);
	async function recoverProfile() {
		try {
			const identity = await api<{ address: string }>(`/api/users/${usernameSchema.parse(name)}`);
			if (identity.address !== w.account) throw new Error("This username belongs to another account.");
			setRegistered(true);
			setError("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not confirm ownership.");
		}
	}
	async function claim(e: React.FormEvent) {
		e.preventDefault();
		if (!w.config) return;
		setBusy(true);
		setError("");
		try {
			const username = usernameSchema.parse(name);
			if (!registered) {
				setStatus(`Preparing @${username}…`);
				const r = await api<{ xdr: string }>("/api/registry/prepare", {
					method: "register",
					username,
				});
				setStatus("Waiting for wallet approval…");
				const signed = await wallet.signTransaction(r.xdr, w.config);
				setStatus("Confirming your username on Stellar…");
				await api("/api/registry/submit", { signed });
				setRegistered(true);
			}
			setStatus("Saving your public profile and checking verification…");
			await api("/api/profile", { username, displayName, bio });
			localStorage.setItem("sylar_username", username);
			router.push("/dashboard");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unable to claim username.");
		} finally {
			setBusy(false);
			setStatus("");
		}
	}
	if (!w.account) return <ConnectPrompt />;
	return (
		<form className="card narrow max-w-lg mx-auto bg-[#070b09]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden" onSubmit={claim}>
			<div className="absolute -top-24 right-0 w-60 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

			<div className="relative z-10 space-y-5">
				<div className="field space-y-2">
					<label htmlFor="username" className="text-sm font-medium text-zinc-300 flex items-center justify-between">
						<span>Your @username</span>
						{available === true && (
							<span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
								<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Available
							</span>
						)}
					</label>
					<div className="relative">
						<input
							id="username"
							aria-label="Your @username"
							value={name}
							disabled={registered}
							onChange={(e) => {
								setName(e.target.value);
								setAvailable(null);
								setError("");
							}}
							placeholder="@sam"
							className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all text-base"
							required
						/>
					</div>
					<div className="hint text-xs text-zinc-500">3–24 letters, numbers, or underscores. Stored lowercase on Soroban registry.</div>
					{available === null && !error && usernameSchema.safeParse(name).success && <LoadingStatus>Checking username availability on Stellar…</LoadingStatus>}
					{available !== null && (
						<div
							className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
								available ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
							}`}
							role="status"
						>
							<span className={`w-2 h-2 rounded-full ${available ? "bg-emerald-400" : "bg-rose-400"}`} />
							{available ? `@${name.replace(/^@/, "").toLowerCase()} is available.` : "That username is already taken."}
						</div>
					)}
				</div>

				{available === false && !registered && (
					<button type="button" className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors" onClick={recoverProfile}>
						I already own this username with this wallet
					</button>
				)}

				<div className="field space-y-2">
					<label htmlFor="displayName" className="text-sm font-medium text-zinc-300">
						Public display name
					</label>
					<input
						id="displayName"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						minLength={2}
						maxLength={60}
						placeholder="Sam Doe"
						className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all text-base"
						required
					/>
				</div>

				<div className="field space-y-2">
					<label htmlFor="bio" className="text-sm font-medium text-zinc-300 flex items-center justify-between">
						<span>Public bio</span>
						<span className="text-xs text-zinc-500 font-normal">{bio.length}/160</span>
					</label>
					<textarea
						id="bio"
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						maxLength={160}
						rows={3}
						placeholder="Independent designer & builder. Open to international contracts."
						className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all text-sm resize-none"
					/>
				</div>

				<div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-zinc-400 leading-relaxed">
					<strong className="text-zinc-300 block mb-0.5">✓ Sylar Verified</strong>
					Wallet ownership and profile setup will be registered. This builds trust without exposing your private identity.
				</div>

				<button
					className="w-full py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 via-[#22634b] to-[#165b43] shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
					disabled={busy || (!registered && available !== true)}
				>
					{registered ? "Save profile & verify" : "Claim your @username"}
				</button>

				{status && <LoadingStatus>{status}</LoadingStatus>}

				{error && (
					<div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300" role="alert">
						{error}
					</div>
				)}

				<p className="text-[11px] text-zinc-500 text-center leading-normal">Your username is secured on-chain by your Stellar public key.</p>
			</div>
		</form>
	);
}
