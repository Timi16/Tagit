"use client";

import Link from "next/link";

import { Avatar, Icon, Screen, TopBack } from "@/components/ui";
import { useHistory } from "@/hooks/useHistory";
import { useResolveTag } from "@/hooks/useResolveTag";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/format";
import { describeError } from "@/lib/stellar/errors";
import { normalizeTag, TAG_PROBLEM_MESSAGES } from "@/lib/stellar/tag";

type Row = { tag: string; address: string; me: boolean };

/** Levenshtein distance, for "Did you mean". */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** SendTag.dc.html and SendNotFound.dc.html. */
export function TagStep({ query, onQuery, onPick }: { query: string; onQuery: (q: string) => void; onPick: (tag: string) => void }) {
  const { address } = useWallet();
  const history = useHistory(address);
  const state = useResolveTag(query);
  const clean = normalizeTag(query);

  // People you've paid or been paid by, by tag, most recent first.
  const recents: Row[] = [];
  for (const item of history.data ?? []) {
    const t = item.counterpartyTag;
    if (t && !recents.some((r) => r.tag === t)) recents.push({ tag: t, address: item.counterparty, me: false });
  }

  const exact: Row | null =
    state.status === "found"
      ? { tag: state.tag, address: state.record.wallet, me: state.record.owner === address || state.record.wallet === address }
      : null;
  const rows: Row[] =
    clean === ""
      ? recents.slice(0, 5)
      : [...(exact ? [exact] : []), ...recents.filter((r) => r.tag.startsWith(clean) && r.tag !== exact?.tag)];
  const loading = state.status === "checking" && rows.length === 0;
  const notFound = state.status === "not-found" && rows.length === 0;
  const suggestions = notFound ? recents.filter((r) => distance(r.tag, clean) <= 2).slice(0, 3) : [];
  const border = notFound ? "#F04438" : clean !== "" && rows.length ? "#1F5EFF" : "#E4E7EC";

  const field = (
    <div
      key={notFound ? `nf-${clean}` : "field"}
      className={`field${notFound ? " shake" : " rise d2"}`}
      style={{ height: 62, borderColor: border, boxShadow: notFound ? "0 0 0 4px rgba(240,68,56,.12)" : undefined }}
    >
      <Icon name="search" size={20} stroke="#98A2B3" />
      <b style={{ fontSize: 22 }}>@</b>
      <input
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={query}
        onChange={(e) => onQuery(e.target.value.replace(/^@+/, "").toLowerCase())}
        placeholder="their tag"
        aria-label="Search tags"
        style={{ fontSize: 20 }}
        autoFocus
      />
      {notFound ? (
        <span className="av pop" style={{ width: 28, height: 28, background: "#F04438" }}>
          <Icon name="close" size={14} stroke="#fff" sw={3.2} />
        </span>
      ) : query !== "" ? (
        <button
          type="button"
          className="press"
          aria-label="Clear"
          onClick={() => onQuery("")}
          style={{ border: 0, background: "#F2F4F7", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="close" size={14} sw={2.8} />
        </button>
      ) : null}
    </div>
  );

  return (
    <Screen
      header={<TopBack title="Send" href="/app" />}
      bodyStyle={{ gap: 16, paddingTop: 4 }}
      side={
        <section className="card desk-only rise d3" style={{ padding: 22 }}>
          <div className="lbl" style={{ marginBottom: 14 }}>
            How sending works
          </div>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(
              [
                ["search", "Type their tag", "Tags are exact. If nobody owns it, you can't continue."],
                ["shield", "Check the wallet", "You see their full address before anything is signed."],
                ["wallet", "Approve in your wallet", "TagIt never holds your keys or your money."],
              ] as const
            ).map(([icon, title, body], i) => (
              <div key={title} className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                <span className="av" style={{ width: 38, height: 38, borderRadius: 12, background: "#EEF3FF", color: "#1F5EFF" }}>
                  <Icon name={icon} size={18} />
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {i + 1}. {title}
                  </div>
                  <div className="mute" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
                    {body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      }
      dock={
        notFound ? (
          <button type="button" className="btn off" disabled>
            Continue
          </button>
        ) : undefined
      }
    >
      <h1 className="h1 rise d1" style={{ fontSize: 28 }}>
        Who are you paying?
      </h1>
      {field}

      {state.status === "invalid" && clean !== "" && (
        <div className="row" style={{ gap: 8, fontSize: 14, fontWeight: 800, color: "#B54708" }}>
          <span className="dot" style={{ background: "#F79009" }} />
          {TAG_PROBLEM_MESSAGES[state.problem]}
        </div>
      )}
      {state.status === "error" && (
        <div className="err">
          <Icon name="warn" size={17} /> {describeError(state.error, { tag: state.tag })}
        </div>
      )}

      {loading && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
          {["40%", "30%"].map((w) => (
            <div key={w} className="row">
              <span className="skel" style={{ width: 44, height: 44, borderRadius: "50%" }} />
              <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="skel" style={{ width: w, height: 12 }} />
                <span className="skel" style={{ width: "55%", height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="lbl">{clean === "" ? "Recent" : `${rows.length} ${rows.length === 1 ? "match" : "matches"}`}</div>
          <div className="card stagger" style={{ padding: "4px 16px" }}>
            {rows.map((r) =>
              r.me ? (
                <Link key={r.tag} href="/tag" className="tx press pop">
                  <RowBody row={r} />
                  <span className="badge" style={{ background: "#F2F4F7", color: "#6B7280" }}>
                    That&apos;s you
                  </span>
                </Link>
              ) : (
                <button key={r.tag} type="button" className="tx press pop" onClick={() => onPick(r.tag)} style={{ width: "100%", border: 0, background: "none", textAlign: "left" }}>
                  <RowBody row={r} />
                  {r === exact ? (
                    <span className="badge b-green">
                      <Icon name="check" size={12} /> Found
                    </span>
                  ) : (
                    <span className="mute">
                      <Icon name="chevron" size={17} />
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        </>
      )}

      {notFound && (
        <>
          <section className="rise d2" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "30px 16px 10px" }}>
            <div className="pop d3" style={{ position: "relative", width: 110, height: 110, borderRadius: "50%", background: "#FEECEB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 46, fontWeight: 800, color: "#F04438", letterSpacing: "-.04em" }}>@?</span>
              <span
                className="float"
                style={{ position: "absolute", right: -6, top: 4, ["--r" as string]: "12deg", width: 34, height: 34, borderRadius: 12, background: "#fff", boxShadow: "0 8px 18px -8px rgba(13,19,33,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="search" size={18} stroke="#F04438" sw={2.6} />
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, letterSpacing: "-.02em", wordBreak: "break-all" }}>No one has @{clean}</div>
            <p className="sub" style={{ fontSize: 15, maxWidth: 310 }}>
              Tags are exact, so check the spelling with them. We won&apos;t let you send to a tag nobody owns.
            </p>
          </section>
          {suggestions.length > 0 && (
            <>
              <div className="lbl rise d4">Did you mean</div>
              {suggestions.map((r) => (
                <button
                  key={r.tag}
                  type="button"
                  className="card row press rise d5"
                  style={{ padding: "14px 16px", border: 0, textAlign: "left" }}
                  onClick={() => {
                    onQuery(r.tag);
                    onPick(r.tag);
                  }}
                >
                  <Avatar seed={r.tag} label={r.tag} size={44} />
                  <div className="grow">
                    <div style={{ fontSize: 16, fontWeight: 800 }}>@{r.tag}</div>
                    <div className="mono mute" style={{ fontSize: 12 }}>
                      {shortAddress(r.address)}
                    </div>
                  </div>
                  <span className="badge b-blue">
                    Pay <Icon name="chevron" size={12} sw={3} />
                  </span>
                </button>
              ))}
            </>
          )}
        </>
      )}

      {!notFound && (
        <div className="row rise d4 mute" style={{ gap: 8, fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
          <Icon name="shield" size={18} stroke="#1F5EFF" />
          <span>You&apos;ll see their full wallet address before anything is sent.</span>
        </div>
      )}
    </Screen>
  );
}

function RowBody({ row }: { row: Row }) {
  return (
    <>
      <Avatar seed={row.tag} label={row.tag} size={44} />
      <div className="grow">
        <div style={{ fontSize: 16, fontWeight: 800 }}>@{row.tag}</div>
        <div className="mono mute" style={{ fontSize: 12, fontWeight: 500 }}>
          {shortAddress(row.address)}
        </div>
      </div>
    </>
  );
}
