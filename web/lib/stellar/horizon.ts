import { Horizon, NotFoundError } from "@stellar/stellar-sdk";

import { ASSETS, toUnits, type AssetCode } from "./assets";
import { config } from "./config";

export const horizonServer = new Horizon.Server(config.horizonUrl);

/** 0.5 XLM per base reserve, in stroops. */
const BASE_RESERVE = 5_000_000n;

export type AccountInfo =
  | { exists: false }
  | {
      exists: true;
      /** In stroops; null means no trustline (never null for XLM). */
      balances: Record<AssetCode, bigint | null>;
      /** What can actually be sent: balance minus reserves and open offers. */
      spendable: Record<AssetCode, bigint | null>;
    };

/** Existence, balances and trustlines, for pre-flight checks. */
export async function getAccountInfo(address: string): Promise<AccountInfo> {
  let account: Horizon.AccountResponse;
  try {
    account = await horizonServer.loadAccount(address);
  } catch (e) {
    if (e instanceof NotFoundError) return { exists: false };
    throw e;
  }

  const balances: Record<AssetCode, bigint | null> = { XLM: null, USDC: null };
  const spendable: Record<AssetCode, bigint | null> = { XLM: null, USDC: null };

  for (const line of account.balances) {
    if (line.asset_type === "liquidity_pool_shares") continue;
    const balance = toUnits(line.balance) ?? 0n;
    const locked = toUnits(line.selling_liabilities) ?? 0n;

    if (line.asset_type === "native") {
      const entries =
        2n +
        BigInt(account.subentry_count) +
        BigInt(account.num_sponsoring) -
        BigInt(account.num_sponsored);
      balances.XLM = balance;
      spendable.XLM = clamp(balance - entries * BASE_RESERVE - locked);
    } else if (
      "asset_code" in line &&
      line.asset_code === ASSETS.USDC.code &&
      line.asset_issuer === ASSETS.USDC.issuer
    ) {
      balances.USDC = balance;
      spendable.USDC = clamp(balance - locked);
    }
  }
  return { exists: true, balances, spendable };
}

function clamp(units: bigint): bigint {
  return units > 0n ? units : 0n;
}
