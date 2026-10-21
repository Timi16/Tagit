import assert from "node:assert/strict";
import { test } from "node:test";

import { xdr } from "@stellar/stellar-sdk";

import { decodeDiagnostics } from "./tx";

const REGISTRY = "CABR376QJFHZ5FB7TDMMGATGPLNRIEBBS3VGHBDHNBFPE5MY5Z355H46";
const events = (b64: string[]) => b64.map((e) => xdr.DiagnosticEvent.fromXDR(e, "base64"));

// Testnet tx 05daa68d…: a send signed for @david's old wallet, submitted after re-pointing.
const RECIPIENT_CHANGED = [
  "AAAAAAAAAAAAAAAAAAAAAgAAAAAAAAADAAAADwAAAAdmbl9jYWxsAAAAAA0AAAAgAx3/0ElPnpQ/mNjDAmZ62xQQIZbqY4RnaErydZjud94AAAAPAAAABHNlbmQAAAAQAAAAAQAAAAUAAAASAAAAAAAAAACQStOe9q5VFFjLsAZb5aUfXWrkRo4K70UUIE9O1ZkIIQAAAA4AAAAFZGF2aWQAAAAAAAASAAAAAAAAAAAuaXUP81U8bL9VugUjAEKUYTumTXyWVd4B/Q54ib3LUgAAABIAAAAB15KLcsJwPM/q9+uf9O9NUEpVqLl5/JtFDqLIQrTRzmEAAAAKAAAAAAAAAAAAAAAAAJiWgA==",
  "AAAAAAAAAAAAAAABAx3/0ElPnpQ/mNjDAmZ62xQQIZbqY4RnaErydZjud94AAAACAAAAAAAAAAIAAAAPAAAABWVycm9yAAAAAAAAAgAAAAAAAAAFAAAADgAAADZlc2NhbGF0aW5nIE9rKFNjRXJyb3JUeXBlOjpDb250cmFjdCkgZnJhbWUtZXhpdCB0byBFcnIAAA==",
  "AAAAAAAAAAAAAAAAAAAAAgAAAAAAAAACAAAADwAAAA5ob3N0X2ZuX2ZhaWxlZAAAAAAAAgAAAAAAAAAFAAAAAQ==",
];

// Testnet tx 30639a6a…: a stranger's set_wallet("david", …) with no owner auth.
const STRANGER_SET_WALLET = [
  "AAAAAAAAAAAAAAAAAAAAAgAAAAAAAAADAAAADwAAAAdmbl9jYWxsAAAAAA0AAAAgAx3/0ElPnpQ/mNjDAmZ62xQQIZbqY4RnaErydZjud94AAAAPAAAACnNldF93YWxsZXQAAAAAABAAAAABAAAAAgAAAA4AAAAFZGF2aWQAAAAAAAASAAAAAAAAAAD/xc/YhOQdwom6GwupEPhzu3IuO3Xx98v8X7SkZLT3Yg==",
  "AAAAAAAAAAAAAAABAx3/0ElPnpQ/mNjDAmZ62xQQIZbqY4RnaErydZjud94AAAACAAAAAAAAAAIAAAAPAAAABWVycm9yAAAAAAAAAgAAAAkAAAAGAAAAEAAAAAEAAAACAAAADgAAACZVbmF1dGhvcml6ZWQgZnVuY3Rpb24gY2FsbCBmb3IgYWRkcmVzcwAAAAAAEgAAAAAAAAAALml1D/NVPGy/VboFIwBClGE7pk18llXeAf0OeIm9y1I=",
];

test("decodes an on-chain RecipientChanged from the registry", () => {
  assert.deepEqual(decodeDiagnostics(events(RECIPIENT_CHANGED), REGISTRY), {
    kind: "registry",
    code: 5,
    name: "RecipientChanged",
  });
});

test("decodes a failed require_auth as an auth error", () => {
  assert.deepEqual(decodeDiagnostics(events(STRANGER_SET_WALLET), REGISTRY), { kind: "auth" });
});

test("attributes a contract error to the token when another contract raised it", () => {
  // Same events, read as if the registry were some other contract.
  const other = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  assert.deepEqual(decodeDiagnostics(events(RECIPIENT_CHANGED), other), {
    kind: "token",
    code: 5,
    name: "Authentication",
    contractId: REGISTRY,
  });
});

test("ignores events that aren't errors", () => {
  assert.equal(decodeDiagnostics(events([RECIPIENT_CHANGED[0], RECIPIENT_CHANGED[2]]), REGISTRY), undefined);
  assert.equal(decodeDiagnostics([], REGISTRY), undefined);
});

test("a failed status request is retried, not taken as the answer", async () => {
  const { rpcServer } = await import("./rpc");
  const { transactionStatus } = await import("./tx");
  const replies: (() => unknown)[] = [
    () => {
      throw new Error("socket hang up");
    },
    () => ({ status: "NOT_FOUND" }),
    () => ({ status: "SUCCESS", ledger: 5_307_238 }),
  ];
  const original = rpcServer.getTransaction;
  (rpcServer as { getTransaction: unknown }).getTransaction = async () => replies.shift()!();
  try {
    assert.deepEqual(await transactionStatus("ab".repeat(32), 10_000), { ok: true, hash: "ab".repeat(32), ledger: 5_307_238 });
  } finally {
    rpcServer.getTransaction = original;
  }
});

test("still unknown after the budget: pending, with the hash", async () => {
  const { rpcServer } = await import("./rpc");
  const { transactionStatus } = await import("./tx");
  const original = rpcServer.getTransaction;
  (rpcServer as { getTransaction: unknown }).getTransaction = async () => ({ status: "NOT_FOUND" });
  try {
    const res = await transactionStatus("cd".repeat(32), 2_000);
    assert.deepEqual(res, { ok: false, hash: "cd".repeat(32), error: { kind: "pending", hash: "cd".repeat(32) } });
  } finally {
    rpcServer.getTransaction = original;
  }
});
