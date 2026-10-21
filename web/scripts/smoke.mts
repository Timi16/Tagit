// Read-only checks of the client layer against the deployed contract.
// Free: everything here is a simulation; nothing is signed or sent.
//
//   npm run smoke

import assert from "node:assert/strict";

import { Keypair, xdr } from "@stellar/stellar-sdk";

import { Client } from "@/contract/src";
import { ASSETS } from "@/lib/stellar/assets";
import { config } from "@/lib/stellar/config";
import { decodeHostError, describeError } from "@/lib/stellar/errors";
import { getPaymentHistory } from "@/lib/stellar/history";
import { getAccountInfo } from "@/lib/stellar/horizon";
import { isRegistered, isTokenAllowed, lookupTag, tagOf } from "@/lib/stellar/registry";
import { rpcServer } from "@/lib/stellar/rpc";

const FRIENDBOT_ISSUER = "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR";

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✔ ${name}`);
  } catch (e) {
    console.log(`✘ ${name}`);
    throw e;
  }
}

await check("network is Testnet and the contract is live", async () => {
  const net = await rpcServer.getNetwork();
  assert.equal(net.passphrase, config.networkPassphrase);
  const instance = await rpcServer.getContractData(
    config.contractId,
    xdr.ScVal.scvLedgerKeyContractInstance(),
  );
  assert.ok(instance.liveUntilLedgerSeq, "contract instance has a TTL");
});

await check("XLM and USDC are allowlisted", async () => {
  for (const asset of Object.values(ASSETS)) {
    const res = await isTokenAllowed(asset.sacId);
    assert.deepEqual(res, { ok: true, value: true }, asset.code);
  }
});

await check("invalid input is rejected without a network call", async () => {
  assert.deepEqual(await lookupTag("Da!"), { status: "invalid", problem: "bad-chars" });
  assert.deepEqual(await lookupTag("ab"), { status: "invalid", problem: "too-short" });
});

await check("unknown tag resolves to not-found", async () => {
  assert.deepEqual(await lookupTag("@nobody_here"), { status: "not-found", tag: "nobody_here" });
  assert.deepEqual(await isRegistered("nobody_here"), { ok: true, value: false });
});

await check("contract rejects raw invalid tags too", async () => {
  // Bypass the client-side check to prove the contract enforces it.
  const raw = new Client({
    contractId: config.contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
  });
  const tx = await raw.is_registered({ tag: "David" });
  const sim = tx.simulation as { error?: string };
  assert.ok(sim.error, "simulation should fail");
  assert.deepEqual(decodeHostError(sim.error, config.contractId), {
    kind: "registry",
    code: 1,
    name: "InvalidTag",
  });
});

await check("reverse lookup of an untagged wallet is null", async () => {
  assert.deepEqual(await tagOf(FRIENDBOT_ISSUER), { ok: true, value: null });
});

await check("send to an unknown tag fails in simulation with a plain message", async () => {
  const from = FRIENDBOT_ISSUER;
  const c = new Client({
    contractId: config.contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
    publicKey: from,
  });
  const tx = await c.send({
    from,
    tag: "nobody_here",
    expected: from,
    token: ASSETS.XLM.sacId,
    amount: 1n,
  });
  const sim = tx.simulation as { error?: string };
  const err = decodeHostError(sim.error ?? "", config.contractId);
  assert.equal(describeError(err, { tag: "nobody_here" }), "No one has claimed @nobody_here yet.");
});

await check("horizon pre-flight data loads", async () => {
  const info = await getAccountInfo(FRIENDBOT_ISSUER);
  assert.ok(info.exists);
  assert.ok(info.exists && info.balances.XLM !== null);
  const missing = await getAccountInfo(Keypair.random().publicKey());
  assert.deepEqual(missing, { exists: false });
});

await check("payment history query is accepted by RPC", async () => {
  const history = await getPaymentHistory(FRIENDBOT_ISSUER);
  assert.ok(Array.isArray(history));
});

await check("history reaches the newest ledgers and parses payments", async () => {
  // @alice is paid by `npm run e2e`; skipped on a fresh deployment.
  const alice = await lookupTag("alice");
  if (alice.status !== "found") return console.log("  (no @alice yet: run npm run e2e)");
  const history = await getPaymentHistory(alice.record.wallet);
  assert.ok(history.length > 0, "no payments found");
  const newest = history[0];
  const ageHours = (Date.now() - newest.at.getTime()) / 3_600_000;
  assert.ok(ageHours < 24, `newest payment is ${ageHours.toFixed(1)}h old: the scan stopped early`);
  for (const p of history) {
    assert.ok(p.asset, `unknown asset ${p.token}`);
    assert.ok(p.amount > 0n);
    assert.ok(/^[a-z0-9_]{3,20}$/.test(p.tag));
    assert.ok(p.from === alice.record.wallet || p.to === alice.record.wallet);
    assert.equal(p.direction, p.from === alice.record.wallet ? "sent" : "received");
  }
  for (let i = 1; i < history.length; i++) assert.ok(history[i - 1].ledger >= history[i].ledger, "not newest first");
});

console.log(`\nAll good. Contract: ${config.explorerUrl}/contract/${config.contractId}`);
