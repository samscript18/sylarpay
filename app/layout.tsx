import Link from "next/link";
import { NetworkStatus } from "@/components/network-status";
import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/wallet-provider";
import { Header } from "@/components/header";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
	title: "SylarPay — Get paid with a Stellar @username",
	description: "Receive USDC with a Stellar @username, link or QR. Verify Testnet payments on-chain. Cash-out depends on a compatible anchor; reference fiat payout is simulated.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<body className="min-h-screen bg-[#030504] text-[#f8fafc] antialiased selection:bg-emerald-500/25 selection:text-[#d7edb5]">
				<WalletProvider>
					{/* Top Floating Navbar */}
					<Header />

					{/* Ambient Background Glow for All Pages */}
					<div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
						<div
							className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] max-w-5xl h-[450px] opacity-25 blur-[120px]"
							style={{
								background: "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.4) 0%, rgba(34, 99, 75, 0.2) 50%, transparent 75%)",
							}}
						/>
						<div className="absolute inset-0 mx-auto max-w-7xl border-r border-l border-white/[0.03]" />
					</div>

					{/* Page Content */}
					<div className="relative z-10">{children}</div>

					{/* Morrow-Style Minimalist Footer */}
					<footer className="relative z-10 border-t border-white/[0.06] bg-[#030504]/90 backdrop-blur-md">
						<div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 py-8 px-6 text-xs text-neutral-500">
							<Link href="/" className="inline-flex items-center">
								<Logo size="sm" showWordmark />
							</Link>

							<span className="font-light text-center">The blockchain handles settlement. SylarPay handles the experience.</span>

							<div className="flex items-center gap-3">
								<NetworkStatus />
							</div>
						</div>
					</footer>
				</WalletProvider>
			</body>
		</html>
	);
}
