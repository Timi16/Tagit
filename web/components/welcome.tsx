"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useWallet } from "@/hooks/useWallet";
import { toTagItError } from "@/lib/stellar/errors";
import { config } from "@/lib/stellar/config";
import type { WalletOption } from "@/lib/stellar/wallet";

import { Icon, LogoLink, Sheet, SheetTitle } from "./ui";

const FLOATS = [
  { tag: "david", color: "#7C5CFF", left: 22, top: 34, bottom: undefined, r: -6, delay: 0, pop: 0.3 },
  { tag: "ada", color: "#FF7A45", left: 232, top: 84, bottom: undefined, r: 5, delay: -1.5, pop: 0.6 },
  { tag: "zara", color: "#12B76A", left: 34, top: undefined, bottom: 24, r: 4, delay: -2.5, pop: 0.8 },
  { tag: "tunde", color: "#F5B000", left: 238, top: undefined, bottom: 18, r: -4, delay: -3.4, pop: 0.98 },
];

/** AppWelcome.dc.html: the first screen, and the gate in front of every app page. */
export function Welcome() {
  const [open, setOpen] = useState(false);

  return (
    <div className="app">
      <header className="top rise">
        <LogoLink />
        <span className="badge b-amber">
          <span className="dot" style={{ background: "#F79009" }} />
          Testnet
        </span>
      </header>
      <div className="body">
        <div className="wel">
        <div
          className="rise d1 wel-hero"
          style={{
            position: "relative",
            margin: "4px 20px 0",
            height: 430,
            borderRadius: 32,
            overflow: "hidden",
            background: "radial-gradient(120% 120% at 80% 0%,#6C97FF 0%,#1F5EFF 45%,#1238B8 100%)",
          }}
        >
          <span aria-hidden="true" style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", left: -120, bottom: -150, background: "rgba(255,255,255,.1)" }} />
          <span aria-hidden="true" style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", right: -60, top: -50, background: "rgba(255,255,255,.12)" }} />
          {FLOATS.map((f) => (
            <div
              key={f.tag}
              aria-hidden="true"
              className="float"
              style={{ position: "absolute", left: `${(f.left / 400) * 100}%`, top: f.top, bottom: f.bottom, ["--r" as string]: `${f.r}deg`, animationDelay: `${f.delay}s` }}
            >
              <div
                className="pop"
                style={{
                  animationDelay: `${f.pop}s`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 44,
                  padding: "0 14px 0 5px",
                  borderRadius: 999,
                  background: "#fff",
                  boxShadow: "0 12px 24px -12px rgba(13,19,33,.45)",
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#0D1321",
                }}
              >
                <span className="av" style={{ width: 34, height: 34, background: f.color, fontSize: 13 }}>
                  {f.tag[0].toUpperCase()}
                </span>
                @{f.tag}
              </div>
            </div>
          ))}
          <div className="pop d4" style={{ position: "absolute", left: "50%", top: "calc(50% - 60px)", marginLeft: -150, width: 300 }} aria-hidden="true">
            <div style={{ padding: 16, borderRadius: 24, background: "#fff", boxShadow: "0 30px 60px -24px rgba(5,20,70,.6)" }}>
              <div className="lbl" style={{ marginBottom: 8 }}>
                Pick your tag
              </div>
              <div style={{ display: "flex", alignItems: "center", height: 54, padding: "0 14px", borderRadius: 16, border: "2px solid #12B76A", fontSize: 22, fontWeight: 800 }}>
                <b style={{ color: "#1F5EFF" }}>@</b>god<span className="caret" />
                <span className="av pop d6" style={{ marginLeft: "auto", width: 26, height: 26, background: "#12B76A" }}>
                  <Icon name="check" size={15} stroke="#fff" />
                </span>
              </div>
              <div className="row pop d7" style={{ gap: 8, marginTop: 10, fontSize: 14, fontWeight: 800, color: "#067647" }}>
                <span className="dot" />
                @god is available
              </div>
            </div>
          </div>
        </div>
        <div className="pad rise d3 wel-copy" style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 className="h1" style={{ fontSize: 34 }}>
            Send money to a name.
            <br />
            <span style={{ color: "#1F5EFF" }}>Not a code.</span>
          </h1>
          <p className="sub">Claim an @tag for your Stellar wallet. Friends pay you by name, and you always see where money goes.</p>
          <div className="desk-only" style={{ marginTop: 18 }}>
            <div className="card" style={{ padding: 20, boxShadow: "0 30px 60px -40px rgba(13,19,33,.35)" }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Connect a wallet</div>
              <p className="sub" style={{ fontSize: 14, marginBottom: 14 }}>
                Pick the Stellar wallet you already use.
              </p>
              <WalletList />
            </div>
            <div className="row mute" style={{ gap: 6, marginTop: 14, fontSize: 13, fontWeight: 600 }}>
              <Icon name="lock" size={15} /> Your keys stay in your wallet · Testnet only
            </div>
          </div>
        </div>
        </div>
      </div>
      <div className="dock" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button type="button" className="btn press" onClick={() => setOpen(true)}>
          <Icon name="wallet" size={20} /> Connect wallet
        </button>
        <div className="row mute" style={{ justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
          <Icon name="lock" size={15} /> Your keys stay in your wallet · Testnet only
        </div>
      </div>
      {open && <WalletSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

function WalletSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="Connect a wallet" onClose={onClose}>
      <SheetTitle onClose={onClose}>Connect a wallet</SheetTitle>
      <p className="sub" style={{ fontSize: 14, marginBottom: 14 }}>
        Pick the Stellar wallet you already use.
      </p>
      <WalletList onConnected={onClose} />
    </Sheet>
  );
}

/** The wallets to pick from: in the phone's sheet, or inline on desktop. */
function WalletList({ onConnected }: { onConnected?: () => void }) {
  const { connectWith } = useWallet();
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void import("@/lib/stellar/wallet")
      .then((w) => w.listWallets())
      .then((list) => live && setWallets(list))
      .catch(() => live && setWallets([]));
    return () => {
      live = false;
    };
  }, []);

  async function pick(w: WalletOption) {
    if (!w.available) {
      if (w.url) window.open(w.url, "_blank", "noopener");
      return;
    }
    setBusy(w.id);
    setError(null);
    try {
      await connectWith(w.id);
      onConnected?.();
    } catch (e) {
      const err = toTagItError(e, config.contractId);
      setError(
        err.kind === "wallet-rejected"
          ? `You declined in ${w.name}. Try again when you're ready.`
          : `Couldn't connect to ${w.name}. Open it, unlock it, and try again.`,
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {wallets === null
          ? [0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 62, borderRadius: 18 }} />)
          : wallets.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => void pick(w)}
                disabled={busy !== null}
                className="row press hov"
                style={{ height: 62, padding: "0 14px", border: 0, borderRadius: 18, background: "#F7F8FA", textAlign: "left" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand icons */}
                <img
                  src={w.logo}
                  alt=""
                  width={38}
                  height={38}
                  style={{ flex: "0 0 auto", width: 38, height: 38, borderRadius: 12, background: "#fff", boxShadow: "0 0 0 1px rgba(13,19,33,.06)" }}
                />
                <span className="grow" style={{ fontSize: 16, fontWeight: 800 }}>
                  {w.name}
                </span>
                {busy === w.id ? (
                  <span className="spin" />
                ) : !w.available ? (
                  <span className="badge" style={{ background: "#F2F4F7", color: "#6B7280" }}>
                    Install
                  </span>
                ) : "popular" in w && w.popular ? (
                  <span className="badge b-blue">Popular</span>
                ) : null}
                <span className="mute">
                  <Icon name="chevron" size={18} />
                </span>
              </button>
            ))}
      </div>
      {error && (
        <div className="err" role="alert" style={{ marginTop: 12 }}>
          <Icon name="warn" size={17} /> {error}
        </div>
      )}
      <div className="row" style={{ marginTop: 16, padding: "12px 14px", borderRadius: 16, background: "#EEF3FF", color: "#1F5EFF", fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>
        <Icon name="shield" size={20} />
        <span>TagIt never sees your secret key. You approve every payment inside your wallet.</span>
      </div>
    </>
  );
}

/** Shows Welcome until a Testnet wallet is connected, then the page. */
export function RequireWallet({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  if (!wallet.ready) return <LoadingScreen />;
  if (!wallet.address) return <Welcome />;
  if (!wallet.onTestnet) {
    return (
      <div className="app">
        <header className="top rise">
          <LogoLink />
        </header>
        <div className="body nodock">
          <div className="pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, paddingTop: 60 }}>
            <span className="av" style={{ width: 96, height: 96, background: "#FEF4E6", color: "#B54708" }}>
              <Icon name="warn" size={44} />
            </span>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Switch to Testnet</div>
            <p className="sub" style={{ maxWidth: 300 }}>
              TagIt runs on Stellar Testnet only. Switch your wallet&apos;s network to Testnet, then come back.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function LoadingScreen() {
  return (
    <div className="app">
      <header className="top">
        <LogoLink />
      </header>
      <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="skel" style={{ height: 178, borderRadius: 28 }} />
        <div className="skel" style={{ height: 140, borderRadius: 24 }} />
        <div className="skel" style={{ height: 220, borderRadius: 24 }} />
      </div>
    </div>
  );
}
