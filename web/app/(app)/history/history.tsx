"use client";

import { useState } from "react";

import { NoTransactions, TxRow } from "@/components/tx-row";
import { Icon, Screen, TopBack } from "@/components/ui";
import { useHistory, type HistoryItem } from "@/hooks/useHistory";
import { useWallet } from "@/hooks/useWallet";
import { dayLabel } from "@/lib/format";

const FILTERS = [
  ["all", "All"],
  ["sent", "Sent"],
  ["received", "Received"],
] as const;

/** AppHistory.dc.html. */
export function History() {
  const { address } = useWallet();
  const history = useHistory(address);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const items = history.data ?? [];
  const shown = items.filter((i) => filter === "all" || i.direction === filter);
  const paid = new Set(items.filter((i) => i.direction === "sent").map((i) => i.counterpartyTag ?? i.counterparty));

  const groups: { label: string; rows: HistoryItem[] }[] = [];
  for (const item of shown) {
    const label = dayLabel(item.at);
    const g = groups.at(-1);
    if (g && g.label === label) g.rows.push(item);
    else groups.push({ label, rows: [item] });
  }

  return (
    <Screen
      header={<TopBack title="History" href="/app" />}
      bodyStyle={{ paddingTop: 2 }}
      side={
        <>
      <div className="rise d1" style={{ order: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="card" style={{ padding: "14px 16px" }}>
          <div className="lbl">Payments</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.03em" }}>{history.isPending ? "–" : items.length}</div>
        </div>
        <div className="card" style={{ padding: "14px 16px" }}>
          <div className="lbl">People paid</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.03em" }}>{history.isPending ? "–" : paid.size}</div>
        </div>
      </div>
      <div className="rise d2" role="tablist" aria-label="Filter" style={{ order: 2, display: "flex", gap: 8 }}>
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className="chip press"
            onClick={() => setFilter(key)}
            style={filter === key ? { background: "#0D1321", color: "#fff", borderColor: "#0D1321" } : undefined}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="chip press"
          aria-label="Refresh"
          onClick={() => void history.refetch()}
          style={{ marginLeft: "auto", padding: "0 11px" }}
          disabled={history.isFetching}
        >
          {history.isFetching ? <span className="spin" style={{ width: 16, height: 16 }} /> : <Icon name="clock" size={16} />}
        </button>
      </div>

      <p className="mute" style={{ order: 4, margin: "4px 2px 0", fontSize: 12, fontWeight: 600 }}>
        {history.partial ? "Showing today · loading the rest of the week…" : "Shows the last 7 days, which is what Stellar Testnet keeps."}
      </p>
        </>
      }
    >
      {history.isPending ? (
        <div className="card" style={{ order: 3, display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="row">
              <span className="skel" style={{ width: 42, height: 42, borderRadius: "50%" }} />
              <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="skel" style={{ width: "40%", height: 12 }} />
                <span className="skel" style={{ width: "60%", height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      ) : history.isError ? (
        <div className="err" style={{ order: 3 }}>
          <Icon name="warn" size={17} /> Couldn&apos;t reach Stellar right now. Pull to refresh.
        </div>
      ) : groups.length === 0 ? (
        <div style={{ order: 3 }}>
          <NoTransactions />
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.label} className="rise d3" style={{ order: 3 }}>
            <div className="lbl" style={{ margin: "4px 2px 8px" }}>
              {g.label}
            </div>
            <div className="card stagger" style={{ padding: "2px 16px" }}>
              {g.rows.map((item) => (
                <TxRow key={item.id} item={item} detail="full" />
              ))}
            </div>
          </div>
        ))
      )}
    </Screen>
  );
}
