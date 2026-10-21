// End-to-end proof on Testnet, through the same client code the app uses.
// Registers @alice, @bob and @david, makes five real payments (XLM and USDC),
// proves every rejection, and writes the hashes to docs/PROOF.md.
//
//   npm run e2e
//
// Test keys are `stellar keys` identities (tagit-alice, …) on this machine,
// so whoever runs this keeps control of the tags it claims. Safe to re-run.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  Asset as ClassicAsset,
  BASE_FEE,
  Address,
  Operation,
  TransactionBuilder,
  type Transaction,
  nativeToScVal,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";

import { Client } from "@/contract/src";
import { ASSETS, USDC_ISSUER, fromUnits, toUnits, type Asset } from "@/lib/stellar/assets";
import { config, txUrl } from "@/lib/stellar/config";
import { decodeHostError, toTagItError, type TagItError } from "@/lib/stellar/errors";
import { scanEvents } from "@/lib/stellar/history";
import { getAccountInfo, horizonServer } from "@/lib/stellar/horizon";
import { lookupTag, registerTag, sendToTag, setWallet, tagOf } from "@/lib/stellar/registry";
import { submit, txHash } from "@/lib/stellar/tx";

import { ensureFunded, identity, type Actor } from "./actors.mjs";

const NAMES = ["alice", "bob", "david"] as const;
type Name = (typeof NAMES)[number];


// Proof log

type Row = string[];
const proof = {
  registered: [] as Row[],
  resolved: [] as Row[],
  payments: [] as Row[],
  rejections: [] as Row[],
};

const link = (hash: string) => `[${hash.slice(0, 10)}…](${txUrl(hash)})`;
const errName = (e: TagItError) =>
  e.kind === "registry" || e.kind === "token" ? `${e.name} (#${e.code}, ${e.kind})` : e.kind;

function step(msg: string) {
  console.log(`\n▸ ${msg}`);
}

// Accounts

/** The tx that registered `tag`, from its `("tagit", "registered", tag)` event. */
async function registrationHash(tag: string): Promise<string | undefined> {
  const topic = (v: xdr.ScVal) => v.toXDR("base64");
  const events = await scanEvents([
    {
      type: "contract",
      contractIds: [config.contractId],
      topics: [
        [
          topic(nativeToScVal("tagit", { type: "symbol" })),
          topic(nativeToScVal("registered", { type: "symbol" })),
          topic(nativeToScVal(tag, { type: "string" })),
        ],
      ],
    },
  ]);
  return events.at(-1)?.txHash;
}

async function classic(a: Actor, op: ReturnType<typeof Operation.changeTrust>) {
  const account = await horizonServer.loadAccount(a.address);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: config.networkPassphrase })
    .addOperation(op)
    .setTimeout(60)
    .build();
  tx.sign(a.keypair);
  return horizonServer.submitTransaction(tx);
}

const USDC = new ClassicAsset("USDC", USDC_ISSUER);

/** USDC trustline, then buy `want` USDC with XLM on the Testnet DEX. */
async function ensureUsdc(a: Actor, want: string) {
  let info = await getAccountInfo(a.address);
  if (info.exists && info.balances.USDC === null) {
    await classic(a, Operation.changeTrust({ asset: USDC }));
    info = await getAccountInfo(a.address);
  }
  const have = info.exists ? (info.balances.USDC ?? 0n) : 0n;
  if (have >= toUnits(want)!) return;
  await classic(
    a,
    Operation.pathPaymentStrictReceive({
      sendAsset: ClassicAsset.native(),
      sendMax: "200",
      destination: a.address,
      destAsset: USDC,
      destAmount: want,
      path: [],
    }) as ReturnType<typeof Operation.changeTrust>,
  );
}

// Raw submission, for the rejections that must reach the network

function rawClient(publicKey?: string) {
  return new Client({
    contractId: config.contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
    publicKey,
  });
}

/** Submits through the app's own `submit`, always returning the hash for the proof. */
async function submitAndWait(tx: Transaction): Promise<{ hash: string; error?: TagItError }> {
  const res = await submit(tx);
  return res.ok ? { hash: res.hash } : { hash: res.hash ?? txHash(tx), error: res.error };
}

/**
 * A stranger calls an owner-only function and submits it for real, with no
 * authorisation from the owner: the contract's require_auth must reject it on chain.
 */
