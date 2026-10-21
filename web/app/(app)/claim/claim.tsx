"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Confetti } from "@/components/confetti";
import { Qr } from "@/components/qr";
import { DrawnCheck, Icon, Ripple, Screen, TopBack } from "@/components/ui";
import { accountKey, useBalances } from "@/hooks/useBalances";
import { myTagKey, useMyTag } from "@/hooks/useMyTag";
import { useOrigin } from "@/hooks/useOrigin";
import { useResolveTag } from "@/hooks/useResolveTag";
import { useWallet } from "@/hooks/useWallet";
import { describeError } from "@/lib/stellar/errors";
import { lookupTag, registerTag } from "@/lib/stellar/registry";
import { transactionStatus } from "@/lib/stellar/tx";
import { isReservedTag, normalizeTag, TAG_MAX } from "@/lib/stellar/tag";
import { txUrl } from "@/lib/stellar/config";

type Status = "empty" | "checking" | "free" | "taken" | "reserved" | "invalid" | "error";

const LOOK: Record<Status, { color: string; border: string; glow: string }> = {
  empty: { color: "#98A2B3", border: "#E4E7EC", glow: "transparent" },
  checking: { color: "#98A2B3", border: "#C9D6FF", glow: "transparent" },
  free: { color: "#067647", border: "#12B76A", glow: "rgba(18,183,106,.14)" },
  taken: { color: "#B42318", border: "#F04438", glow: "rgba(240,68,56,.12)" },
  reserved: { color: "#B42318", border: "#F04438", glow: "rgba(240,68,56,.12)" },
  invalid: { color: "#B54708", border: "#F79009", glow: "rgba(247,144,9,.14)" },
  error: { color: "#B54708", border: "#F79009", glow: "rgba(247,144,9,.14)" },
};

