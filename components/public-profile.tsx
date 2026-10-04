"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Recipient } from "@/lib/payment-client";
import { PaymentForm, Verification } from "./payment-form";
import { ShareProfile } from "./share-profile";
import { useWallet } from "./wallet-provider";
export function PublicProfile({
  username,
  amount,
}: {
  username: string;
  amount?: string;
}) {
  const w = useWallet();
  const [recipient, setRecipient] = useState<Recipient | null>(null),
    [error, setError] = useState(""),
    [pay, setPay] = useState(false);
  useEffect(() => {
    api<Recipient>(`/api/users/${username}`)
      .then(setRecipient)
      .catch((e) => setError(e.message));
  }, [username]);
  return (
    <main className="workspace">
      {error ? (
        <div className="empty-state">
          <h1>Profile unavailable</h1>
          <p role="alert">{error}</p>
          <Link className="button secondary" href="/">
            Back to SkylarPay
          </Link>
        </div>
      ) : !recipient ? (
        <div className="notice narrow" role="status">
          Resolving @{username}…
        </div>
      ) : (
        <>
          <div className="card narrow profile-card">
            <div className="avatar">
              {recipient.profile?.displayName?.[0] || username[0].toUpperCase()}
            </div>
            <h1>@{username}</h1>
            <Verification verified={recipient.verified} />
            <p className="bio">
              {recipient.profile?.displayName}
              <br />
              {recipient.profile?.bio || "Available for USDC payments"}
            </p>
            <button className="button full" onClick={() => setPay(true)}>
              Pay @{username} ↗
            </button>
            {w.config?.appUrl ? (
              <ShareProfile
                username={username}
                url={`${w.config.appUrl.replace(/\/$/, "")}/@${username}`}
              />
            ) : (
              <p role="status" className="tiny">
                Preparing payment link…
              </p>
            )}
            <details>
              <summary className="tiny">
                View Stellar destination & verification
              </summary>
              <div className="account">{recipient.address}</div>
              <p className="tiny">
                Skylar Verified checks wallet ownership and public profile
                setup. It does not mean government identity verification.
              </p>
            </details>
          </div>
          {pay && (
            <section style={{ marginTop: 25 }} aria-label="Pay recipient">
              <PaymentForm
                initialUsername={username}
                initialAmount={amount}
                recipient={recipient}
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}
