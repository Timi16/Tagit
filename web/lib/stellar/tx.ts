// Submitting a signed transaction and finding out what happened to it.
//
// Once the network accepts a transaction its hash is never thrown away: if we
// can't confirm the outcome (flaky network, slow ledger), the result is
// `pending` with that hash, so the UI can't offer a retry that pays twice.

import { humanizeEvents, rpc, type Transaction, type xdr } from "@stellar/stellar-sdk";

import { config } from "./config";
import { REGISTRY_ERRORS, TOKEN_ERRORS, toTagItError, type TagItError } from "./errors";
import { rpcServer } from "./rpc";

export type Submitted =
  | { ok: true; hash: string; ledger?: number }
  | { ok: false; error: TagItError; hash?: string };

/** Moments along the way, for the payment timeline. */
export type TxHooks = {
  /** The wallet returned a signature. */
  onSigned?: () => void;
  /** The network accepted the transaction and it's waiting for a ledger. */
  onSubmitted?: (hash: string) => void;
};

/** Keep asking for this long (a ledger closes every ~5 s) before calling it pending. */
const POLL_BUDGET_MS = 60_000;
const POLL_EVERY_MS = 1_500;

export function txHash(tx: Transaction): string {
  return Array.from(tx.hash(), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The first `("error", Error(..))` diagnostic event is where a transaction
 * broke; attribute it to the contract that raised it.
 */
export function decodeDiagnostics(
  events: xdr.DiagnosticEvent[],
  registryId: string = config.contractId,
): TagItError | undefined {
  for (const d of events) {
    const body = d.event.body;
    if (body.type !== "v0") continue;
    const [first, second] = body.v0.topics;
    if (first?.type !== "scvSymbol" || first.value !== "error" || second?.type !== "scvError") continue;
    const err = second.error;
    if (err.type === "sceAuth") return { kind: "auth" };
    if (err.type !== "sceContract") continue;
    const code = err.contractCode;
    const contractId = humanizeEvents([d])[0]?.contractId;
    if (contractId === registryId) {
      const name = REGISTRY_ERRORS[code as keyof typeof REGISTRY_ERRORS];
      if (name) return { kind: "registry", code, name };
    }
    return { kind: "token", code, name: TOKEN_ERRORS[code as keyof typeof TOKEN_ERRORS] ?? "Unknown", contractId };
  }
  return undefined;
}

/**
 * What a submitted transaction's hash says about it. Polls until it lands or
 * the budget runs out; a failed request is retried, never taken as an answer.
 */
export async function transactionStatus(hash: string, budgetMs = POLL_BUDGET_MS): Promise<Submitted> {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    try {
      const res = await rpcServer.getTransaction(hash);
      if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return { ok: true, hash, ledger: (res as rpc.Api.GetSuccessfulTransactionResponse).ledger };
      }
      if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
        const events = (res as rpc.Api.GetFailedTransactionResponse).diagnosticEventsXdr ?? [];
        return { ok: false, hash, error: decodeDiagnostics(events) ?? { kind: "unknown", message: "failed" } };
      }
    } catch {
      // A blip talking to RPC says nothing about the transaction: ask again.
    }
    if (Date.now() + POLL_EVERY_MS > deadline) break;
    await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
  }
  return { ok: false, hash, error: { kind: "pending", hash } };
}

/** Sends a signed transaction and waits for its outcome. */
export async function submit(tx: Transaction, hooks: TxHooks = {}): Promise<Submitted> {
  const hash = txHash(tx);
  let sent: rpc.Api.SendTransactionResponse;
  try {
    sent = await rpcServer.sendTransaction(tx);
  } catch (e) {
    // The request may or may not have reached the network.
    const error = toTagItError(e, config.contractId);
    return { ok: false, hash, error: error.kind === "unknown" ? { kind: "pending", hash } : error };
  }

  // Refused before reaching a ledger: nothing happened, safe to retry.
  if (sent.status === "ERROR") {
    return {
      ok: false,
      error: decodeDiagnostics(sent.diagnosticEvents ?? []) ?? { kind: "unknown", message: "rejected by the network" },
    };
  }
  if (sent.status === "TRY_AGAIN_LATER") {
    return { ok: false, error: { kind: "unknown", message: "network busy" } };
  }
  // PENDING or DUPLICATE: it's in the network's hands now.
  hooks.onSubmitted?.(hash);
  return transactionStatus(hash);
}
