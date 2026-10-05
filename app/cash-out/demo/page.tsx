import Link from "next/link";
import { getConfig } from "@/lib/config";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default function Page() {
	if (!getConfig().demo) notFound();
	return (
		<main className="workspace">
			<div className="card narrow">
				<span className="eyebrow">Demo Off-Ramp</span>
				<h1>Partner experience</h1>
				<p>This page illustrates the handoff to a payment partner. A real anchor hosts its own verification and payout flow.</p>
				<div className="notice">No KYC information is collected. No funds move. No bank payout occurs.</div>
				<Link href="/cash-out" className="button">
					Return to SylarPay
				</Link>
			</div>
		</main>
	);
}
