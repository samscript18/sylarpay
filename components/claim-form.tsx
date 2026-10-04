"use client";
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
        const a = await api<{ available: boolean }>(
          `/api/availability?username=${n}`,
        );
        if (active) {
          setAvailable(a.available);
          setError("");
        }
      } catch (e) {
        if (active) {
          setAvailable(null);
          setError(
            e instanceof Error ? e.message : "Could not check availability.",
          );
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
      const identity = await api<{ address: string }>(
        `/api/users/${usernameSchema.parse(name)}`,
      );
      if (identity.address !== w.account)
        throw new Error("This username belongs to another account.");
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
      localStorage.setItem("skylar_username", username);
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
    <form className="card narrow" onSubmit={claim}>
      <div className="field">
        <label htmlFor="username">Your @username</label>
        <input
          id="username"
          value={name}
          disabled={registered}
          onChange={(e) => {
            setName(e.target.value);
            setAvailable(null);
          }}
          placeholder="@sam"
          required
        />
        <div className="hint">
          3–24 letters, numbers, or underscores. Stored lowercase.
        </div>
        {available !== null && (
          <div className={`notice ${available ? "" : "error"}`} role="status">
            {available
              ? `@${name.replace(/^@/, "").toLowerCase()} is available.`
              : "That username is already taken."}
          </div>
        )}
      </div>
      {available === false && !registered && (
        <button
          type="button"
          className="button secondary small"
          onClick={recoverProfile}
        >
          I already own this username
        </button>
      )}
      <div className="field">
        <label htmlFor="displayName">Public display name</label>
        <input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          minLength={2}
          maxLength={60}
          placeholder="Sam"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="bio">Public bio · optional</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          placeholder="Independent designer, open to great projects."
        />
      </div>
      <div className="notice">
        Skylar Verified means wallet ownership and public profile setup were
        checked by SkylarPay. It is not government identity verification.
      </div>
      <button
        className="button full"
        disabled={busy || (!registered && available !== true)}
      >
        {registered ? "Save profile & verify" : "Claim your @username"}
      </button>
      {status && (
        <p className="notice" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <p className="tiny">
        Your username belongs to your Stellar account. Losing wallet access
        means losing access to the username. Transfer it while you still have
        access.
      </p>
    </form>
  );
}
