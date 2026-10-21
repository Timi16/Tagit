import { fromUnits } from "./stellar/assets";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 minutes ago", "yesterday", or "just now". */
export function timeAgo(date: Date, now = Date.now()): string {
  const seconds = Math.round((date.getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** GDQ7…K2LD */
export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** "1234567.5" → "1,234,567.5" */
export function groupThousands(decimal: string): string {
  const [whole, fraction] = decimal.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction !== undefined ? `${grouped}.${fraction}` : grouped;
}

/** Stroops → "9,820.5" (exact; `minDecimals` pads, e.g. 2 → "9,820.50"). */
export function formatAmount(units: bigint, minDecimals = 0): string {
  const [whole, fraction = ""] = fromUnits(units).split(".");
  const f = fraction.padEnd(minDecimals, "0");
  return groupThousands(f ? `${whole}.${f}` : whole);
}

/** A balance as the design shows it: two decimals, rounded down so it never overstates. */
export function formatBalance(units: bigint): string {
  const cents = units / 100_000n; // 7 decimals → 2
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `${groupThousands(whole.toString())}.${fraction}`;
}

/** "09:41" in the viewer's clock. */
export function clockTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** "Today", "Yesterday" or "19 Oct". */
export function dayLabel(date: Date, now = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(now) - day(date)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
