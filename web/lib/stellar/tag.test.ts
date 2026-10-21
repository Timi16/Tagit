import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeTag, parseTag, TAG_PATTERN } from "./tag";

test("normalises what people type", () => {
  assert.equal(normalizeTag("  @David "), "david");
  assert.equal(normalizeTag("@@bob"), "bob");
  assert.equal(normalizeTag("ALICE_1"), "alice_1");
});

test("explains why a tag is invalid", () => {
  assert.deepEqual(parseTag(""), { ok: false, problem: "empty" });
  assert.deepEqual(parseTag("@"), { ok: false, problem: "empty" });
  assert.deepEqual(parseTag("ab"), { ok: false, problem: "too-short" });
  assert.deepEqual(parseTag("a".repeat(21)), { ok: false, problem: "too-long" });
  assert.deepEqual(parseTag("A!"), { ok: false, problem: "bad-chars" });
  assert.deepEqual(parseTag("da-vid"), { ok: false, problem: "bad-chars" });
  assert.deepEqual(parseTag("dávid"), { ok: false, problem: "bad-chars" });
  assert.deepEqual(parseTag("da vid"), { ok: false, problem: "bad-chars" });
});

test("accepts the same tags as the contract", () => {
  assert.deepEqual(parseTag("@David"), { ok: true, tag: "david" });
  assert.deepEqual(parseTag("a_1"), { ok: true, tag: "a_1" });
  assert.deepEqual(parseTag("a".repeat(20)), { ok: true, tag: "a".repeat(20) });
});

test("matches the contract byte for byte", () => {
  // Same exhaustive check as contracts/.../test/tags.rs, after normalising.
  for (let b = 0; b < 128; b++) {
    const ch = String.fromCharCode(b);
    const tag = `ab${ch}de`;
    const contractAccepts = /[a-z0-9_]/.test(ch);
    assert.equal(TAG_PATTERN.test(tag), contractAccepts, `char ${b}`);
  }
});

test("reserves the app's own page names", async () => {
  const { isReservedTag } = await import("./tag");
  for (const t of ["app", "send", "claim", "receive", "history", "tag", "_next", "api"]) assert.ok(isReservedTag(t), t);
  for (const t of ["david", "sender", "apps"]) assert.ok(!isReservedTag(t), t);
});

test("bad URL escapes don't throw", async () => {
  const { safeDecode } = await import("./tag");
  assert.equal(safeDecode("%E0"), "%E0");
  assert.equal(safeDecode("%40david"), "@david");
});
