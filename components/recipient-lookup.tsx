"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { api } from "@/lib/api";
import { usernameSchema } from "@/lib/validation";
import type { Recipient } from "@/lib/payment-client";
import { Skeleton } from "./skeleton";

export function RecipientLookup({ value, network, onSelect }: { value: string; network?: string; onSelect: (recipient: Recipient) => void }) {
	const normalized = value.trim().replace(/^@/, "").toLowerCase();
	const [debounced, setDebounced] = useState("");
	const valid = usernameSchema.safeParse(value).success;
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(normalized), 350);
		return () => clearTimeout(timer);
	}, [normalized]);
	const query = useQuery({
		queryKey: ["recipients", network, debounced],
		queryFn: ({ signal }) => api<{ matches: Recipient[] }>(`/api/recipients?query=${encodeURIComponent(debounced)}`, undefined, { signal }),
		enabled: valid && normalized === debounced,
		retry: false,
		staleTime: 0,
	});
	if (!normalized) return null;
	if (!/^[a-z0-9_]{1,24}$/.test(normalized))
		return (
			<p className="recipient-error" role="alert">
				Use 3–24 letters, numbers, or underscores.
			</p>
		);
	if (!valid) return <p className="hint">Type at least 3 characters to find a recipient.</p>;
	if (normalized !== debounced || query.isPending || query.isFetching)
		return (
			<div className="recipient-matches recipient-lookup-skeleton" role="status" aria-label={`Resolving @${normalized}…`} aria-busy="true">
				<span className="sr-only">Resolving @{normalized}…</span>
				<Skeleton className="size-9 rounded-full shrink-0" />
				<div className="flex-1">
					<Skeleton className="mb-2 h-3 w-24" />
					<Skeleton className="h-2 w-36 max-w-full" />
				</div>
			</div>
		);
	if (query.error)
		return (
			<p className="recipient-error" role="alert">
				{query.error.message}{" "}
				<button className="text-link" type="button" onClick={() => void query.refetch()}>
					Retry lookup
				</button>
			</p>
		);
	if (!query.data?.matches.length)
		return (
			<p className="recipient-error" role="alert">
				No matching accounts for @{normalized}. Check the username and try again.
			</p>
		);
	return (
		<ul className="recipient-matches" aria-label="Matching accounts">
			{query.data.matches.map((recipient) => (
				<li key={recipient.username}>
					<button type="button" className="recipient-match" onClick={() => onSelect(recipient)} aria-label={`Select @${recipient.username}`}>
						<span className="recipient-match-avatar" aria-hidden="true">
							{(recipient.profile?.displayName || recipient.username)[0].toUpperCase()}
						</span>
						<span className="min-w-0 flex-1">
							<span className="recipient-match-name">
								<strong className="truncate">@{recipient.username}</strong>
								{recipient.verified ? (
									<span className="recipient-verified" role="img" aria-label="Sylar Verified" title="Sylar Verified">
										<Check size={10} strokeWidth={3} aria-hidden="true" />
									</span>
								) : (
									<span className="recipient-unverified">Unverified</span>
								)}
							</span>
							<span className="recipient-match-meta">
								<span className="truncate">{recipient.profile?.displayName || `@${recipient.username}`}</span>
								<span aria-hidden="true">·</span>
								<span className="shrink-0" title={recipient.address}>
									{recipient.address.slice(0, 4)}…{recipient.address.slice(-4)}
								</span>
							</span>
						</span>
						<ArrowRight size={15} className="recipient-match-arrow" aria-hidden="true" />
					</button>
				</li>
			))}
		</ul>
	);
}
