"use client";

import Link from "next/link";

import { Confetti } from "@/components/confetti";
import { DrawnCheck, Icon, Ripple, Toast } from "@/components/ui";
import type { SendState, Times } from "@/hooks/useSend";
import { useToast } from "@/hooks/useToast";
import { formatAmount, groupThousands } from "@/lib/format";
import { txUrl } from "@/lib/stellar/config";

type DoneState = Extract<SendState, { step: "sending" | "done" | "failed" }>;

const time = (d?: Date) => (d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "");

function Step({ state, title, sub }: { state: "ok" | "busy" | "wait" | "fail"; title: string; sub: string }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      {state === "ok" && (
        <span className="av pop" style={{ width: 28, height: 28, background: "#12B76A" }}>
          <Icon name="check" size={14} stroke="#fff" sw={3.4} />
        </span>
      )}
      {state === "busy" && (
        <span className="av" style={{ width: 28, height: 28, background: "#EEF3FF" }}>
          <span className="spin" style={{ width: 16, height: 16 }} />
        </span>
      )}
      {state === "wait" && <span className="av" style={{ width: 28, height: 28, background: "#F2F4F7", border: "2px dashed #D0D5DD" }} />}
      {state === "fail" && (
        <span className="av" style={{ width: 28, height: 28, background: "#F04438" }}>
          <Icon name="close" size={13} stroke="#fff" sw={3.4} />
        </span>
      )}
      <div className="grow">
        <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
        <div className="mute" style={{ fontSize: 12, fontWeight: 600 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function Timeline({ state, times }: { state: DoneState; times: Times }) {
  return (
    <section className="card rise d3" style={{ width: "100%", textAlign: "left", background: "#F7F8FA", display: "flex", flexDirection: "column", gap: 14 }}>
      <Step state="ok" title="Signed in your wallet" sub={time(times.signedAt)} />
      {state.step === "done" && (
        <>
          <Step state="ok" title="Sent to Stellar Testnet" sub={time(times.submittedAt ?? times.signedAt)} />
          <Step
            state="ok"
            title="Confirmed"
            sub={`${times.ledger ? `Ledger ${groupThousands(String(times.ledger))} · ` : ""}${time(times.confirmedAt)}`}
          />
        </>
      )}
      {state.step === "sending" && (
        <>
          <Step state={state.hash ? "ok" : "busy"} title={state.hash ? "Sent to Stellar Testnet" : "Sending to Stellar Testnet"} sub={state.hash ? time(times.submittedAt) : "Just now"} />
          <Step
            state={state.hash && !state.unknown ? "busy" : "wait"}
            title="Confirmed"
            sub={state.unknown ? "Not confirmed yet: check before sending again" : "Waiting for the next ledger"}
          />
        </>
      )}
      {state.step === "failed" && <Step state="fail" title="Rejected by the network" sub={state.detail} />}
    </section>
  );
}

/** SendDone.dc.html: sent, sending, or failed. */
export function DoneStep({
  state,
  onCheck,
  onSendAgain,
  onRetry,
}: {
  state: DoneState;
  onCheck: () => void;
  onSendAgain: () => void;
  onRetry: () => void;
}) {
  const toast = useToast();
  const { quote } = state;
  const amount = `${formatAmount(quote.units)} ${quote.asset.code}`;
  const ok = state.step === "done";
  const hash = state.step === "failed" ? state.hash : state.hash;
  const title = ok ? "Payment sent" : state.step === "sending" ? "Sending" : "Not sent";
  const actions = (
    <>
        {ok && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" className="btn ghost press" onClick={onSendAgain}>
              Send again
            </button>
            <Link href="/app" className="btn press">
              Done
            </Link>
          </div>
        )}
        {state.step === "sending" &&
          (state.unknown ? (
            <button type="button" className="btn press" onClick={onCheck} disabled={state.checking}>
              {state.checking ? "Checking…" : "Check status"}
            </button>
          ) : (
            <Link href="/app" className="btn ghost press">
              Back to home
            </Link>
          ))}
        {state.step === "failed" && (
          <button type="button" className="btn press" onClick={onRetry}>
            {state.detail === "Balance" ? "Try a smaller amount" : "Try again"}
          </button>
        )}
          </>
  );

  return (
    <div className="app result" style={{ background: "#fff" }}>
      {ok && <Confetti />}
      <header className="top rise">
        <span style={{ width: 44 }} />
        <span className="ttl">{title}</span>
        <Link href="/app" className="ib press" style={{ background: "#F2F4F7", boxShadow: "none" }} aria-label="Close">
          <Icon name="close" size={18} />
        </Link>
      </header>
      <div className="body">
        <main className="pad" style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 18, textAlign: "center" }}>
          {ok && (
            <>
              <Ripple color="#12B76A" duration={1.8}>
                <span className="av pop" style={{ position: "relative", width: 104, height: 104, background: "#12B76A" }}>
                  <DrawnCheck size={54} color="#fff" delay={0.3} />
                </span>
              </Ripple>
              <div className="rise d2">
                <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-.05em", lineHeight: 1 }}>Sent!</div>
                <div className="sub" style={{ fontSize: 16, marginTop: 8 }}>
                  @{quote.tag} got <b style={{ color: "#0D1321" }}>{amount}</b> from you.
                </div>
              </div>
            </>
          )}
          {state.step === "sending" && (
            <>
              <span className="av" style={{ width: 104, height: 104, background: "#EEF3FF" }}>
                <span className="spin" style={{ width: 56, height: 56, borderWidth: 5 }} />
              </span>
              <div>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1 }}>Sending…</div>
                <div className="sub" style={{ fontSize: 16, marginTop: 8 }}>
                  {amount} to @{quote.tag}. Usually takes ~5 seconds.
                </div>
              </div>
            </>
          )}
          {state.step === "failed" && (
            <>
              <span className="av shake" style={{ width: 104, height: 104, background: "#FEECEB", color: "#B42318" }}>
                <Icon name="close" size={46} stroke="#B42318" sw={3} />
              </span>
              <div>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1 }}>Payment failed</div>
                <div className="sub" style={{ fontSize: 16, marginTop: 8 }}>
                  {state.reason} Nothing left your wallet.
                </div>
              </div>
            </>
          )}

          <Timeline state={state} times={state.times} />

          {hash && (
            <section className="card rise d4" style={{ width: "100%", textAlign: "left", border: "1px solid #EEF0F4", display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="lbl">Transaction hash</span>
                <button
                  type="button"
                  className="press"
                  aria-label="Copy hash"
                  onClick={() => void navigator.clipboard?.writeText(hash).then(() => toast.show("Hash copied"))}
                  style={{ border: 0, background: "#F2F4F7", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name="copy" size={15} />
                </button>
              </div>
              <div className="mono" style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 600, wordBreak: "break-all" }}>
                {hash}
              </div>
              <a href={txUrl(hash)} target="_blank" rel="noreferrer" className="row" style={{ gap: 6, fontSize: 14, fontWeight: 800, color: "#1F5EFF" }}>
                View on Stellar Expert <Icon name="external" size={15} />
              </a>
            </section>
          )}
          <div className="ddock" style={{ width: "100%", marginTop: 8 }}>
            {actions}
          </div>
        </main>
      </div>
      <div className="dock" style={{ background: "none" }}>
        {actions}
      </div>
      <Toast text={toast.text} />
    </div>
  );
}
