"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMyTag } from "@/hooks/useMyTag";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/format";

import { Avatar, Icon, LogoLink, type IconName } from "./ui";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/send", label: "Send", icon: "send" },
  { href: "/receive", label: "Receive", icon: "receive" },
  { href: "/history", label: "History", icon: "clock" },
  { href: "/tag", label: "My tag", icon: "at" },
];

/** The slide-down menu from AppHome.dc.html. */
export function Menu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { address, disconnect } = useWallet();
  const myTag = useMyTag(address);
  if (!address) return null;
  const tag = myTag.data?.tag;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <nav
        aria-label="Menu"
        style={{
          position: "absolute",
          zIndex: 10,
          left: 12,
          right: 12,
          top: 12,
          padding: "12px 14px 16px",
          borderRadius: 28,
          background: "#fff",
          animation: "down .35s cubic-bezier(.2,.8,.2,1) both",
          boxShadow: "0 30px 60px -20px rgba(13,19,33,.45)",
        }}
      >
        <div className="row" style={{ padding: "2px 0 10px 4px" }}>
          <LogoLink href="/app" onClick={onClose} />
          <span className="grow" />
          <button type="button" className="ib press" style={{ background: "#F2F4F7", boxShadow: "none" }} aria-label="Close menu" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="row" style={{ padding: 12, marginBottom: 6, borderRadius: 18, background: "#F7F8FA" }}>
          <Avatar seed={tag ?? address} label={tag ?? address} size={42} />
          <div className="grow">
            <div style={{ fontSize: 15, fontWeight: 800 }}>{tag ? `@${tag}` : "No tag yet"}</div>
            <div className="mono mute" style={{ fontSize: 12 }}>
              {shortAddress(address)}
            </div>
          </div>
          <span className="badge b-green">
            <span className="dot" />
            Testnet
          </span>
        </div>
        {LINKS.map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            className={`row press rise d${i + 1}`}
            style={{ height: 54, padding: "0 6px", fontSize: 16, fontWeight: 800 }}
          >
            <span className="av" style={{ width: 38, height: 38, borderRadius: 12, background: "#EEF3FF", color: "#1F5EFF" }}>
              <Icon name={l.icon} size={18} sw={2.3} />
            </span>
            <span className="grow">{l.label}</span>
            <span className="mute">
              <Icon name="chevron" size={17} />
            </span>
          </Link>
        ))}
        <div style={{ height: 1, background: "#F0F2F5", margin: "8px 0" }} />
        <button
          type="button"
          className="row press"
          style={{ width: "100%", height: 50, padding: "0 6px", border: 0, background: "none", fontSize: 16, fontWeight: 800, color: "#B42318" }}
          onClick={() => {
            onClose();
            void disconnect().then(() => router.push("/app"));
          }}
        >
          <span className="av" style={{ width: 38, height: 38, borderRadius: 12, background: "#FEECEB", color: "#B42318" }}>
            <Icon name="logout" size={18} sw={2.3} />
          </span>
          Disconnect wallet
        </button>
      </nav>
    </>
  );
}
