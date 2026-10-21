// Typed access to the tagit-registry contract.
//
// Reads are simulations: free, no wallet. Writes are simulated first (so a
// contract error never reaches the wallet), then signed by the user's own
// wallet and submitted. Every function returns a result instead of throwing.

import { rpc } from "@stellar/stellar-sdk";
import type { AssembledTransaction, SignTransaction } from "@stellar/stellar-sdk/contract";

import { Client, type TagRecord } from "@/contract/src";

import type { Asset } from "./assets";
import { config } from "./config";
import { registryErrorNamed, toTagItError, type TagItError } from "./errors";
import { submit, type Submitted, type TxHooks } from "./tx";
import { parseTag, type TagProblem } from "./tag";

export type { TagRecord };

/** The connected wallet, as far as the registry is concerned. */
export type Signer = {
  address: string;
  signTransaction: SignTransaction;
};

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: TagItError };

export type TxOutcome = Submitted;

function client(publicKey?: string): Client {
  return new Client({
    contractId: config.contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
    publicKey,
  });
}

let reader: Client | undefined;
function readClient(): Client {
  return (reader ??= client());
}

function fail(e: unknown): { ok: false; error: TagItError } {
  return { ok: false, error: toTagItError(e, config.contractId) };
}

type RustResult<T> = { isOk(): boolean; unwrap(): T; unwrapErr(): { message: string } };

/** Methods returning `Result<T, Error>` come back as Ok/Err wrappers. */
function unwrap<T>(value: unknown): Outcome<T> {
  if (value && typeof value === "object" && "isOk" in value && "unwrapErr" in value) {
    const result = value as RustResult<T>;
    if (result.isOk()) return { ok: true, value: result.unwrap() };
    const name = result.unwrapErr().message;
    return { ok: false, error: registryErrorNamed(name) ?? { kind: "unknown", message: name } };
  }
  return { ok: true, value: value as T };
}

/** Reads `tx`'s simulated value, or the error the simulation hit. */
function simulated<T>(tx: AssembledTransaction<unknown>): Outcome<T> {
  const sim = tx.simulation;
  if (!sim) return fail(new Error("Transaction was not simulated"));
  // Decode the raw error ourselves: see errors.ts for why not `tx.result`.
  if (rpc.Api.isSimulationError(sim)) return fail(sim.error);
  return unwrap<T>(tx.result);
}

async function read<T>(call: () => Promise<AssembledTransaction<unknown>>): Promise<Outcome<T>> {
  try {
    return simulated<T>(await call());
  } catch (e) {
    return fail(e);
  }
}

/** Simulate, sign in the wallet, submit, wait. Errors before submission are safe to retry. */
async function write(
  signer: Signer,
  call: (c: Client) => Promise<AssembledTransaction<unknown>>,
  hooks: TxHooks = {},
): Promise<TxOutcome> {
  let tx: AssembledTransaction<unknown>;
  try {
    tx = await call(client(signer.address));
    const preview = simulated(tx);
    if (!preview.ok) return preview;
    await tx.sign({ signTransaction: signer.signTransaction });
  } catch (e) {
    return fail(e);
  }
  if (!tx.signed) return fail(new Error("The wallet returned no signed transaction"));
  hooks.onSigned?.();
  return submit(tx.signed, hooks);
}

// Reads

export type Lookup =
  | { status: "invalid"; problem: TagProblem }
  | { status: "not-found"; tag: string }
  | { status: "found"; tag: string; record: TagRecord }
  | { status: "error"; tag: string; error: TagItError };

/** Normalises `input` and fetches its record. Invalid input never hits the network. */
export async function lookupTag(input: string): Promise<Lookup> {
  const parsed = parseTag(input);
  if (!parsed.ok) return { status: "invalid", problem: parsed.problem };
  const { tag } = parsed;

  const res = await read<TagRecord>(() => readClient().get({ tag }));
  if (res.ok) return { status: "found", tag, record: res.value };
  if (res.error.kind === "registry" && res.error.name === "NotFound") {
    return { status: "not-found", tag };
  }
  return { status: "error", tag, error: res.error };
}

export function isRegistered(tag: string): Promise<Outcome<boolean>> {
  return read<boolean>(() => readClient().is_registered({ tag }));
}

export async function tagOf(address: string): Promise<Outcome<string | null>> {
  const res = await read<string | undefined>(() => readClient().tag_of({ owner: address }));
  return res.ok ? { ok: true, value: res.value ?? null } : res;
}

export function isTokenAllowed(token: string): Promise<Outcome<boolean>> {
  return read<boolean>(() => readClient().is_token_allowed({ token }));
}

// Writes

export function registerTag(signer: Signer, tag: string): Promise<TxOutcome> {
  return write(signer, (c) => c.register({ owner: signer.address, tag }));
}

export function setWallet(
  signer: Signer,
  tag: string,
  newWallet: string,
): Promise<TxOutcome> {
  return write(signer, (c) => c.set_wallet({ tag, new_wallet: newWallet }));
}

export function releaseTag(signer: Signer, tag: string): Promise<TxOutcome> {
  return write(signer, (c) => c.release({ tag }));
}

export type Payment = {
  tag: string;
  /** The exact address shown on the review screen. */
  expected: string;
  asset: Asset;
  /** In stroops. */
  amount: bigint;
};

function buildSend(c: Client, from: string, payment: Payment) {
  return c.send({
    from,
    tag: payment.tag,
    expected: payment.expected,
    token: payment.asset.sacId,
    amount: payment.amount,
  });
}

/**
 * Simulates the exact payment the review screen will sign, without signing.
 * Catches every contract and token error up front and prices the network fee.
 */
export async function previewSend(
  from: string,
  payment: Payment,
): Promise<Outcome<{ feeStroops: bigint }>> {
  try {
    const tx = await buildSend(client(from), from, payment);
    const sim = simulated<void>(tx);
    if (!sim.ok) return sim;
    return { ok: true, value: { feeStroops: BigInt(tx.built?.fee ?? 0) } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Pays `payment.tag`, but only while it still resolves to `expected`. If the
 * owner re-points it first, this fails with RecipientChanged and nothing moves.
 */
export function sendToTag(signer: Signer, payment: Payment, hooks?: TxHooks): Promise<TxOutcome> {
  return write(signer, (c) => buildSend(c, signer.address, payment), hooks);
}
