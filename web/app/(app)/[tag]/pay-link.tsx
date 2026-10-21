"use client";

import Link from "next/link";
import { use } from "react";

import { Avatar, Icon, Logo, Screen, WalletAddress } from "@/components/ui";
import { useResolveTag } from "@/hooks/useResolveTag";
import { useWallet } from "@/hooks/useWallet";
import { describeError } from "@/lib/stellar/errors";
import { safeDecode, TAG_PROBLEM_MESSAGES } from "@/lib/stellar/tag";

/** tagit.app/@tag: the page a pay link or QR opens. */
export function PayLink({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: raw } = use(params);
  const state = useResolveTag(safeDecode(raw));
  const { address } = useWallet();

  const header = (
    <header className="top rise">
      <Link className="logo-link" href="/" aria-label="TagIt home">
        <Logo />
      </Link>
      <span className="badge b-amber">
        <span className="dot" style={{ background: "#F79009" }} />
        Testnet
      </span>
    </header>
  );

  if (state.status === "idle" || state.status === "checking") {
    return (
      <Screen header={header} variant="narrow">
        <div className="skel" style={{ height: 380, borderRadius: 24 }} />
      </Screen>
    );
  }

  if (state.status !== "found") {
    const missing = state.status === "not-found";
    return (
      <Screen
        header={header}
        variant="narrow"
        dock={
          missing ? (
            <Link href={`/claim?tag=${state.tag}`} className="btn press">
              Claim @{state.tag}
            </Link>
          ) : (
            <Link href="/" className="btn ghost press">
              About TagIt
            </Link>
          )
        }
      >
        <section className="rise d1" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "40px 16px 10px" }}>
          <div className="pop d2" style={{ width: 110, height: 110, borderRadius: "50%", background: "#FEECEB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 46, fontWeight: 800, color: "#F04438", letterSpacing: "-.04em" }}>@?</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, wordBreak: "break-all" }}>
            {missing ? `No one has @${state.tag}` : "That's not a tag"}
          </div>
          <p className="sub" style={{ maxWidth: 310 }}>
            {missing
              ? "This pay link doesn't point to anyone yet. It's free to claim on Testnet."
              : state.status === "invalid"
                ? TAG_PROBLEM_MESSAGES[state.problem]
                : describeError(state.error)}
          </p>
        </section>
      </Screen>
    );
  }

  const { tag, record } = state;
  const mine = address === record.owner;

  return (
    <Screen
      header={header}
      variant="narrow"
      dock={
        mine ? (
          <Link href="/tag" className="btn ghost press">
            Manage my tag
          </Link>
        ) : (
          <Link href={`/send?to=${tag}`} className="btn press">
            Pay @{tag} <Icon name="chevron" size={18} sw={2.6} />
          </Link>
        )
      }
    >
      <section className="card rise d1" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "28px 20px", textAlign: "center" }}>
        <Avatar seed={tag} label={tag} size={88} />
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.04em", wordBreak: "break-all" }}>@{tag}</div>
        <span className="badge b-green">
          <Icon name="check" size={12} /> {mine ? "That's you" : "Verified on-chain"}
        </span>
      </section>
      <section className="card rise d2" style={{ display: "flex", flexDirection: "column", gap: 10, background: "#F5F8FF", border: "1px solid #DFE7FF" }}>
        <div className="lbl">Payments go to</div>
        <WalletAddress address={record.wallet} />
      </section>
      <div className="row rise d3 mute" style={{ gap: 8, fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
        <Icon name="shield" size={18} stroke="#1F5EFF" />
        <span>You&apos;ll check this address again before anything is sent. XLM or USDC on Stellar Testnet.</span>
      </div>
    </Screen>
  );
}
