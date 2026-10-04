import Link from "next/link";
import { NetworkStatus } from "@/components/network-status";
import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/wallet-provider";
import { Header } from "@/components/header";
export const metadata: Metadata = {
  title: "SkylarPay — Your name. Your payment.",
  description: "Get paid globally. Pay locally. Just use @username.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Header />
          {children}
          <footer>
            <Link href="/">SkylarPay</Link>
            <span>
              Payments settle on Stellar. Your experience starts here.
            </span>
            <NetworkStatus />
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
