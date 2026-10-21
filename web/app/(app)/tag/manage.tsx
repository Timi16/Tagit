"use client";

import { StrKey } from "@stellar/stellar-sdk";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Tilt } from "@/components/motion";
import { Qr } from "@/components/qr";
import {
  Icon,
  Screen,
  Sheet,
  SheetTitle,
  Toast,
  TopBack,
} from "@/components/ui";
import { myTagKey, useMyTag, type MyTag } from "@/hooks/useMyTag";
import { useOrigin } from "@/hooks/useOrigin";
import { useToast } from "@/hooks/useToast";
import { useWallet } from "@/hooks/useWallet";
import { txUrl } from "@/lib/stellar/config";
import { describeError } from "@/lib/stellar/errors";
import {
  releaseTag,
  setWallet,
  type Signer,
  type TxOutcome,
} from "@/lib/stellar/registry";
import { transactionStatus } from "@/lib/stellar/tx";

type Result = { ok: boolean; text: string; hash?: string } | null;

/** ManageTag.dc.html, with sheets for "Change receiving wallet" and "Release". */
export function ManageTag() {
  const { address, signer } = useWallet();
  const myTag = useMyTag(address);
  const toast = useToast();
  const [sheet, setSheet] = useState<"wallet" | "release" | null>(null);
  const origin = useOrigin();

  if (myTag.isPending) {
    return (
      <Screen header={<TopBack title="My tag" href="/app" />}>
        <div className="skel" style={{ height: 160, borderRadius: 28 }} />
        <div className="skel" style={{ height: 180, borderRadius: 24 }} />
      </Screen>
    );
  }

  if (!myTag.data) {
    return (
      <Screen
        header={<TopBack title="My tag" href="/app" />}
        dock={
          <Link href="/claim" className="btn press">
            Claim your @tag
          </Link>
        }
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 10,
            padding: "40px 16px 10px",
          }}
        >
          <span
            className="av float"
            style={{
              width: 96,
              height: 96,
              borderRadius: 30,
              background: "#1F5EFF",
              fontSize: 44,
            }}
          >
            @
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>
            No tag yet
          </div>
          <p className="sub" style={{ maxWidth: 300 }}>
            Claim one so friends can pay you by name.
          </p>
        </section>
      </Screen>
    );
  }

  const { tag, record } = myTag.data;
  const link = `${origin}/@${tag}`;
  const since = new Date(Number(record.created_at) * 1000).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
  const elsewhere = record.wallet !== record.owner;

  const row = (
    icon: Parameters<typeof Icon>[0]["name"],
    title: string,
    sub: string,
    danger = false,
  ) => (
    <>
      <span
        className="av"
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          background: danger ? "#FEECEB" : "#EEF3FF",
          color: danger ? "#B42318" : "#1F5EFF",
        }}
      >
        <Icon name={icon} size={19} sw={2.3} />
      </span>
      <div className="grow">
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: danger ? "#B42318" : "#0D1321",
          }}
        >
          {title}
        </div>
        <div
          className="mute"
          style={{
            fontSize: 13,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sub}
        </div>
      </div>
      <span className="mute">
        <Icon name="chevron" size={17} />
      </span>
    </>
  );
  const rowStyle = {
    padding: "14px 0",
    width: "100%",
    border: 0,
    background: "none",
    textAlign: "left" as const,
  };

  return (
    <Screen
      header={<TopBack title="My tag" href="/app" />}
      bodyStyle={{ paddingTop: 4 }}
      side={
        <>
          {origin && (
            <section className="card desk-only rise d3" style={{ padding: 22, textAlign: "center" }}>
              <div style={{ display: "inline-block", padding: 12, borderRadius: 22, border: "1px solid #EEF0F4", lineHeight: 0 }}>
                <Qr value={link} size={176} label={`QR code for @${tag}`} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 12 }}>Scan to pay @{tag}</div>
              <div className="mono mute" style={{ fontSize: 12, marginTop: 4, wordBreak: "break-all" }}>
                {link.replace(/^https?:\/\//, "")}
              </div>
            </section>
          )}
          <div
            className="row rise d5"
            style={{ gap: 10, padding: 14, borderRadius: 18, background: "#EEF3FF", color: "#1F5EFF", fontSize: 13, lineHeight: 1.45, fontWeight: 700 }}
          >
            <Icon name="lock" size={20} />
            <span>Only your wallet can change or release @{tag}. The contract rejects anyone else.</span>
          </div>
        </>
      }
      overlay={
        <>
          {sheet === "wallet" && signer && (
            <WalletSheet
              mine={myTag.data}
              signer={signer}
              onClose={() => setSheet(null)}
            />
          )}
          {sheet === "release" && signer && (
            <ReleaseSheet
              tag={tag}
              signer={signer}
              onClose={() => setSheet(null)}
            />
          )}
          <Toast text={toast.text} />
        </>
      }
    >
      <Tilt className="hero rise d1" style={{ padding: "22px 20px 20px" }} max={5}>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.82 }}>
              Your tag
            </span>
            <span
              className="badge"
              style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}
            >
              <Icon name="shield" size={13} sw={2.4} /> Owner
            </span>
          </div>
          <div
            style={{
              fontSize: tag.length > 12 ? 34 : 46,
              fontWeight: 800,
              letterSpacing: "-.05em",
              lineHeight: 1,
              wordBreak: "break-all",
            }}
          >
            @{tag}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.82 }}>
            Yours since {since} · Stellar Testnet
          </div>
        </div>
      </Tilt>

      <section className="card rise d2" style={{ padding: "4px 18px" }}>
        <div className="row" style={{ padding: "14px 0 6px" }}>
          <span className="lbl grow">Payments go to</span>
          <span className={`badge ${elsewhere ? "b-blue" : "b-green"}`}>
            <Icon name="check" size={12} />{" "}
            {elsewhere ? "Another wallet" : "Linked"}
          </span>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            fontWeight: 600,
            wordBreak: "break-all",
            padding: "10px 12px",
            borderRadius: 14,
            background: "#F7F8FA",
          }}
        >
          {record.wallet}
        </div>
        <button
          type="button"
          className="row press"
          style={rowStyle}
          onClick={() => setSheet("wallet")}
        >
          {row(
            "swap",
            "Change receiving wallet",
            `Point @${tag} to another wallet`,
          )}
        </button>
      </section>

      <section className="card rise d3" style={{ padding: "0 18px" }}>
        <Link
          href="/receive"
          className="row press"
          style={{ padding: "14px 0" }}
        >
          {row("share", "Share my tag", "QR code and pay link")}
        </Link>
        <div style={{ height: 1, background: "#F0F2F5" }} />
        <button
          type="button"
          className="row press"
          style={rowStyle}
          onClick={() =>
            void navigator.clipboard
              ?.writeText(link)
              .then(() => toast.show("Link copied"))
          }
        >
          {row("link", "Pay link", link.replace(/^https?:\/\//, ""))}
        </button>
      </section>

      <section className="card rise d4" style={{ padding: "0 18px" }}>
        <button
          type="button"
          className="row press"
          style={rowStyle}
          onClick={() => setSheet("release")}
        >
          {row(
            "trash",
            `Release @${tag}`,
            "Give it up so anyone can claim it",
            true,
          )}
        </button>
      </section>

    </Screen>
  );
}

function Outcome({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <div
      className={result.ok ? "row" : "err"}
      role={result.ok ? "status" : "alert"}
      style={
        result.ok
          ? {
              gap: 10,
              padding: "12px 14px",
              borderRadius: 16,
              background: "#E7F8EF",
              color: "#067647",
              fontSize: 13,
              fontWeight: 700,
            }
          : undefined
      }
    >
      <Icon name={result.ok ? "check" : "warn"} size={17} />
      <span>
        {result.text}{" "}
        {result.hash && (
          <a
            href={txUrl(result.hash)}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "underline" }}
          >
            View tx
          </a>
        )}
      </span>
    </div>
  );
}

