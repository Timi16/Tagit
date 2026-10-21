"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useSend } from "@/hooks/useSend";
import { useWallet } from "@/hooks/useWallet";
import type { AssetCode } from "@/lib/stellar/assets";
import { normalizeTag } from "@/lib/stellar/tag";

import { AmountStep } from "./amount";
import { DoneStep } from "./done";
import { ReviewSheet } from "./review";
import { TagStep } from "./tag";

/**
 * The send flow from the canvas: SendTag → SendAmount → SendReview (a sheet
 * over the amount) → SendDone. One page, so a half-finished payment never
 * lives in the URL.
 */
export function SendFlow() {
  const params = useSearchParams();
  const { signer } = useWallet();
  const send = useSend(signer);
  const initial = normalizeTag(params.get("to") ?? "");
  const [step, setStep] = useState<"tag" | "amount">(initial ? "amount" : "tag");
  const [tag, setTag] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [asset, setAsset] = useState<AssetCode>("XLM");
  const [amount, setAmount] = useState("");

  const s = send.state;

  if (s.step === "sending" || s.step === "done" || s.step === "failed") {
    return (
      <DoneStep
        state={s}
        onCheck={() => void send.checkPending()}
        onSendAgain={() => {
          send.reset();
          setAmount("");
          setQuery("");
          setStep("tag");
        }}
        onRetry={() => send.reset()}
      />
    );
  }

  if (step === "tag") {
    return (
      <TagStep
        query={query}
        onQuery={setQuery}
        onPick={(t) => {
          setTag(t);
          setStep("amount");
        }}
      />
    );
  }

  const reviewing = s.step === "review" || s.step === "signing" || s.step === "changed";
  return (
    <AmountStep
      tag={tag}
      asset={asset}
      onAsset={setAsset}
      amount={amount}
      onAmount={setAmount}
      checking={s.step === "checking"}
      error={s.step === "edit" ? s.error : undefined}
      blurred={reviewing}
      onBack={() => {
        send.reset();
        setQuery(tag);
        setStep("tag");
      }}
      onNotFound={() => {
        setQuery(tag);
        setStep("tag");
      }}
      onReview={() => void send.prepare({ tag, asset, amount })}
      sheet={
        reviewing ? (
          <ReviewSheet state={s} onConfirm={() => void send.confirm()} onClose={() => send.reset()} onReviewNew={send.reviewNew} />
        ) : null
      }
    />
  );
}
