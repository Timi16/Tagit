"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Menu } from "@/components/menu";
import { CountUp, Tilt } from "@/components/motion";
import { Qr } from "@/components/qr";
import { NoTransactions, TxRow } from "@/components/tx-row";
import { Avatar, Icon, Logo, Toast, UsdcMark, XlmMark } from "@/components/ui";
import { accountKey, useBalances } from "@/hooks/useBalances";
import { useHistory } from "@/hooks/useHistory";
import { useMyTag } from "@/hooks/useMyTag";
import { useOrigin } from "@/hooks/useOrigin";
import { useToast } from "@/hooks/useToast";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/format";

const HIDE_KEY = "tagit:hide-balances";

/**
 * AppHome.dc.html, or AppHomeEmpty.dc.html before a tag and a first payment.
 * On desktop: wallet + history on the left; balances, send again and the pay
 * link on the right. On a phone the same pieces stack in the drawn order.
 */
export function Home() {
  const { address } = useWallet();
  const myTag = useMyTag(address);
  const account = useBalances(address);
  const history = useHistory(address);
  const queryClient = useQueryClient();
  const origin = useOrigin();
  const [menu, setMenu] = useState(false);
  // Home only renders on the client (after the wallet check), so this is safe.
  const [hide, setHide] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [funding, setFunding] = useState<"idle" | "busy" | "failed">("idle");
  const toast = useToast();

  if (!address) return null;
  const tag = myTag.data?.tag;
  const info = account.data;
  const items = history.data ?? [];
  const link = tag && origin ? `${origin}/@${tag}` : "";

  // "Send again": people you've paid by tag, most recent first.
  const recent: string[] = [];
  for (const i of items) {
    if (i.direction === "sent" && i.counterpartyTag && !recent.includes(i.counterpartyTag)) recent.push(i.counterpartyTag);
  }

  function toggleHide() {
    setHide((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? "0" : "1");
      } catch {
        // ignore
      }
      return !h;
    });
  }

  async function fund() {
    setFunding("busy");
    try {
      const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(address!)}`);
      if (!res.ok) throw new Error(String(res.status));
      await queryClient.invalidateQueries({ queryKey: accountKey(address) });
      setFunding("idle");
    } catch {
      setFunding("failed");
    }
  }

  const balance = (code: "XLM" | "USDC") => {
    if (!info) return <span className="skel" style={{ display: "inline-block", width: 72, height: 18 }} />;
    if (hide) return code === "XLM" ? "•••••" : "••••";
    if (!info.exists) return "0.00";
    const units = info.balances[code];
    if (units === null) return <span className="mute" style={{ fontSize: 13, fontWeight: 700 }}>Not added</span>;
    return <CountUp units={units} />;
  };

  return (
    <div className="app">
      <header className="top rise home-top">
        <Link className="logo-link" href="/app" aria-label="TagIt home">
          <Logo />
        </Link>
        <button type="button" className="ib press" aria-label="Open menu" onClick={() => setMenu(true)}>
          <Icon name="menu" size={22} />
        </button>
      </header>
      <div className="body nodock">
        <main className="pad cols" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="cmain">
            <Tilt className="hero rise d1" aria-label="Your wallet" style={{ order: 1 }}>
              <div className="row" style={{ position: "relative", zIndex: 1, marginBottom: 18 }}>
                {tag ? (
                  <span className="av" style={{ width: 52, height: 52, background: "#fff", color: "#1F5EFF", fontSize: 21 }}>
                    {tag[0].toUpperCase()}
                  </span>
                ) : (
                  <span className="av" style={{ width: 52, height: 52, background: "rgba(255,255,255,.2)", color: "#fff" }}>
                    <Icon name="wallet" size={24} />
                  </span>
                )}
                <div className="grow">
                  {tag ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.82 }}>Welcome back</div>
                      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{tag}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.03em" }}>Welcome</div>
                  )}
                </div>
                <button
                  type="button"
                  className="press"
                  aria-label="Copy wallet address"
                  onClick={() => void navigator.clipboard?.writeText(address).then(() => toast.show("Address copied"))}
                  style={{ flex: "0 0 auto", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", border: 0, borderRadius: 999, background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 12, fontWeight: 700 }}
                >
                  <span className="mono">{shortAddress(address)}</span>
                  <Icon name="copy" size={13} sw={2.4} />
                </button>
              </div>
              <div className="acts">
                <Link href="/send" className="act press">
                  <span>
                    <Icon name="send" size={17} />
                  </span>
                  Send
                </Link>
                <Link href="/receive" className="act press">
                  <span>
                    <Icon name="receive" size={17} />
                  </span>
                  Receive
                </Link>
                <Link href={tag ? "/tag" : "/claim"} className="act press">
                  <span>
                    <Icon name="at" size={17} />
                  </span>
                  {tag ? "My tag" : "Claim tag"}
                </Link>
              </div>
            </Tilt>

            {info && !info.exists && (
              <button
                type="button"
                onClick={() => void fund()}
                disabled={funding === "busy"}
                className="row press rise d2 hov"
                style={{ order: 2, padding: 16, border: 0, borderRadius: 22, background: "#FEF4E6", color: "#B54708", textAlign: "left" }}
              >
                <span className="av" style={{ width: 48, height: 48, borderRadius: 15, background: "#F79009" }}>
                  {funding === "busy" ? <span className="spin" style={{ borderColor: "#FDE3C4", borderTopColor: "#fff" }} /> : <Icon name="wallet" size={22} stroke="#fff" />}
                </span>
                <div className="grow">
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Activate on Testnet</div>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>
                    {funding === "failed" ? "Friendbot didn't answer. Tap to try again." : "Get 10,000 free test XLM from Friendbot"}
                  </div>
                </div>
                <Icon name="chevron" size={18} />
              </button>
            )}

            {myTag.isSuccess && !tag && (
              <Link href="/claim" className="row press rise d2 hov" style={{ order: 3, position: "relative", overflow: "hidden", padding: 16, borderRadius: 22, background: "#0D1321", color: "#fff" }}>
                <span className="av float" style={{ width: 48, height: 48, borderRadius: 15, background: "#1F5EFF", fontSize: 24 }}>
                  @
                </span>
                <div className="grow">
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Claim your @tag</div>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>So friends can pay you by name</div>
                </div>
                <span className="av" style={{ width: 34, height: 34, background: "rgba(255,255,255,.12)" }}>
                  <Icon name="chevron" size={18} />
                </span>
              </Link>
            )}

            <div style={{ order: 6, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="row rise d4" style={{ justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 800 }}>Transaction History</span>
                <Link href="/history" style={{ fontSize: 14, fontWeight: 700, color: "#1F5EFF" }}>
                  See all
                </Link>
              </div>
              {history.isPending ? (
                <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="row">
                      <span className="skel" style={{ width: 42, height: 42, borderRadius: "50%" }} />
                      <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span className="skel" style={{ width: "40%", height: 12 }} />
                        <span className="skel" style={{ width: "60%", height: 10 }} />
                      </div>
                    </div>
                  ))}
                </section>
              ) : items.length === 0 ? (
                history.isError ? (
                  <div className="err">
                    <Icon name="warn" size={17} /> Couldn&apos;t load your history right now.
                  </div>
                ) : (
                  <NoTransactions />
                )
              ) : (
                <section className="card rise d4 stagger" style={{ padding: "4px 16px" }}>
                  {items.slice(0, 6).map((item, i) => (
                    <TxRow key={item.id} item={item} className={i >= 4 ? "desk-flex" : undefined} />
                  ))}
                </section>
              )}
            </div>
          </div>

          <div className="cside">
            <section className="card rise d2" aria-label="Balance" style={{ order: 4, padding: "12px 18px" }}>
              <div className="row" style={{ justifyContent: "space-between", padding: "6px 0 4px" }}>
                <span className="lbl">Wallet balance</span>
                <button
                  type="button"
                  className="press"
                  aria-label={hide ? "Show balances" : "Hide balances"}
                  onClick={toggleHide}
                  style={{ border: 0, background: "#F2F4F7", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}
                >
                  <Icon name={hide ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
              <div className="row" style={{ padding: "10px 0" }}>
                <XlmMark />
                <div className="grow">
                  <div style={{ fontSize: 15, fontWeight: 800 }}>XLM</div>
                  <div className="mute" style={{ fontSize: 12, fontWeight: 600 }}>
                    Stellar Lumens
                  </div>
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>{balance("XLM")}</span>
              </div>
              <div style={{ height: 1, background: "#F0F2F5" }} />
              <div className="row" style={{ padding: "10px 0" }}>
                <UsdcMark />
                <div className="grow">
                  <div style={{ fontSize: 15, fontWeight: 800 }}>USDC</div>
                  <div className="mute" style={{ fontSize: 12, fontWeight: 600 }}>
                    USD Coin
                  </div>
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>{balance("USDC")}</span>
              </div>
            </section>

            {recent.length > 0 && (
              <section className="rise d3" aria-label="Send again" style={{ order: 5 }}>
                <div className="lbl" style={{ margin: "2px 0 10px" }}>
                  Send again
                </div>
                <div className="stagger" style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  {recent.slice(0, 5).map((t) => (
                    <Link key={t} href={`/send?to=${t}`} className="press hov" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, borderRadius: 16 }}>
                      <Avatar seed={t} label={t} size={50} />@{t}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {tag && link && (
              <section className="card desk-only rise d4" style={{ order: 7 }}>
                <div className="row" style={{ gap: 16 }}>
                  <div style={{ padding: 8, borderRadius: 16, border: "1px solid #EEF0F4", lineHeight: 0 }}>
                    <Qr value={link} size={96} label={`QR code for @${tag}`} />
                  </div>
                  <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="lbl">Your pay link</span>
                    <span style={{ fontSize: 17, fontWeight: 800 }}>Pay @{tag}</span>
                    <span className="mono mute" style={{ fontSize: 12, wordBreak: "break-all" }}>
                      {link.replace(/^https?:\/\//, "")}
                    </span>
                    <div className="row" style={{ gap: 8, marginTop: 4 }}>
                      <button type="button" className="chip press" style={{ height: 34 }} onClick={() => void navigator.clipboard?.writeText(link).then(() => toast.show("Link copied"))}>
                        <Icon name="copy" size={14} /> Copy
                      </button>
                      <Link href="/receive" className="chip press" style={{ height: 34 }}>
                        <Icon name="share" size={14} /> Share
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
      {menu && <Menu onClose={() => setMenu(false)} />}
      <Toast text={toast.text} />
    </div>
  );
}