function WalletSheet({
  mine,
  signer,
  onClose,
}: {
  mine: NonNullable<MyTag>;
  signer: Signer;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const next = value.trim();
  const valid = StrKey.isValidEd25519PublicKey(next);
  const same = next === mine.record.wallet;

  async function save(wallet: string) {
    setBusy(true);
    setResult(null);
    done(await setWallet(signer, mine.tag, wallet));
  }

  async function recheck(hash: string) {
    setBusy(true);
    done(await transactionStatus(hash));
  }

  function done(res: TxOutcome) {
    setBusy(false);
    if (res.ok) {
      setValue("");
      setResult({
        ok: true,
        text: `@${mine.tag} now pays this wallet.`,
        hash: res.hash,
      });
      void queryClient.invalidateQueries({
        queryKey: myTagKey(signer.address),
      });
      void queryClient.invalidateQueries({ queryKey: ["tag", mine.tag] });
    } else {
      setResult({
        ok: false,
        text: describeError(res.error, { tag: mine.tag }),
        hash: res.error.kind === "pending" ? res.error.hash : undefined,
      });
    }
  }

  return (
    <Sheet label="Change receiving wallet" onClose={busy ? undefined : onClose}>
      <SheetTitle onClose={onClose}>Change receiving wallet</SheetTitle>
      <p className="sub" style={{ fontSize: 14, marginBottom: 14 }}>
        Payments to @{mine.tag} will go here. You stay the owner either way.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label htmlFor="new-wallet" className="lbl">
          New wallet address
        </label>
        <input
          id="new-wallet"
          className={`tin mono${next && !valid ? " bad" : ""}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="G…"
          autoComplete="off"
          spellCheck={false}
        />
        {next && !valid && (
          <div
            className="row"
            style={{ gap: 8, fontSize: 13, fontWeight: 800, color: "#B42318" }}
          >
            {StrKey.isValidContract(next)
              ? "Use a G… account address, not a contract."
              : "That isn't a Stellar address."}
          </div>
        )}
        {same && (
          <div className="mute" style={{ fontSize: 13, fontWeight: 700 }}>
            That&apos;s already the receiving wallet.
          </div>
        )}
        <Outcome result={result} />
        {result && !result.ok && result.hash ? (
          <button
            type="button"
            className="btn press"
            disabled={busy}
            onClick={() => void recheck(result.hash!)}
          >
            {busy ? "Checking…" : "Check status"}
          </button>
        ) : (
          <button
            type="button"
            className={`btn press${!valid || same ? " off" : ""}`}
            disabled={!valid || same || busy}
            onClick={() => void save(next)}
          >
            {busy ? "Approve in your wallet…" : `Point @${mine.tag} here`}
          </button>
        )}
        {mine.record.wallet !== signer.address && (
          <button
            type="button"
            className="btn ghost press"
            disabled={busy}
            onClick={() => void save(signer.address)}
          >
            Use this wallet
          </button>
        )}
      </div>
    </Sheet>
  );
}

function ReleaseSheet({
  tag,
  signer,
  onClose,
}: {
  tag: string;
  signer: Signer;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const armed = confirm.trim().replace(/^@/, "").toLowerCase() === tag;

  async function release() {
    setBusy(true);
    setResult(null);
    done(await releaseTag(signer, tag));
  }

  async function recheck(hash: string) {
    setBusy(true);
    done(await transactionStatus(hash));
  }

  function done(res: TxOutcome) {
    setBusy(false);
    if (res.ok) {
      void queryClient.invalidateQueries({
        queryKey: myTagKey(signer.address),
      });
      void queryClient.invalidateQueries({ queryKey: ["tag", tag] });
      onClose();
    } else {
      setResult({
        ok: false,
        text: describeError(res.error, { tag }),
        hash: res.error.kind === "pending" ? res.error.hash : undefined,
      });
    }
  }

  return (
    <Sheet label={`Release @${tag}`} onClose={busy ? undefined : onClose}>
      <SheetTitle onClose={onClose}>Release @{tag}?</SheetTitle>
      <p className="sub" style={{ fontSize: 14, marginBottom: 14 }}>
        Anyone can claim @{tag} after this, and payments to it stop reaching
        you. Type the tag to confirm.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          aria-label={`Type ${tag} to confirm`}
          className="tin"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={tag}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          style={{ fontWeight: 800 }}
        />
        <Outcome result={result} />
        {result && !result.ok && result.hash ? (
          <button
            type="button"
            className="btn press"
            disabled={busy}
            onClick={() => void recheck(result.hash!)}
          >
            {busy ? "Checking…" : "Check status"}
          </button>
        ) : (
          <button
            type="button"
            className={`btn press${armed ? "" : " off"}`}
            style={
              armed
                ? {
                    background: "#D92D20",
                    boxShadow: "0 14px 24px -14px rgba(217,45,32,.9)",
                  }
                : undefined
            }
            disabled={!armed || busy}
            onClick={() => void release()}
          >
            {busy ? "Approve in your wallet…" : `Release @${tag}`}
          </button>
        )}
      </div>
    </Sheet>
  );
}
