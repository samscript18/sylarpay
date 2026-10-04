"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, QrCode, Check } from "lucide-react";
export function ShareProfile({
  username,
  url,
}: {
  username: string;
  url: string;
}) {
  const [qr, setQr] = useState(false),
    [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Payment link copied.");
    } catch {
      setMessage("Copy this link from the field above.");
    }
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: `Pay @${username}`, url });
      else await copy();
    } catch {
      setMessage("Sharing cancelled. You can copy the link instead.");
    }
  }
  return (
    <>
      <div className="link-box">{url}</div>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="button secondary small" onClick={copy}>
          <Copy size={15} />
          Copy link
        </button>
        <button className="button secondary small" onClick={share}>
          <Share2 size={15} />
          Share
        </button>
        <button
          className="button secondary small"
          onClick={() => setQr(!qr)}
          aria-expanded={qr}
        >
          <QrCode size={15} />
          {qr ? "Hide QR" : "Show QR"}
        </button>
      </div>
      {qr && (
        <div className="qr">
          <QRCodeSVG
            value={url}
            size={200}
            marginSize={3}
            title={`Payment link for @${username}`}
          />
        </div>
      )}
      {message && (
        <p className="notice" role="status">
          <Check size={12} style={{ display: "inline" }} /> {message}
        </p>
      )}
    </>
  );
}