/** AppClaim.dc.html, wired to `register`. */
export function Claim() {
  const { address, signer } = useWallet();
  const myTag = useMyTag(address);
  const account = useBalances(address);
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState(() => normalizeTag(params.get("tag") ?? ""));
  const state = useResolveTag(typed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; hash?: string } | null>(null);
  const [claimed, setClaimed] = useState<{ tag: string; hash: string } | null>(null);
  const tries = useSuggestions(typed, state.status === "found");
  const origin = useOrigin();

  if (claimed) return <Claimed {...claimed} />;
  if (myTag.data) return <AlreadyOwns tag={myTag.data.tag} />;

  const t = state.status === "idle" || state.status === "invalid" ? typed : state.tag;
  const status: Status =
    state.status === "idle"
      ? "empty"
      : state.status === "invalid"
        ? "invalid"
        : state.status === "checking"
          ? "checking"
          : state.status === "found"
            ? "taken"
            : state.status === "error"
              ? "error"
              : isReservedTag(state.tag)
                ? "reserved"
                : "free";

  const lenOk = t.length >= 3 && t.length <= TAG_MAX;
  const charsOk = t.length > 0 && /^[a-z0-9_]+$/.test(t);
  const msg =
    status === "empty"
      ? "Start typing to check"
      : status === "checking"
        ? "Checking…"
        : status === "free"
          ? `@${t} is available`
          : status === "taken"
            ? `@${t} is taken. Tags are one of a kind.`
            : status === "reserved"
              ? `@${t} is reserved for TagIt's own pages`
              : status === "error"
                ? describeError(state.status === "error" ? state.error : { kind: "unknown", message: "" })
                : !charsOk
                  ? "Only lowercase letters, numbers and _"
                  : "Use 3 to 20 characters";
  const look = LOOK[status];
  const pending = status === "empty";
  const rule = (ok: boolean, label: string, wait = pending) => ({
    label,
    bg: wait ? "#F2F4F7" : ok ? "#E7F8EF" : "#FEECEB",
    fg: wait ? "#98A2B3" : ok ? "#067647" : "#B42318",
    text: wait ? "#98A2B3" : "#0D1321",
  });
  const rules = [
    rule(lenOk, "3 to 20 characters"),
    rule(charsOk, "Lowercase letters, numbers or _"),
    rule(status === "free", "Nobody else has it", pending || status === "checking" || !charsOk || !lenOk),
  ];
  const host = origin.replace(/^https?:\/\//, "");
  const unfunded = account.data && !account.data.exists;

  async function claim() {
    if (!signer || status !== "free") return;
    setBusy(true);
    setError(null);
    finish(await registerTag(signer, t));
  }

  /** Submitted but unconfirmed: ask again instead of offering a second claim. */
  async function recheck() {
    if (!error?.hash) return;
    setBusy(true);
    finish(await transactionStatus(error.hash));
  }

  function finish(res: Awaited<ReturnType<typeof registerTag>>) {
    setBusy(false);
    if (!signer) return;
    if (res.ok) {
      setClaimed({ tag: t, hash: res.hash });
      void queryClient.invalidateQueries({ queryKey: myTagKey(signer.address) });
      void queryClient.invalidateQueries({ queryKey: ["tag", t] });
      void queryClient.invalidateQueries({ queryKey: accountKey(signer.address) });
    } else {
      setError({ text: describeError(res.error, { tag: t }), hash: res.error.kind === "pending" ? res.error.hash : undefined });
    }
  }

  return (
    <Screen
      header={<TopBack title="Claim your tag" href="/app" />}
      bodyStyle={{ gap: 18, paddingTop: 6 }}
      side={
        <>
          <div className="rise d4" style={{ order: 4 }}>
            <div className="lbl" style={{ marginBottom: 10 }}>
              Friends will see
            </div>
            <div className="row" style={{ padding: "12px 14px", borderRadius: 20, background: "#fff", border: "1px dashed #C9D6FF" }}>
              <span className="av" style={{ width: 44, height: 44, background: "#1F5EFF", fontSize: 18 }}>
                @
              </span>
              <div className="grow">
                <div style={{ fontSize: 16, fontWeight: 800, wordBreak: "break-all" }}>Pay @{t || "yourname"}</div>
                <div className="mono mute" style={{ fontSize: 12, wordBreak: "break-all" }}>
                  {host}/@{t || "yourname"}
                </div>
              </div>
              <span className="badge b-blue">Pay link</span>
            </div>
            <div className="desk-only" style={{ marginTop: 14 }}>
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 22, textAlign: "center" }}>
                <div style={{ position: "relative", padding: 12, borderRadius: 22, border: "1px solid #EEF0F4", lineHeight: 0, opacity: status === "free" ? 1 : 0.35, filter: status === "free" ? "none" : "grayscale(1)", transition: "opacity .3s, filter .3s" }}>
                  {origin && <Qr value={`${origin}/@${status === "free" ? t : "yourname"}`} size={168} label="QR code preview for your pay link" />}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{status === "free" ? `Your QR for @${t}` : "Your QR appears here"}</div>
                <div className="mute" style={{ fontSize: 13, fontWeight: 600, maxWidth: 260 }}>
                  Friends scan it, see your name, and pay. No address to copy.
                </div>
              </div>
            </div>
          </div>
          <div className="row rise d6 mute" style={{ order: 8, gap: 8, fontSize: 13, fontWeight: 600 }}>
            <Icon name="lock" size={15} /> One tag per wallet. Only you can change or release it.
          </div>
        </>
      }
      dock={
        error?.hash ? (
          <button type="button" className="btn press" onClick={() => void recheck()} disabled={busy}>
            {busy ? "Checking…" : "Check status"}
          </button>
        ) : status === "free" ? (
          <button type="button" className="btn press" onClick={() => void claim()} disabled={busy || !!unfunded}>
            {busy ? (
              <>
                <span className="spin" style={{ borderColor: "rgba(255,255,255,.35)", borderTopColor: "#fff" }} /> Approve in your wallet…
              </>
            ) : (
              `Claim @${t}`
            )}
          </button>
        ) : (
          <button type="button" className="btn off" disabled>
            Pick an available tag
          </button>
        )
      }
    >
      <div className="rise d1" style={{ order: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 className="h1">Pick your @tag</h1>
        <p className="sub">This is how people will pay you. Short and easy to say works best.</p>
      </div>
      <div className="rise d2" style={{ order: 2 }}>
        <label htmlFor="tag" className="lbl" style={{ display: "block", marginBottom: 8 }}>
          Your tag
        </label>
        <div
          key={status === "taken" || status === "invalid" ? `${status}-${t}` : "field"}
          className={`field${status === "taken" || status === "invalid" || status === "reserved" ? " shake" : ""}`}
          style={{ borderColor: look.border, boxShadow: `0 0 0 4px ${look.glow}` }}
        >
          <b>@</b>
          <input
            id="tag"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={24}
            value={typed}
            onChange={(e) => {
              setError(null);
              setTyped(e.target.value.replace(/^@+/, "").toLowerCase());
            }}
            placeholder="yourname"
            aria-describedby="tagmsg"
            autoFocus
          />
          {status === "checking" && <span className="spin" />}
          {status === "free" && (
            <Ripple color="#12B76A" duration={1.4}>
              <span className="av pop" style={{ position: "relative", width: 30, height: 30, background: "#12B76A" }}>
                <Icon name="check" size={17} stroke="#fff" />
              </span>
            </Ripple>
          )}
          {(status === "taken" || status === "reserved") && (
            <span className="av pop" style={{ width: 30, height: 30, background: "#F04438" }}>
              <Icon name="close" size={16} stroke="#fff" sw={3.2} />
            </span>
          )}
          {(status === "invalid" || status === "error") && (
            <span className="av pop" style={{ width: 30, height: 30, background: "#F79009" }}>
              <Icon name="warn" size={16} stroke="#fff" sw={2.8} />
            </span>
          )}
        </div>
        <div id="tagmsg" aria-live="polite" className="row pop" key={msg} style={{ gap: 8, marginTop: 12, fontSize: 14, fontWeight: 800, color: look.color }}>
          <span className="dot" style={{ background: look.color }} />
          {msg}
        </div>
      </div>

      <div className="card rise d3" style={{ order: 3, display: "flex", flexDirection: "column", gap: 12, padding: "16px 18px" }}>
        {rules.map((r) => (
          <div key={r.label} className="row" style={{ gap: 10, fontSize: 14, fontWeight: 700 }}>
            <span className="av" style={{ width: 22, height: 22, background: r.bg, color: r.fg }}>
              <Icon name="check" size={13} sw={3.4} />
            </span>
            <span style={{ color: r.text }}>{r.label}</span>
          </div>
        ))}
      </div>

      {tries.length > 0 && (
        <div className="rise d5" style={{ order: 5 }}>
          <div className="lbl" style={{ marginBottom: 10 }}>
            Try one
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tries.map((v) => (
              <button key={v} type="button" className="chip press" onClick={() => setTyped(v)}>
                @{v}
              </button>
            ))}
          </div>
        </div>
      )}

      {unfunded && (
        <div className="note" style={{ order: 6 }}>
          <Icon name="warn" size={17} /> Activate your wallet from Home first: it needs a little test XLM to claim.
        </div>
      )}
      {error && (
        <div className="err" role="alert" style={{ order: 7 }}>
          <Icon name="warn" size={17} />
          <span>
            {error.text}{" "}
            {error.hash && (
              <a href={txUrl(error.hash)} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                Check it
              </a>
            )}
          </span>
        </div>
      )}
    </Screen>
  );
}

