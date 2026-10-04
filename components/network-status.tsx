"use client";
import { useWallet } from "./wallet-provider";
export function NetworkStatus({ tag = false }: { tag?: boolean }) {
  const { config } = useWallet();
  return tag ? (
    <span className="testnet-tag">
      {config?.network === "mainnet" ? "MAINNET" : "TESTNET"}
    </span>
  ) : (
    <span>
      {config?.network === "mainnet"
        ? "Stellar Mainnet"
        : "Testnet MVP · Test assets have no monetary value"}
    </span>
  );
}
