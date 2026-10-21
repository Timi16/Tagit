import assert from "node:assert/strict";
import { test } from "node:test";

import { fromUnits, toUnits } from "./assets";

test("parses amounts exactly", () => {
  assert.equal(toUnits("25"), 250_000_000n);
  assert.equal(toUnits("25.5"), 255_000_000n);
  assert.equal(toUnits("0.0000001"), 1n);
  assert.equal(toUnits(".5"), 5_000_000n);
  assert.equal(toUnits("25."), 250_000_000n);
  assert.equal(toUnits(" 1 "), 10_000_000n);
  assert.equal(toUnits("922337203685.4775807"), 9_223_372_036_854_775_807n);
});

test("rejects anything it would have to round or guess", () => {
  for (const bad of ["", "0", "0.0", "-1", "1e3", "1,000", "abc", "1.00000001", ".", "1.2.3"]) {
    assert.equal(toUnits(bad), null, JSON.stringify(bad));
  }
});

test("formats without trailing zeros", () => {
  assert.equal(fromUnits(250_000_000n), "25");
  assert.equal(fromUnits(255_000_000n), "25.5");
  assert.equal(fromUnits(1n), "0.0000001");
  assert.equal(fromUnits(0n), "0");
  assert.equal(fromUnits(-5_000_000n), "-0.5");
});

test("round-trips", () => {
  for (const s of ["1", "0.1", "123.4567891", "0.0000001", "1000000"]) {
    assert.equal(fromUnits(toUnits(s)!), s);
  }
});

test("reads the ledger out of an RPC events cursor", async () => {
  const { cursorLedger } = await import("./history");
  assert.equal(cursorLedger("0022314468226629631-4294967295"), 5_195_491);
  assert.equal(cursorLedger(`${(5_305_731n << 32n).toString().padStart(19, "0")}-0000000001`), 5_305_731);
});

test("balances show two decimals, rounded down", async () => {
  const { formatBalance, formatAmount } = await import("../format");
  assert.equal(formatBalance(98_939_188_753n), "9,893.91");
  assert.equal(formatBalance(100_000_000_000n), "10,000.00");
  assert.equal(formatBalance(0n), "0.00");
  assert.equal(formatBalance(99_999n), "0.00");
  assert.equal(formatAmount(125_000_000n), "12.5");
  assert.equal(formatAmount(125_000_000n, 2), "12.50");
});