async function strangerAttempt(stranger: Actor, fn: "set_wallet" | "release", args: xdr.ScVal[]) {
  const c = rawClient(stranger.address);
  const tx =
    fn === "set_wallet"
      ? await c.set_wallet({ tag: "david", new_wallet: stranger.address })
      : await c.release({ tag: "david" });
  const needs = tx.needsNonInvokerSigningBy();
  const sim = tx.simulation as rpc.Api.SimulateTransactionSuccessResponse;

  // Same call and resources, but with the owner's (unsigned) auth entry removed.
  const stripped = TransactionBuilder.cloneFrom(tx.built!)
    .clearOperations()
    .addOperation(Operation.invokeContractFunction({ contract: config.contractId, function: fn, args, auth: [] }))
    .setSorobanData(sim.transactionData.build())
    .build();
  stripped.sign(stranger.keypair);
  const res = await submitAndWait(stripped);
  return { needs, ...res };
}

// Main

async function main() {
  console.log(`Registry ${config.contractId} on ${config.networkPassphrase}`);

  step("Accounts");
  const actors = Object.fromEntries(NAMES.map((n) => [n, identity(n)])) as Record<Name, Actor>;
  const stranger = identity("stranger");
  for (const a of [...Object.values(actors), stranger]) {
    await ensureFunded(a);
    console.log(`  ${a.name.padEnd(8)} ${a.address}`);
  }

  step("USDC trustlines and balances (bought on the Testnet DEX)");
  await ensureUsdc(actors.alice, "20");
  await ensureUsdc(actors.bob, "20");
  await ensureUsdc(actors.david, "1");
  console.log("  done");

  step("Register @alice, @bob, @david");
  for (const name of NAMES) {
    const a = actors[name];
    const owned = await tagOf(a.address);
    if (owned.ok && owned.value === name) {
      const hash = await registrationHash(name);
      console.log(`  @${name} already registered to ${a.name} ${hash ?? "(older than the RPC event window)"}`);
      proof.registered.push([`@${name}`, `\`${a.address}\``, hash ? link(hash) : "earlier run, outside RPC's event window"]);
      continue;
    }
    const res = await registerTag(a.signer, name);
    if (!res.ok) throw new Error(`register @${name}: ${errName(res.error)}`);
    console.log(`  @${name} → ${res.hash}`);
    proof.registered.push([`@${name}`, `\`${a.address}\``, link(res.hash)]);
  }

  step("Resolve each tag and compare with the keypair");
  for (const name of NAMES) {
    const lookup = await lookupTag(`@${name}`);
    if (lookup.status !== "found") throw new Error(`@${name} did not resolve`);
    const match = lookup.record.wallet === actors[name].address;
    console.log(`  @${name} → ${lookup.record.wallet} ${match ? "✓" : "✗"}`);
    if (!match) throw new Error(`@${name} resolves to the wrong wallet`);
    proof.resolved.push([`@${name}`, `\`${lookup.record.wallet}\``, `\`${actors[name].address}\``, "✓"]);
  }

  step("Five payments by tag (no address typed: only the tag plus what it resolved to)");
  const payments: [Name, Name, Asset, string][] = [
    ["alice", "david", ASSETS.XLM, "25"],
    ["alice", "bob", ASSETS.USDC, "5"],
    ["bob", "alice", ASSETS.XLM, "10"],
    ["bob", "david", ASSETS.USDC, "2"],
    ["david", "bob", ASSETS.XLM, "7.5"],
  ];
  for (const [from, to, asset, amount] of payments) {
    const lookup = await lookupTag(to);
    if (lookup.status !== "found") throw new Error(`@${to} did not resolve`);
    const before = await getAccountInfo(lookup.record.wallet);
    const res = await sendToTag(actors[from].signer, {
      tag: to,
      expected: lookup.record.wallet,
      asset,
      amount: toUnits(amount)!,
    });
    if (!res.ok) throw new Error(`@${from} → @${to}: ${errName(res.error)}`);
    const after = await getAccountInfo(lookup.record.wallet);
    const delta =
      before.exists && after.exists ? (after.balances[asset.code] ?? 0n) - (before.balances[asset.code] ?? 0n) : 0n;
    console.log(`  @${from} → @${to} ${amount} ${asset.code} (+${fromUnits(delta)}) ${res.hash}`);
    proof.payments.push([`@${from}`, `@${to}`, `${amount} ${asset.code}`, `+${fromUnits(delta)}`, link(res.hash)]);
  }

  step("Unknown and invalid tags are rejected");
  const unknown = await lookupTag("nobody_here");
  console.log(`  resolve(nobody_here) → ${unknown.status}`);
  proof.rejections.push(["resolve `nobody_here`", "NotFound (#3)", "simulation"]);

  const unknownSend = await rawClient(actors.alice.address).send({
    from: actors.alice.address,
    tag: "nobody_here",
    expected: actors.alice.address,
    token: ASSETS.XLM.sacId,
    amount: 1n,
  });
  const unknownErr = decodeHostError(String((unknownSend.simulation as { error?: string }).error), config.contractId);
  console.log(`  send(nobody_here) → ${errName(unknownErr)}`);
  proof.rejections.push(["send to `nobody_here`", errName(unknownErr), "simulation"]);

  for (const bad of ["A!", "ab", "abcdefghijklmnopqrstu"]) {
    // Straight to the contract, skipping the client-side check.
    const tx = await rawClient().resolve({ tag: bad });
    const err = decodeHostError(String((tx.simulation as { error?: string }).error), config.contractId);
    console.log(`  resolve(${bad}) → ${errName(err)}`);
    proof.rejections.push([`resolve \`${bad}\` (${bad.length} chars)`, errName(err), "simulation"]);
  }

  step("Duplicate registration is prevented");
  const dupe = await registerTag(stranger.signer, "david");
  if (dupe.ok) throw new Error("stranger registered @david!");
  console.log(`  stranger register(david) → ${errName(dupe.error)}`);
  proof.rejections.push(["stranger `register(\"david\")`", errName(dupe.error), "simulation, never signed"]);

  step("A stranger can't modify someone else's tag (submitted on chain)");
  const davidTag = nativeToScVal("david", { type: "string" });
  for (const [label, args] of [
    ["set_wallet", [davidTag, new Address(stranger.address).toScVal()]],
    ["release", [davidTag]],
  ] as const) {
    const res = await strangerAttempt(stranger, label, [...args]);
    const err = res.error ? errName(res.error) : "SUCCEEDED (bug!)";
    console.log(`  stranger ${label}(david): needs ${res.needs.join(", ")} → ${err} ${res.hash}`);
    if (!res.error) throw new Error(`stranger ${label} succeeded`);
    proof.rejections.push([`stranger \`${label}("david", …)\``, `${err}: needs ${res.needs[0].slice(0, 6)}…`, link(res.hash)]);
  }
  const still = await lookupTag("david");
  if (still.status !== "found" || still.record.wallet !== actors.david.address) throw new Error("@david changed!");

  step("Recipient-changed guard: signed against the old wallet, re-pointed, then submitted");
  const reviewed = actors.david.address;
  const pending = await rawClient(actors.alice.address).send({
    from: actors.alice.address,
    tag: "david",
    expected: reviewed,
    token: ASSETS.XLM.sacId,
    amount: toUnits("1")!,
  });
  await pending.sign({ signTransaction: actors.alice.signer.signTransaction });
  const repoint = await setWallet(actors.david.signer, "david", actors.bob.address);
  if (!repoint.ok) throw new Error(`set_wallet: ${errName(repoint.error)}`);
  console.log(`  @david re-pointed → ${repoint.hash}`);
  const raced = await submitAndWait(pending.signed!);
  console.log(`  alice's pre-signed send → ${raced.error ? errName(raced.error) : "SUCCEEDED (bug!)"} ${raced.hash}`);
  if (!raced.error) throw new Error("payment went through after the tag changed");
  proof.rejections.push(["send signed for old wallet, tag re-pointed first", errName(raced.error), link(raced.hash)]);
  const restore = await setWallet(actors.david.signer, "david", actors.david.address);
  if (!restore.ok) throw new Error(`restore: ${errName(restore.error)}`);
  console.log(`  @david restored → ${restore.hash}`);

  writeProof(actors, stranger);
}

