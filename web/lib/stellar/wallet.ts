"use client";

// Thin wrapper over Stellar Wallets Kit (Freighter, xBull, Lobstr, Albedo…).
// Keys never leave the wallet: we only ever hand it XDR to sign.

import { Networks, StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";

import { config, TESTNET_PASSPHRASE } from "./config";
import { OFFERED_WALLETS, type OfferedWallet } from "./wallets";
import type { Signer } from "./registry";

let initialised = false;

/**
 * Browser end-to-end tests only: a wallet the test runner signs for. Next
 * inlines NEXT_PUBLIC_E2E at build time, so without `NEXT_PUBLIC_E2E=1` this
 * is `undefined` and the branches using it are compiled out.
 */
type TestWallet = { address: string; sign: (xdr: string) => Promise<string> };
function testWallet(): TestWallet | undefined {
  if (process.env.NEXT_PUBLIC_E2E !== "1") return undefined;
  return (window as unknown as { __tagitTestWallet?: TestWallet }).__tagitTestWallet;
}

function kit(): typeof StellarWalletsKit {
  if (!initialised) {
    StellarWalletsKit.init({
      modules: defaultModules(),
      network: config.networkPassphrase as Networks,
    });
    initialised = true;
  }
  return StellarWalletsKit;
}

export type WalletOption = OfferedWallet & { available: boolean; url: string };

/** The offered wallets, with whether each is installed or reachable here. */
export async function listWallets(): Promise<WalletOption[]> {
  if (testWallet()) return OFFERED_WALLETS.map((w) => ({ ...w, available: true, url: "" }));
  const supported = await kit().refreshSupportedWallets();
  return OFFERED_WALLETS.flatMap((w) => {
    const found = supported.find((s) => s.id === w.id);
    return found ? [{ ...w, available: found.isAvailable, url: found.url }] : [];
  });
}

/** Connects one specific wallet (asks it for access) and returns its address. */
export async function connectWith(id: string): Promise<string> {
  const test = testWallet();
  if (test) return test.address;
  kit().setWallet(id);
  const { address } = await kit().fetchAddress();
  return address;
}

/** Opens the kit's own wallet picker and returns the chosen address. */
export async function connectWallet(): Promise<string> {
  const test = testWallet();
  if (test) return test.address;
  const { address } = await kit().authModal();
  return address;
}

export async function disconnectWallet(): Promise<void> {
  if (testWallet()) return;
  await kit().disconnect();
}

/** The address of an already-connected wallet, if any. */
export async function currentAddress(): Promise<string | null> {
  const test = testWallet();
  if (test) return test.address;
  try {
    const { address } = await kit().getAddress();
    return address || null;
  } catch {
    return null;
  }
}

/** True when the wallet is on Testnet; TagIt refuses to sign anywhere else. */
export async function isOnTestnet(): Promise<boolean> {
  if (testWallet()) return true;
  try {
    const { networkPassphrase } = await kit().getNetwork();
    return networkPassphrase === TESTNET_PASSPHRASE;
  } catch {
    // Not every wallet reports its network; signing still pins Testnet below.
    return true;
  }
}

export function signerFor(address: string): Signer {
  return {
    address,
    signTransaction: async (xdr, opts) => {
      const test = testWallet();
      if (test) return { signedTxXdr: await test.sign(xdr), signerAddress: address };
      const { signedTxXdr, signerAddress } = await kit().signTransaction(xdr, {
        networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
        address,
      });
      return { signedTxXdr, signerAddress };
    },
  };
}
