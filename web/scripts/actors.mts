// Test accounts for the e2e scripts, kept as `stellar keys` identities
// (tagit-alice, …) on this machine so whoever runs the tests keeps control.

import { execFileSync } from "node:child_process";

import { Keypair } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";

import { config } from "@/lib/stellar/config";
import { getAccountInfo } from "@/lib/stellar/horizon";
import type { Signer } from "@/lib/stellar/registry";

export type Actor = { name: string; keypair: Keypair; address: string; signer: Signer };

export function actorFrom(name: string, keypair: Keypair): Actor {
  const address = keypair.publicKey();
  const { signTransaction } = basicNodeSigner(keypair, config.networkPassphrase);
  return { name, keypair, address, signer: { address, signTransaction } };
}

export function identity(name: string): Actor {
  const id = `tagit-${name}`;
  try {
    execFileSync("stellar", ["keys", "address", id], { stdio: "pipe" });
  } catch {
    execFileSync("stellar", ["keys", "generate", id, "--network", "testnet", "--fund"], { stdio: "pipe" });
  }
  const secret = execFileSync("stellar", ["keys", "show", id], { encoding: "utf8" }).trim();
  return actorFrom(name, Keypair.fromSecret(secret));
}

export async function ensureFunded(a: Actor) {
  if ((await getAccountInfo(a.address)).exists) return;
  const res = await fetch(`https://friendbot.stellar.org/?addr=${a.address}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${a.name}: ${res.status}`);
}
