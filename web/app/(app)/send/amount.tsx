"use client";

import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";

import { Avatar, Icon, Screen, TopBack, UsdcMark, XlmMark } from "@/components/ui";
import { useBalances } from "@/hooks/useBalances";
import { useResolveTag } from "@/hooks/useResolveTag";
import { useWallet } from "@/hooks/useWallet";
import { addressGroups, formatBalance, groupThousands, shortAddress } from "@/lib/format";
import { fromUnits, toUnits, XLM_FEE_HEADROOM, type AssetCode } from "@/lib/stellar/assets";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;
const QUICK = ["5", "10", "25", "50", "100"];

/** The keypad's rules: one dot, at most 7 decimals and 10 digits. */
export function pressKey(amount: string, key: string): string {
  if (key === "del") return amount.slice(0, -1);
  if (key === ".") return amount.includes(".") ? amount : `${amount === "" ? "0" : amount}.`;
  const decimals = amount.split(".")[1];
  if (decimals !== undefined && decimals.length >= 7) return amount;
  if (amount.replace(".", "").length >= 10) return amount;
  return amount === "0" ? key : amount + key;
}

/**
 * SendAmount.dc.html; the review sheet slides over it. On desktop the keypad
 * gives way to the keyboard and quick amounts, with a live preview beside it.
 */
