"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useMyTag } from "@/hooks/useMyTag";
import { useOrigin } from "@/hooks/useOrigin";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/format";

import { Qr } from "./qr";
import { Avatar, Icon, Logo, type IconName } from "./ui";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/send", label: "Send", icon: "send" },
  { href: "/receive", label: "Receive", icon: "receive" },
  { href: "/history", label: "History", icon: "clock" },
  { href: "/tag", label: "My tag", icon: "at" },
];

/**
 * Phones get the app full-screen, as drawn. Desktops get a sidebar (once a
 * wallet is connected) and the page beside it; the pages themselves switch
 * to two columns in CSS.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { address } = useWallet();

  return (
    <div className={`shell${address ? "" : " solo"}`}>
      {address && <Sidebar address={address} pathname={pathname} />}
      <div className="shell-main">
        <span aria-hidden="true" className="stage-glow float" style={{ right: -160, top: -200, width: 620, height: 620, background: "#C9D8FF", opacity: 0.8 }} />
        <span aria-hidden="true" className="stage-glow float" style={{ left: -220, bottom: -260, width: 560, height: 560, background: "#DCD3FF", opacity: 0.55, animationDelay: "-2.5s" }} />
        <div key={pathname} className="frame page-enter">
          <div className="frame-in">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ address, pathname }: { address: string; pathname: string }) {
  const router = useRouter();
  const { disconnect } = useWallet();
  const myTag = useMyTag(address);
  const origin = useOrigin();
  const tag = myTag.data?.tag;
  const active = NAV.find((n) => pathname === n.href || (n.href !== "/app" && pathname.startsWith(n.href)))?.href;

  return (
    <aside className="side-nav" aria-label="TagIt">
      <Link className="logo-link" href="/app" aria-label="TagIt home" style={{ padding: "2px 10px 22px" }}>
        <Logo />
      </Link>
      <nav aria-label="Main" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map((n) => {
          const on = active === n.href;
          return (
            <Link key={n.href} href={n.href} className={`nav-item${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
              {on && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span className="nav-ic">
                <Icon name={n.icon} size={17} sw={2.3} />
              </span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <Link href="/send" className="btn press" style={{ height: 50, marginTop: 14, fontSize: 15 }}>
        <Icon name="send" size={17} /> Send money
      </Link>

      <div style={{ flex: 1 }} />

      {origin && (
        <div className="row" style={{ gap: 12, padding: 12, borderRadius: 18, background: "#F7F8FA", marginBottom: 10 }}>
          <div style={{ padding: 5, borderRadius: 10, background: "#fff", lineHeight: 0 }}>
            <Qr value={origin + pathname} size={58} label="QR code to open this page on your phone" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
            Open on your phone
            <div className="mute" style={{ fontSize: 12, fontWeight: 600 }}>
              Scan with your camera
            </div>
          </div>
        </div>
      )}
      <div className="row" style={{ gap: 10, padding: 12, borderRadius: 18, border: "1px solid #EEF0F4" }}>
        {myTag.isPending ? (
          <span className="skel" style={{ width: 40, height: 40, borderRadius: "50%" }} />
        ) : (
          <Avatar seed={tag ?? address} label={tag ?? address} size={40} />
        )}
        <div className="grow">
          <div style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {myTag.isPending ? <span className="skel" style={{ display: "block", width: 80, height: 14 }} /> : tag ? `@${tag}` : "No tag yet"}
          </div>
          <div className="mono mute" style={{ fontSize: 11 }}>
            {shortAddress(address)}
          </div>
        </div>
        <span className="badge b-green" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>
          <span className="dot" />
          Testnet
        </span>
      </div>
      <button
        type="button"
        className="row press"
        onClick={() => void disconnect().then(() => router.push("/app"))}
        style={{ height: 44, marginTop: 6, padding: "0 12px", border: 0, borderRadius: 14, background: "none", color: "#B42318", fontSize: 14, fontWeight: 800 }}
      >
        <Icon name="logout" size={17} sw={2.3} /> Disconnect
      </button>
    </aside>
  );
}