function table(head: string[], rows: Row[]) {
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

function writeProof(actors: Record<Name, Actor>, stranger: Actor) {
  const md = `# TagIt Testnet proof

Generated by \`web/scripts/e2e.mts\` on ${new Date().toISOString().slice(0, 10)} against registry
[\`${config.contractId}\`](${config.explorerUrl}/contract/${config.contractId}).
Every payment goes through the same \`sendToTag\` the app uses: only a tag and the address it just resolved.

## Accounts

${table(["Name", "Address"], [...Object.values(actors), stranger].map((a) => [a.name, `\`${a.address}\``]))}

## 3+ tags registered

${table(["Tag", "Owner", "Transaction"], proof.registered)}

## 3+ tags resolve correctly

${table(["Tag", "resolve() returned", "Keypair public key", "Match"], proof.resolved)}

## 5+ payments by tag

${table(["From", "To", "Amount", "Recipient balance change", "Transaction"], proof.payments)}

## Rejections

${table(["Attempt", "Result", "Evidence"], proof.rejections)}
`;
  const path = resolve(import.meta.dirname, "../../docs/PROOF.md");
  writeFileSync(path, md);
  console.log(`\nWrote ${path}`);
}

main().catch((e) => {
  console.error("\n✘", e instanceof Error ? e.message : e);
  console.error(toTagItError(e, config.contractId));
  process.exit(1);
});
