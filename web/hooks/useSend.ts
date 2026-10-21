"use client";

import { StrKey } from "@stellar/stellar-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { ASSETS, fromUnits, toUnits, type Asset, type AssetCode } from "@/lib/stellar/assets";
import { describeError, type TagItError } from "@/lib/stellar/errors";
import { getAccountInfo } from "@/lib/stellar/horizon";
import { lookupTag, previewSend, sendToTag, type Signer } from "@/lib/stellar/registry";
import { parseTag, TAG_PROBLEM_MESSAGES } from "@/lib/stellar/tag";
import { transactionStatus } from "@/lib/stellar/tx";

import { accountKey } from "./useBalances";
import { historyKey } from "./useHistory";

export type SendDraft = { tag: string; asset: AssetCode; amount: string };

/** Everything the review sheet shows, and exactly what gets signed. */
export type Quote = {
  tag: string;
  /** The receiving wallet the user approves; passed to the contract as `expected`. */
  wallet: string;
  asset: Asset;
  units: bigint;
  feeStroops: bigint;
};

/** Real moments for the "Signed → Sent → Confirmed" timeline. */
export type Times = { signedAt?: Date; submittedAt?: Date; confirmedAt?: Date; ledger?: number };

export type SendState =
  | { step: "edit"; error?: string }
  | { step: "checking" }
  | { step: "review"; quote: Quote; notice?: string; changed?: boolean }
  | { step: "signing"; quote: Quote }
  /** The tag was re-pointed: nothing was sent; the user must review the new wallet. */
  | { step: "changed"; quote: Quote; previous: Quote }
  /** Signed and on its way; `unknown` = submitted but not confirmable yet. */
  | { step: "sending"; quote: Quote; times: Times; hash?: string; unknown?: boolean; checking?: boolean }
  | { step: "done"; quote: Quote; times: Times; hash: string }
  | { step: "failed"; quote: Quote; times: Times; reason: string; detail: string; hash?: string };

type Checked = { ok: true; quote: Quote } | { ok: false; error: string };

/** Pre-flight: every check the plan lists, before the review sheet. */
async function check(signer: Signer, draft: SendDraft): Promise<Checked> {
  const parsed = parseTag(draft.tag);
  if (!parsed.ok) return { ok: false, error: TAG_PROBLEM_MESSAGES[parsed.problem] };
  const tag = parsed.tag;
  const asset = ASSETS[draft.asset];

  const units = toUnits(draft.amount, asset.decimals);
  if (units === null) return { ok: false, error: "Enter an amount above zero, up to 7 decimals." };

  const lookup = await lookupTag(tag);
  if (lookup.status === "not-found") return { ok: false, error: `No one has @${tag}.` };
  if (lookup.status !== "found") {
    return {
      ok: false,
      error:
        lookup.status === "error"
          ? describeError(lookup.error, { tag })
          : TAG_PROBLEM_MESSAGES[lookup.problem],
    };
  }
  const wallet = lookup.record.wallet;

  const me = await getAccountInfo(signer.address);
  if (!me.exists) {
    return { ok: false, error: "Your wallet isn't active on Testnet yet. Fund it with Friendbot first." };
  }
  if (me.spendable[asset.code] === null) {
    return { ok: false, error: `Your wallet can't hold ${asset.code} yet. Add a ${asset.code} trustline first.` };
  }

  // A contract wallet has no Horizon account; the simulation below vouches for it.
  if (!StrKey.isValidContract(wallet)) {
    const them = await getAccountInfo(wallet);
    if (!them.exists) return { ok: false, error: `@${tag}'s wallet isn't active yet.` };
    if (asset.code !== "XLM" && them.balances[asset.code] === null) {
      return {
        ok: false,
        error: `@${tag} can't receive ${asset.code} yet. Send XLM or ask them to add ${asset.code}.`,
      };
    }
  }

  const preview = await previewSend(signer.address, { tag, expected: wallet, asset, amount: units });
  if (!preview.ok) return { ok: false, error: describeError(preview.error, { tag, asset: asset.code }) };
  const fee = preview.value.feeStroops;

  const spendable = me.spendable[asset.code]!;
  const xlm = me.spendable.XLM ?? 0n;
  if (asset.code === "XLM" && units + fee > spendable) {
    const max = spendable > fee ? spendable - fee : 0n;
    return { ok: false, error: `You can send up to ${fromUnits(max)} XLM, after reserves and the ${fromUnits(fee)} XLM fee.` };
  }
  if (asset.code !== "XLM" && units > spendable) {
    return { ok: false, error: `You have ${fromUnits(spendable)} ${asset.code} available.` };
  }
  if (asset.code !== "XLM" && fee > xlm) {
    return { ok: false, error: `You need about ${fromUnits(fee)} XLM for the network fee.` };
  }

  return { ok: true, quote: { tag, wallet, asset, units, feeStroops: fee } };
}