/** Free alternatives when the typed tag is taken, checked on chain. */
function useSuggestions(typed: string, taken: boolean): string[] {
  const key = `${typed}|${taken}`;
  const [found, setFound] = useState<{ key: string; list: string[] }>({ key: "", list: [] });
  useEffect(() => {
    let live = true;
    if (!taken) return;
    const base = typed.slice(0, 16);
    const ideas = [`${base}_`, `${base}${new Date().getFullYear() % 100}`, `the${base}`, `${base}_xyz`, `its${base}`];
    void (async () => {
      const free: string[] = [];
      for (const idea of ideas) {
        if (idea.length > TAG_MAX) continue;
        const res = await lookupTag(idea);
        if (!live) return;
        if (res.status === "not-found" && !isReservedTag(idea)) free.push(idea);
        if (free.length === 4) break;
      }
      if (live) setFound({ key, list: free });
    })();
    return () => {
      live = false;
    };
  }, [typed, taken, key]);
  return found.key === key ? found.list : [];
}

function Claimed({ tag, hash }: { tag: string; hash: string }) {
  return (
    <div className="app">
      <div
        className="celebrate"
        style={{
          position: "absolute",
          zIndex: 20,
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "0 28px",
          textAlign: "center",
          color: "#fff",
          background: "radial-gradient(120% 90% at 50% 0%,#6C97FF,#1F5EFF 45%,#1238B8)",
          animation: "fade .35s ease both",
        }}
      >
        <Confetti />
        <span style={{ marginBottom: 6 }}>
          <Ripple color="#fff">
            <span className="av pop" style={{ position: "relative", width: 96, height: 96, background: "#fff", color: "#1F5EFF" }}>
              <DrawnCheck size={50} color="#1F5EFF" />
            </span>
          </Ripple>
        </span>
        <div className="rise d2" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1, wordBreak: "break-all" }}>
          @{tag} is yours!
        </div>
        <p className="rise d3" style={{ margin: 0, fontSize: 16, lineHeight: 1.5, fontWeight: 600, opacity: 0.88 }}>
          Friends can now send XLM or USDC to @{tag}. No address needed.
        </p>
        <a
          href={txUrl(hash)}
          target="_blank"
          rel="noreferrer"
          className="rise d4"
          style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,.14)", fontSize: 13, fontWeight: 700 }}
        >
          Registered on Stellar Testnet · <span className="mono">{`${hash.slice(0, 4)}…${hash.slice(-4)}`}</span>
        </a>
        <Link href="/app" className="btn white press rise d5 go-home" style={{ position: "absolute", left: 20, right: 20, bottom: 28, width: "auto" }}>
          Go to home
        </Link>
      </div>
    </div>
  );
}

function AlreadyOwns({ tag }: { tag: string }) {
  return (
    <Screen
      header={<TopBack title="Claim your tag" href="/app" />}
      bodyStyle={{ paddingTop: 6 }}
      dock={
        <Link href="/tag" className="btn press">
          Go to my tag
        </Link>
      }
    >
      <section className="hero rise d1" style={{ padding: "22px 20px 20px" }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.82 }}>This wallet already owns</span>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-.05em", lineHeight: 1, wordBreak: "break-all" }}>@{tag}</div>
        </div>
      </section>
      <div className="row rise d2" style={{ gap: 10, padding: 14, borderRadius: 18, background: "#EEF3FF", color: "#1F5EFF", fontSize: 13, lineHeight: 1.45, fontWeight: 700 }}>
        <Icon name="lock" size={20} />
        <span>It&apos;s one tag per wallet. Release @{tag} from My tag to claim a different one.</span>
      </div>
    </Screen>
  );
}
