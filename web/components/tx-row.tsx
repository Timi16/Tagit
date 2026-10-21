import type { HistoryItem } from "@/hooks/useHistory";
import { clockTime, dayLabel, formatAmount, shortAddress } from "@/lib/format";
import { txUrl } from "@/lib/stellar/config";

import { Avatar, Icon } from "./ui";

/** One payment, as the home and history lists show it. */
export function TxRow({ item, detail = "when", className }: { item: HistoryItem; detail?: "when" | "full"; className?: string }) {
  const sent = item.direction === "sent";
  const who = item.counterpartyTag ? `@${item.counterpartyTag}` : shortAddress(item.counterparty);
  const day = dayLabel(item.at);
  const when = day === "Today" || day === "Yesterday" ? `${day}${day === "Today" ? `, ${clockTime(item.at)}` : ""}` : day;
  const amount = `${sent ? "−" : "+"}${formatAmount(item.amount)} ${item.asset?.code ?? "?"}`;

  return (
    <a href={txUrl(item.txHash)} target="_blank" rel="noreferrer" className={`tx press${className ? ` ${className}` : ""}`} aria-label={`${sent ? "Sent to" : "Received from"} ${who}, ${amount}`}>
      <span style={{ position: "relative", display: "inline-flex" }}>
        <Avatar seed={item.counterpartyTag ?? item.counterparty} label={item.counterpartyTag ?? "@"} size={42} />
        <span
          className="av"
          style={{ position: "absolute", right: -3, bottom: -3, width: 18, height: 18, background: sent ? "#0D1321" : "#12B76A", border: "2px solid #fff", color: "#fff" }}
        >
          <Icon name={sent ? "out" : "in"} size={10} />
        </span>
      </span>
      <div className="grow">
        <div style={{ fontSize: 15, fontWeight: 800 }}>{who}</div>
        {detail === "when" ? (
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mute">
            {sent ? "Sent" : "Received"} · {when}
          </div>
        ) : (
          <div className="mute" style={{ fontSize: 12, fontWeight: 600 }}>
            {sent ? "Sent" : "Received"} · {clockTime(item.at)} · <span className="mono">{item.txHash.slice(0, 4)}…</span>
          </div>
        )}
      </div>
      {detail === "when" ? (
        <span className={`amt${sent ? "" : " in"}`}>{amount}</span>
      ) : (
        <div style={{ textAlign: "right" }}>
          <div className="amt" style={{ color: sent ? "#0D1321" : "#067647" }}>
            {amount}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#067647" }}>Confirmed</div>
        </div>
      )}
    </a>
  );
}

/** The empty state from AppHomeEmpty.dc.html. */
export function NoTransactions() {
  return (
    <section className="rise d4" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "26px 20px" }}>
      <div className="pop d4" style={{ width: 96, height: 96, borderRadius: "50%", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M12 6h24v36l-4-3-4 3-4-3-4 3-4-3-4 3V6z" fill="#fff" stroke="#98A2B3" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M18 16h12M18 23h12M18 30h7" stroke="#98A2B3" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>No Transaction Yet</div>
      <p className="sub" style={{ fontSize: 14, maxWidth: 280 }}>
        When you send or get paid by @tag, it shows up here.
      </p>
    </section>
  );
}