const isRecipientChanged = (e: TagItError) => e.kind === "registry" && e.name === "RecipientChanged";

/** Pre-flight → review → sign → sending → done, mapping every failure to a plain message. */
export function useSend(signer: Signer | null) {
  const [state, setState] = useState<SendState>({ step: "edit" });
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    if (!signer) return;
    void queryClient.invalidateQueries({ queryKey: accountKey(signer.address) });
    void queryClient.invalidateQueries({ queryKey: historyKey(signer.address) });
  }, [signer, queryClient]);

  const prepare = useCallback(
    async (draft: SendDraft) => {
      if (!signer) return setState({ step: "edit", error: "Connect your wallet first." });
      setState({ step: "checking" });
      try {
        const res = await check(signer, draft);
        setState(res.ok ? { step: "review", quote: res.quote } : { step: "edit", error: res.error });
      } catch {
        setState({ step: "edit", error: "Couldn't reach Stellar Testnet. Try again in a moment." });
      }
    },
    [signer],
  );

  /**
   * After a refused attempt, re-run every pre-flight check against the tag as
   * it is now. A changed wallet goes to the "changed" state, to be approved
   * again — whether the contract caught it in simulation or on chain.
   */
  const recover = useCallback(
    async (quote: Quote, message: string) => {
      if (!signer) return;
      const draft = { tag: quote.tag, asset: quote.asset.code, amount: fromUnits(quote.units) };
      let res: Checked;
      try {
        res = await check(signer, draft);
      } catch {
        return setState({ step: "review", quote, notice: message });
      }
      if (!res.ok) {
        const released = (await lookupTag(quote.tag)).status === "not-found";
        return setState({
          step: "edit",
          error: released ? `@${quote.tag} was released. Nothing was sent.` : res.error,
        });
      }
      if (res.quote.wallet !== quote.wallet) {
        return setState({ step: "changed", quote: res.quote, previous: quote });
      }
      setState({ step: "review", quote: res.quote, notice: message });
    },
    [signer],
  );

  const confirm = useCallback(async () => {
    if (!signer || state.step !== "review") return;
    const { quote } = state;
    const times: Times = {};
    let hash: string | undefined;
    setState({ step: "signing", quote });

    const res = await sendToTag(
      signer,
      { tag: quote.tag, expected: quote.wallet, asset: quote.asset, amount: quote.units },
      {
        onSigned: () => {
          times.signedAt = new Date();
          setState({ step: "sending", quote, times: { ...times } });
        },
        onSubmitted: (h) => {
          hash = h;
          times.submittedAt = new Date();
          setState({ step: "sending", quote, times: { ...times }, hash: h });
        },
      },
    );

    if (res.ok) {
      setState({ step: "done", quote, hash: res.hash, times: { ...times, confirmedAt: new Date(), ledger: res.ledger } });
      return refresh();
    }
    const error = res.error;
    if (error.kind === "pending") {
      return setState({ step: "sending", quote, times: { ...times }, hash: error.hash, unknown: true });
    }
    const message = describeError(error, { tag: quote.tag, asset: quote.asset.code });
    if (error.kind === "wallet-rejected") return setState({ step: "review", quote, notice: message });

    // Refused before it was signed: safe to re-check and retry.
    if (!times.signedAt || isRecipientChanged(error)) return recover(quote, message);

    setState({
      step: "failed",
      quote,
      times: { ...times },
      reason: message,
      detail: error.kind === "registry" || error.kind === "token" ? error.name : error.kind,
      hash: res.hash ?? hash,
    });
    refresh();
  }, [signer, state, recover, refresh]);

  /** Asks the network again about a submitted-but-unconfirmed payment. */
  const checkPending = useCallback(async () => {
    if (state.step !== "sending" || !state.hash) return;
    const { quote, hash, times } = state;
    setState({ ...state, checking: true });
    const res = await transactionStatus(hash);
    if (res.ok) {
      setState({ step: "done", quote, hash, times: { ...times, confirmedAt: new Date(), ledger: res.ledger } });
      return refresh();
    }
    if (res.error.kind === "pending") return setState({ step: "sending", quote, times, hash, unknown: true });
    if (isRecipientChanged(res.error)) return recover(quote, describeError(res.error, { tag: quote.tag }));
    setState({
      step: "failed",
      quote,
      times,
      hash,
      reason: describeError(res.error, { tag: quote.tag, asset: quote.asset.code }),
      detail: res.error.kind === "registry" || res.error.kind === "token" ? res.error.name : res.error.kind,
    });
  }, [state, recover, refresh]);

  /** From "changed": look at the new wallet before anything is signed. */
  const reviewNew = useCallback(() => {
    if (state.step !== "changed") return;
    setState({ step: "review", quote: state.quote, changed: true });
  }, [state]);

  const reset = useCallback(() => setState({ step: "edit" }), []);

  return { state, prepare, confirm, checkPending, reviewNew, reset };
}