export function AmountStep({
  tag,
  asset,
  onAsset,
  amount,
  onAmount,
  checking,
  error,
  blurred,
  onBack,
  onNotFound,
  onReview,
  sheet,
}: {
  tag: string;
  asset: AssetCode;
  onAsset: (a: AssetCode) => void;
  amount: string;
  onAmount: (a: string) => void;
  checking: boolean;
  error?: string;
  blurred: boolean;
  onBack: () => void;
  onNotFound: () => void;
  onReview: () => void;
  sheet: ReactNode;
}) {
  const { address } = useWallet();
  const account = useBalances(address);
  const recipient = useResolveTag(tag);

  // Physical keyboards work too, while no sheet is open; Enter reviews.
  useEffect(() => {
    if (blurred) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        document.querySelector<HTMLButtonElement>("[data-review]:not(:disabled)")?.click();
        return;
      }
      const key = e.key === "Backspace" ? "del" : e.key === "," ? "." : e.key;
      if (!(KEYS as readonly string[]).includes(key)) return;
      e.preventDefault();
      onAmount(pressKey(amount, key));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [amount, onAmount, blurred]);

  useEffect(() => {
    if (recipient.status === "not-found" || recipient.status === "invalid") onNotFound();
  }, [recipient.status, onNotFound]);

  const info = account.data;
  const balance = info ? (info.exists ? info.balances[asset] : 0n) : undefined;
  const spendable = info ? (info.exists ? info.spendable[asset] : 0n) : undefined;
  const max =
    typeof spendable === "bigint" ? (asset === "XLM" ? (spendable > XLM_FEE_HEADROOM ? spendable - XLM_FEE_HEADROOM : 0n) : spendable) : null;
  const units = toUnits(amount) ?? 0n;
  const over = typeof spendable === "bigint" && units > spendable;
  const noTrust = info?.exists && spendable === null;
  const ok = units > 0n && !over && !noTrust && recipient.status === "found";
  const shown = amount === "" ? "0" : groupThousands(amount);
  const wallet = recipient.status === "found" ? recipient.record.wallet : null;

  const on = { background: "#fff", color: "#0D1321", boxShadow: "0 2px 6px rgba(13,19,33,.08)" };
  const off = { background: "transparent", color: "#6B7280" };

  const reviewButton = ok ? (
    <button type="button" className="btn press" onClick={onReview} disabled={checking} data-review>
      {checking ? (
        <>
          <span className="spin" style={{ borderColor: "rgba(255,255,255,.35)", borderTopColor: "#fff" }} /> Checking everything…
        </>
      ) : (
        "Review payment"
      )}
    </button>
  ) : (
    <button type="button" className="btn off" disabled>
      {over || noTrust ? `Not enough ${asset}` : "Enter an amount"}
    </button>
  );

  return (
    <Screen
      header={<TopBack title="Send" onBack={onBack} />}
      bodyStyle={{ gap: 18, paddingTop: 2, filter: blurred ? "blur(1px)" : undefined }}
      dockStyle={{ paddingTop: 8 }}
      dock={reviewButton}
      overlay={sheet}
      side={
        <section className="card desk-only rise d3" aria-label="Payment preview" style={{ padding: 22 }}>
          <div className="lbl" style={{ marginBottom: 14 }}>
            You&apos;re paying
          </div>
          <div className="row" style={{ marginBottom: 16 }}>
            <Avatar seed={tag} label={tag} size={52} />
            <div className="grow">
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>@{tag}</div>
              <div className="mute" style={{ fontSize: 13, fontWeight: 600 }}>
                {wallet ? "Tag checked on-chain" : "Checking the tag…"}
              </div>
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 18, background: "#F5F8FF", border: "1px solid #DFE7FF" }}>
            <div className="lbl" style={{ marginBottom: 6 }}>
              Their wallet
            </div>
            {wallet ? (
              <div className="mono" style={{ fontSize: 13, lineHeight: 1.7, fontWeight: 600, wordSpacing: 2 }}>
                {addressGroups(wallet).map((g, i, all) => (
                  <span key={i}>
                    {i === 0 || i === all.length - 1 ? <b style={{ color: "#1F5EFF" }}>{g}</b> : g}
                    {i < all.length - 1 ? " " : ""}
                  </span>
                ))}
              </div>
            ) : (
              <span className="skel" style={{ display: "block", height: 44 }} />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16, fontSize: 14, fontWeight: 700 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">Amount</span>
              <motion.span key={`${shown}${asset}`} initial={{ opacity: 0.4, y: 3 }} animate={{ opacity: 1, y: 0 }}>
                {shown} {asset}
              </motion.span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">Network fee</span>
              <span>Shown on review</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">Network</span>
              <span>Stellar Testnet</span>
            </div>
          </div>
          <div className="row mute" style={{ gap: 8, marginTop: 16, fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
            <Icon name="shield" size={18} stroke="#1F5EFF" />
            <span>If @{tag} changes wallets before you sign, the payment stops. Nothing is sent.</span>
          </div>
        </section>
      }
    >
      <div className="rise d1" style={{ display: "flex", justifyContent: "center" }}>
        <div className="row" style={{ gap: 10, height: 52, padding: "0 14px 0 5px", borderRadius: 999, background: "#fff", maxWidth: "100%" }}>
          <Avatar seed={tag} label={tag} size={42} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>@{tag}</div>
            <div className="mono mute" style={{ fontSize: 11 }}>
              {wallet ? shortAddress(wallet) : "Checking…"}
            </div>
          </div>
          {wallet ? (
            <span className="badge b-green" style={{ height: 24 }}>
              <Icon name="check" size={11} sw={3.4} /> Verified
            </span>
          ) : (
            <span className="spin" style={{ width: 18, height: 18 }} />
          )}
        </div>
      </div>

      <div className="rise d2" role="tablist" aria-label="Asset" style={{ alignSelf: "center", display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "#E9ECF1" }}>
        {(["XLM", "USDC"] as const).map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={asset === code}
            className="press"
            onClick={() => onAsset(code)}
            style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px 0 6px", border: 0, borderRadius: 999, fontSize: 14, fontWeight: 800, ...(asset === code ? on : off) }}
          >
            {code === "XLM" ? <XlmMark size={28} /> : <UsdcMark size={28} />} {code}
          </button>
        ))}
      </div>

      <div key={over ? `over-${amount}` : "amt"} className={`rise d3${over ? " shake" : ""}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0 4px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, maxWidth: "100%" }} aria-live="polite" aria-label={`Amount: ${shown} ${asset}`}>
          <motion.span
            key={shown}
            initial={{ scale: amount ? 0.96 : 1, opacity: amount ? 0.75 : 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            style={{
              display: "inline-block",
              fontSize: shown.length > 11 ? 38 : shown.length > 8 ? 50 : 68,
              fontWeight: 800,
              letterSpacing: "-.05em",
              lineHeight: 1,
              color: amount === "" || units === 0n ? "#C4CAD4" : over ? "#F04438" : "#0D1321",
              wordBreak: "break-all",
            }}
          >
            {shown}
          </motion.span>
          <span className="caret" style={{ height: 48, alignSelf: "center" }} />
          <span style={{ fontSize: 22, fontWeight: 800, color: "#98A2B3" }}>{asset}</span>
        </div>
        <div className="row" style={{ gap: 8, fontSize: 14, fontWeight: 700, color: over || noTrust ? "#B42318" : "#6B7280" }}>
          {balance === undefined ? (
            <span className="skel" style={{ width: 150, height: 14 }} />
          ) : noTrust ? (
            `You don't have ${asset} enabled`
          ) : over ? (
            `Not enough ${asset}`
          ) : (
            `Balance ${formatBalance(balance ?? 0n)} ${asset}`
          )}
          {max !== null && max > 0n && (
            <button type="button" className="badge b-blue press" style={{ border: 0 }} onClick={() => onAmount(fromUnits(max))}>
              Max
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="err" role="alert">
          <Icon name="warn" size={17} /> {error}
        </div>
      )}

      <div className="rise d4 mob-only" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className="press"
            aria-label={k === "del" ? "Delete" : k}
            onClick={() => onAmount(pressKey(amount, k))}
            style={{ height: 64, border: 0, borderRadius: 20, background: "transparent", fontSize: 28, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {k === "del" ? <Icon name="backspace" size={26} /> : k}
          </button>
        ))}
      </div>

      <div className="desk-only rise d4" style={{ textAlign: "center" }}>
        <div className="row stagger" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {QUICK.map((q) => (
            <button key={q} type="button" className="chip press hov" onClick={() => onAmount(q)} aria-label={`Set amount to ${q}`}>
              {q} {asset}
            </button>
          ))}
        </div>
        <div className="mute" style={{ marginTop: 12, fontSize: 13, fontWeight: 600 }}>
          Type the amount on your keyboard · Enter to review
        </div>
      </div>
    </Screen>
  );
}
