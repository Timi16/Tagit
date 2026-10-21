import assert from "node:assert/strict";
import { test } from "node:test";

import { decodeHostError, describeError, toTagItError } from "./errors";

const REGISTRY = "CABR376QJFHZ5FB7TDMMGATGPLNRIEBBS3VGHBDHNBFPE5MY5Z355H46";
const XLM = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Captured from Testnet: resolve("nobody_here").
const NOT_FOUND =
  "HostError: Error(Contract, #3)\n\nEvent log (newest first):\n   0: [Diagnostic Event] contract:CABR376QJFHZ5FB7TDMMGATGPLNRIEBBS3VGHBDHNBFPE5MY5Z355H46, topics:[error, Error(Contract, #3)], data:\"escalating Ok(ScErrorType::Contract) frame-exit to Err\"\n   1: [Diagnostic Event] topics:[fn_call, CABR376QJFHZ5FB7TDMMGATGPLNRIEBBS3VGHBDHNBFPE5MY5Z355H46, resolve], data:\"nobody_here\"\n";

// A send where the XLM contract fails first and the registry frame re-raises it.
const nested = (code: number) =>
  `HostError: Error(Contract, #${code})\n\nEvent log (newest first):\n` +
  `   0: [Diagnostic Event] contract:${REGISTRY}, topics:[error, Error(Contract, #${code})], data:"contract call failed"\n` +
  `   1: [Diagnostic Event] contract:${XLM}, topics:[error, Error(Contract, #${code})], data:["balance is not sufficient to spend", 1000]\n` +
  `   2: [Diagnostic Event] contract:${REGISTRY}, topics:[fn_call, ${XLM}, transfer], data:[...]\n` +
  `   3: [Diagnostic Event] topics:[fn_call, ${REGISTRY}, send], data:[...]\n`;

test("decodes a registry error from a real simulation", () => {
  assert.deepEqual(decodeHostError(NOT_FOUND, REGISTRY), {
    kind: "registry",
    code: 3,
    name: "NotFound",
  });
});

test("blames the token, not the registry, when the token failed", () => {
  assert.deepEqual(decodeHostError(nested(10), REGISTRY), {
    kind: "token",
    code: 10,
    name: "Balance",
    contractId: XLM,
  });
  // #6 would read as TokenNotAllowed if we trusted the first number.
  assert.deepEqual(decodeHostError(nested(6), REGISTRY), {
    kind: "token",
    code: 6,
    name: "AccountMissing",
    contractId: XLM,
  });
  assert.equal(
    (decodeHostError(nested(13), REGISTRY) as { name: string }).name,
    "TrustlineMissing",
  );
});

test("falls back sensibly without diagnostics", () => {
  assert.deepEqual(decodeHostError("Error(Contract, #5)", REGISTRY), {
    kind: "registry",
    code: 5,
    name: "RecipientChanged",
  });
  assert.equal(decodeHostError("HostError: Error(Auth, InvalidAction)", REGISTRY).kind, "auth");
  assert.equal(decodeHostError("socket hang up", REGISTRY).kind, "unknown");
});

test("recognises wallet rejections", () => {
  for (const e of [
    { code: -4, message: "The user rejected this request." },
    { message: "User declined access" },
    new Error("Request cancelled by user"),
  ]) {
    assert.deepEqual(toTagItError(e, REGISTRY), { kind: "wallet-rejected" });
  }
});

test("speaks plainly", () => {
  const notFound = decodeHostError(NOT_FOUND, REGISTRY);
  assert.equal(describeError(notFound, { tag: "davd" }), "No one has claimed @davd yet.");
  assert.equal(
    describeError(decodeHostError("Error(Contract, #5)", REGISTRY), { tag: "david" }),
    "@david just changed their wallet. Review the new address before sending.",
  );
  assert.equal(
    describeError(decodeHostError(nested(13), REGISTRY), { tag: "david", asset: "USDC" }),
    "@david can't receive USDC yet. Send XLM or ask them to add USDC.",
  );
  assert.equal(
    describeError({ kind: "wallet-rejected" }),
    "You cancelled in your wallet. Nothing was sent.",
  );
});
