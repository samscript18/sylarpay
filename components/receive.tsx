"use client";
import Link from "next/link";
import { useWallet, ConnectPrompt } from "./wallet-provider";
import { useAccount } from "@/lib/use-account";
import { ShareProfile } from "./share-profile";
import { Verification } from "./payment-form";
export function Receive() {
  const w = useWallet(),
    a = useAccount();
  return (
    <main className="workspace">
      <div className="page-heading narrow">
        <span className="eyebrow">From anywhere. To you.</span>
        <h1>Receive USDC</h1>
        <p>Anyone can pay you using this link.</p>
      </div>
      {!w.account ? (
        <ConnectPrompt />
      ) : a.data?.identity ? (
        <div className="card narrow profile-card">
          <div className="avatar">{a.data.profile?.displayName[0] || "@"}</div>
          <h1>@{a.data.identity.username}</h1>
          <Verification verified={a.data.identity.verified} />
          <ShareProfile
            username={a.data.identity.username}
            url={`${w.config?.appUrl}/@${a.data.identity.username}`}
          />
          <p className="tiny">
            Payments go directly to your Stellar account. Enable its USDC
            trustline in Overview before receiving.
          </p>
          <a className="text-link" href={`/@${a.data.identity.username}`}>
            Preview payment profile ↗
          </a>
        </div>
      ) : (
        <div className="empty-state">
          <h2>Your name goes here.</h2>
          <p>
            {a.error ||
              "Claim a username to get your payment link and QR code."}
          </p>
          <Link className="button" href="/claim">
            Claim your @username
          </Link>
        </div>
      )}
    </main>
  );
}
