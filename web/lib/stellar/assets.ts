import { config } from "./config";

export type AssetCode = "XLM" | "USDC";

export type Asset = {
  code: AssetCode;
  /** Classic issuer, or null for native XLM. */
  issuer: string | null;
  /** Stellar Asset Contract the registry transfers through. */
  sacId: string;
  decimals: number;
};

/** Circle's Testnet USDC. */
export const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const ASSETS: Record<AssetCode, Asset> = {
  XLM: { code: "XLM", issuer: null, sacId: config.xlmSacId, decimals: 7 },
  USDC: { code: "USDC", issuer: USDC_ISSUER, sacId: config.usdcSacId, decimals: 7 },
};

/** Kept back by MAX on XLM so the network fee still fits (a send costs ~0.002 XLM). */
export const XLM_FEE_HEADROOM = 1_000_000n;

export function assetBySacId(sacId: string): Asset | undefined {
  return Object.values(ASSETS).find((a) => a.sacId === sacId);
}

/**
 * "25.5" → 255000000n. Returns null for anything that isn't a plain positive
 * decimal with at most `decimals` places, so the UI never rounds silently.
 */
export function toUnits(amount: string, decimals = 7): bigint | null {
  const trimmed = amount.trim();
  const match = /^(\d+)(?:\.(\d*))?$/.exec(trimmed) ?? /^()\.(\d+)$/.exec(trimmed);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return null;
  const units = BigInt((whole || "0") + fraction.padEnd(decimals, "0"));
  return units > 0n ? units : null;
}

/** 255000000n → "25.5". */
export function fromUnits(units: bigint, decimals = 7): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, -decimals);
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}
