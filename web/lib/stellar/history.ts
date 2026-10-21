// Payment history from the registry's `("tagit", "paid", from, to)` events.
//
// RPC only keeps a rolling window of events (about 7 days on Testnet), so
// this is "recent activity", not a full ledger history.

import { Address, nativeToScVal, rpc, scValToNative } from "@stellar/stellar-sdk";

import { assetBySacId, type Asset } from "./assets";
import { config } from "./config";
import { rpcServer } from "./rpc";

/**
 * Event scans get their own client with a timeout: one stalled request
 * shouldn't hold up the whole history (it's retried instead).
 */
const events = new rpc.Server(config.rpcUrl, { timeout: 3_000 });
const PARALLEL = 4;

export type PaymentEvent = {
  id: string;
  txHash: string;
  ledger: number;
  at: Date;
  direction: "sent" | "received";
  from: string;
  to: string;
  /** The tag that was paid. */
  tag: string;
  asset: Asset | undefined;
  token: string;
  /** In stroops. */
  amount: bigint;
};

const PAGE = 200;
/** Cursor pages per chunk, if one chunk holds more than PAGE events. */
const MAX_CALLS = 30;
/**
 * The window's start moves every ledger and RPC nodes behind the load
 * balancer differ slightly, so start an hour inside it.
 */
const WINDOW_MARGIN = 720;
const RANGE_ERROR = /ledger range: (\d+) - (\d+)/;

const sym = (s: string) => nativeToScVal(s, { type: "symbol" }).toXDR("base64");
const addr = (a: string) => new Address(a).toScVal().toXDR("base64");

/** A getEvents cursor is a TOID ("<ledger<<32 | …>-<event>"); this is its ledger. */
export function cursorLedger(cursor: string): number {
  return Number(BigInt(cursor.split("-")[0]) >> 32n);
}

function parse(event: rpc.Api.EventResponse, me: string): PaymentEvent {
  const [, , fromVal, toVal] = event.topic;
  const from = scValToNative(fromVal) as string;
  const to = scValToNative(toVal) as string;
  const [tag, token, amount] = scValToNative(event.value) as [string, string, bigint];
  return {
    id: event.id,
    txHash: event.txHash,
    ledger: event.ledger,
    at: new Date(event.ledgerClosedAt),
    direction: from === me ? "sent" : "received",
    from,
    to,
    tag,
    asset: assetBySacId(token),
    token,
    amount: BigInt(amount),
  };
}

/** RPC scans at most ~10k ledgers per call; chunks stay just under that. */
const CHUNK = 9_900;

async function healthyRange(): Promise<{ from: number; to: number }> {
  const { oldestLedger, latestLedger } = await rpcServer.getHealth();
  return { from: Math.min(oldestLedger + WINDOW_MARGIN, latestLedger), to: latestLedger };
}

/** Every matching event in [start, end), following cursors if a chunk is busy. */
async function scanChunk(filters: rpc.Api.EventFilter[], start: number, end: number) {
  const found: rpc.Api.EventResponse[] = [];
  let res: rpc.Api.GetEventsResponse;
  try {
    res = await withRetry(() => events.getEvents({ filters, startLedger: start, endLedger: end, limit: PAGE }));
  } catch (e) {
    // The first chunk can race the window's moving start: retry from where the node says it begins.
    const range = RANGE_ERROR.exec(String((e as { message?: unknown })?.message ?? e));
    if (!range) throw e;
    const from = Math.min(Number(range[1]) + WINDOW_MARGIN, end - 1);
    res = await withRetry(() => events.getEvents({ filters, startLedger: from, endLedger: end, limit: PAGE }));
  }
  for (let call = 1; ; call++) {
    found.push(...res.events.filter((e) => e.ledger < end));
    const full = res.events.length >= PAGE;
    if (!full || !res.cursor || cursorLedger(res.cursor) >= end || call >= MAX_CALLS) break;
    const cursor = res.cursor;
    res = await withRetry(() => events.getEvents({ filters, cursor, limit: PAGE }));
  }
  return found;
}

/** One more try for a timed-out or dropped request; a range error goes straight up. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (RANGE_ERROR.test(String((e as { message?: unknown })?.message ?? e))) throw e;
    return fn();
  }
}

/** Runs `jobs` with at most `n` in flight, keeping their order. */
async function pool<T>(jobs: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out: T[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++;
        out[i] = await jobs[i]();
      }
    }),
  );
  return out;
}

/**
 * Every matching event in RPC's retention window, oldest first. The window
 * (~120k ledgers) is split into chunks fetched a few at a time, so history
 * takes a few round trips instead of a dozen in a row.
 */
export async function scanEvents(
  filters: rpc.Api.EventFilter[],
  /** Only the newest this-many ledgers (one day ≈ 17,280); default the whole window. */
  recent?: number,
): Promise<rpc.Api.EventResponse[]> {
  const range = await healthyRange();
  const to = range.to;
  const from = recent ? Math.max(range.from, to - recent) : range.from;
  const chunks: [number, number][] = [];
  for (let start = from; start <= to; start += CHUNK) chunks.push([start, Math.min(start + CHUNK, to + 1)]);
  const results = await pool(
    chunks.map(([s, e]) => () => scanChunk(filters, s, e)),
    PARALLEL,
  );
  const seen = new Set<string>();
  return results.flat().filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

/** One day of ledgers, for the quick first look at history. */
export const ONE_DAY = 17_280;

/** Payments `address` sent or received through TagIt, newest first. */
export async function getPaymentHistory(address: string, recent?: number): Promise<PaymentEvent[]> {
  const topics = (from: string, to: string) => [sym("tagit"), sym("paid"), from, to];
  const filters: rpc.Api.EventFilter[] = [
    {
      type: "contract",
      contractIds: [config.contractId],
      topics: [topics(addr(address), "*"), topics("*", addr(address))],
    },
  ];
  const found = await scanEvents(filters, recent);
  return found.map((e) => parse(e, address)).sort((a, b) => b.ledger - a.ledger);
}
