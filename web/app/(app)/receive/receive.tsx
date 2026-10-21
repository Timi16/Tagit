"use client";

import Link from "next/link";

import { Qr } from "@/components/qr";
import { Avatar, Icon, Screen, Toast, TopBack } from "@/components/ui";
import { useMyTag } from "@/hooks/useMyTag";
import { useOrigin } from "@/hooks/useOrigin";
import { useToast } from "@/hooks/useToast";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/format";

/** AppReceive.dc.html: QR and pay link for your tag (or your address). */
export function Receive() {
  const { address } = useWallet();
  const myTag = useMyTag(address);
  const toast = useToast();
  const origin = useOrigin();
  if (!address) return null;

  const tag = myTag.data?.tag;
  const link = tag ? `${origin}/@${tag}` : "";
  const qrValue = tag ? link : address;
  const copy = (text: string, done: string) => void navigator.clipboard?.writeText(text).then(() => toast.show(done));

  async function share() {
    const text = tag ? `Pay me on TagIt: @${tag}` : "My Stellar Testnet address";
    if (navigator.share) {
      try {
        await navigator.share({ title: "TagIt", text, url: tag ? link : undefined });
        return;
      } catch {
        // Cancelled: fall back to copying.
      }
    }
    copy(tag ? link : address!, tag ? "Link copied" : "Address copied");
  }

  return (
    <Screen
      header={<TopBack title="Receive" href="/app" />}
      bodyStyle={{ paddingTop: 4 }}
      dockStyle={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
      overlay={<Toast text={toast.text} />}
      side={
        <>
      <section className="card rise d2" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="lbl">{tag ? "Or your full wallet address" : "Your full wallet address"}</span>
          <button
            type="button"
            className="press"
            aria-label="Copy address"
            onClick={() => copy(myTag.data?.record.wallet ?? address, "Address copied")}
            style={{ border: 0, background: "#F2F4F7", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="copy" size={16} />
          </button>
        </div>
        <div className="mono" style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 600, wordBreak: "break-all" }}>
          {myTag.data?.record.wallet ?? address}
        </div>
      </section>
      <div className="note rise d3">
        <Icon name="warn" size={17} /> Only send XLM or USDC on Stellar Testnet.
      </div>
        </>
      }
      dock={
        <>
          <button type="button" className="btn ghost press" onClick={() => copy(tag ? link : address, tag ? "Link copied" : "Address copied")}>
            <Icon name="copy" size={16} /> {tag ? "Copy link" : "Copy address"}
          </button>
          <button type="button" className="btn press" onClick={() => void share()}>
            <Icon name="share" size={18} /> Share
          </button>
        </>
      }
    >
      <section className="card rise d1" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "24px 20px", textAlign: "center" }}>
        <div className="row" style={{ gap: 10 }}>
          <Avatar seed={tag ?? address} label={tag ?? address} size={48} style={{ background: "#1F5EFF" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em" }}>{tag ? `@${tag}` : shortAddress(address)}</div>
            <div className="mute" style={{ fontSize: 13, fontWeight: 600 }}>
              Scan or share to get paid
            </div>
          </div>
        </div>
        <div className="pop d3" style={{ position: "relative", padding: 14, borderRadius: 24, border: "1px solid #EEF0F4", background: "#fff", width: 244, height: 244 }}>
          {(tag ? origin : true) && myTag.isSuccess && <Qr value={qrValue} size={214} label={tag ? `QR code for @${tag}` : "QR code for your wallet address"} />}
          {!myTag.isSuccess && <div className="skel" style={{ width: 214, height: 214 }} />}
          <span
            aria-hidden="true"
            style={{ position: "absolute", left: 10, right: 10, height: 3, borderRadius: 3, background: "#1F5EFF", boxShadow: "0 0 18px 4px rgba(31,94,255,.45)", animation: "scan 3.2s ease-in-out infinite" }}
          />
        </div>
        {tag ? (
          <button type="button" className="chip press" onClick={() => copy(link, "Link copied")} style={{ height: 44, background: "#EEF3FF", borderColor: "#EEF3FF", color: "#1F5EFF", maxWidth: "100%" }}>
            <Icon name="link" size={16} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.replace(/^https?:\/\//, "")}</span>
            <Icon name="copy" size={16} />
          </button>
        ) : (
          <Link href="/claim" className="chip press" style={{ height: 44, background: "#EEF3FF", borderColor: "#EEF3FF", color: "#1F5EFF" }}>
            <Icon name="at" size={16} /> Claim a tag for a pay link
          </Link>
        )}
      </section>
    </Screen>
  );
}
