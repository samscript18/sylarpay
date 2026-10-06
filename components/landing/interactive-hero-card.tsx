import Link from "next/link";
import { ArrowUpRight, Check, AtSign } from "lucide-react";
import evidence from "@/docs/LIVE-TEST.json";
import { explorer } from "@/lib/config";

export function InteractiveHeroCard({ appUrl }: { appUrl: string }) {
  const profileUrl = `${appUrl.replace(/\/$/, "")}/@${evidence.username}`;
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0c100e] p-6 text-left shadow-2xl sm:p-8">
      <div className="flex items-center justify-between gap-4 text-xs text-neutral-400">
        <span>Existing Testnet payment</span>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">Ledger evidence</span>
      </div>
      <div className="mt-7 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><AtSign size={26} /></div>
        <div><p className="text-2xl font-semibold">@{evidence.username}</p><p className="mt-1 text-sm text-neutral-400">A name your client can remember.</p></div>
      </div>
      <div className="my-7 border-y border-white/10 py-6">
        <p className="text-sm text-neutral-400">Received in the recorded demo</p>
        <p className="mt-2 text-5xl font-semibold tracking-tight">${evidence.amount}<span className="ml-2 text-lg font-normal text-neutral-400">USDC</span></p>
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-300"><Check size={16} /> Confirmed on Stellar Testnet</p>
        <p className="mt-2 text-xs leading-relaxed text-neutral-400">Historical transaction · {evidence.checkedAt.slice(0, 10)} · test assets have no monetary value.</p>
      </div>
      <Link href={`/@${evidence.username}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black">Open @sam’s payment profile <ArrowUpRight size={17} /></Link>
      <p className="mt-3 break-all text-xs text-neutral-400">{profileUrl}</p>
      <a className="mt-5 inline-flex items-center gap-2 text-sm text-emerald-300" href={explorer("testnet", evidence.txHash)} target="_blank" rel="noopener noreferrer">Inspect the actual transaction <ArrowUpRight size={15} /></a>
    </div>
  );
}
