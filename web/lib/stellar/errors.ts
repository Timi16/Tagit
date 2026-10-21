// Turns failures from simulation, submission or the wallet into one typed
// error and a plain sentence for the UI.
//
// The registry (codes 1–9) and the Stellar Asset Contracts it calls (codes
// 1–15) both report `Error(Contract, #N)`, so the number alone is ambiguous:
// #6 is TokenNotAllowed from us but AccountMissing from a SAC. The SDK's
// built-in parsing maps the first number it sees onto our table, so we read
// the diagnostic log instead and attribute the error to the contract that
// actually raised it.

import type { AssetCode } from "./assets";

export const REGISTRY_ERRORS = {
  1: "InvalidTag",
  2: "TagTaken",
  3: "NotFound",
  4: "AlreadyHasTag",
  5: "RecipientChanged",
  6: "TokenNotAllowed",
  7: "InvalidAmount",
  8: "SelfPayment",
  9: "InvalidWallet",
} as const;

export type RegistryErrorName = (typeof REGISTRY_ERRORS)[keyof typeof REGISTRY_ERRORS];

/** soroban-env-host builtin_contracts/contract_error.rs */
export const TOKEN_ERRORS = {
  2: "OperationNotSupported",
  4: "Unauthorized",
  5: "Authentication",
  6: "AccountMissing",
  7: "AccountIsNotClassic",
  8: "NegativeAmount",
  9: "Allowance",
  10: "Balance",
  11: "BalanceDeauthorized",
  12: "Overflow",
  13: "TrustlineMissing",
  14: "InsufficientAccountReserve",
  15: "TooManyAccountSubentries",
} as const;

export type TokenErrorName = (typeof TOKEN_ERRORS)[keyof typeof TOKEN_ERRORS];

export type TagItError =
  | { kind: "registry"; code: number; name: RegistryErrorName }
  | { kind: "token"; code: number; name: TokenErrorName | "Unknown"; contractId?: string }
  | { kind: "auth" }
  | { kind: "wallet-rejected" }
  /** Submitted, but the outcome isn't known yet. Never offer a blind retry. */
  | { kind: "pending"; hash: string }
  | { kind: "unknown"; message: string };

const DIAGNOSTIC_ERROR =
  /(\d+): \[Diagnostic Event\] contract:(C[A-Z2-7]{55}), topics:\[error, Error\(Contract, #(\d+)\)\]/g;
const CONTRACT_ERROR = /Error\(Contract, #(\d+)\)/;
const AUTH_ERROR = /Error\(Auth, /;
const WALLET_REJECTION = /reject|declin|cancel|denied|dismiss/i;

export function registryErrorNamed(name: string): TagItError | undefined {
  const entry = Object.entries(REGISTRY_ERRORS).find(([, n]) => n === name);
  return entry ? registryError(Number(entry[0])) : undefined;
}

function registryError(code: number): TagItError | undefined {
  const name = REGISTRY_ERRORS[code as keyof typeof REGISTRY_ERRORS];
  return name ? { kind: "registry", code, name } : undefined;
}

function tokenError(code: number, contractId?: string): TagItError {
  const name = TOKEN_ERRORS[code as keyof typeof TOKEN_ERRORS] ?? "Unknown";
  return { kind: "token", code, name, contractId };
}

/** Decodes a Soroban HostError string, e.g. a failed simulation's `error`. */
export function decodeHostError(message: string, registryId: string): TagItError {
  // The log is newest first, so the highest index is where the error began.
  let origin: { index: number; contractId: string; code: number } | undefined;
  for (const [, index, contractId, code] of message.matchAll(DIAGNOSTIC_ERROR)) {
    const i = Number(index);
    if (!origin || i > origin.index) {
      origin = { index: i, contractId, code: Number(code) };
    }
  }
  if (origin) {
    if (origin.contractId === registryId) {
      return registryError(origin.code) ?? { kind: "unknown", message };
    }
    return tokenError(origin.code, origin.contractId);
  }

  if (AUTH_ERROR.test(message)) return { kind: "auth" };

  // No diagnostics (e.g. a result after submission): assume it's ours.
  const bare = CONTRACT_ERROR.exec(message);
  if (bare) return registryError(Number(bare[1])) ?? tokenError(Number(bare[1]));

  return { kind: "unknown", message };
}

/** Normalises anything thrown by the SDK, RPC or wallet kit. */
export function toTagItError(e: unknown, registryId: string): TagItError {
  if (e && typeof e === "object" && "kind" in e) return e as TagItError;

  // Wallet kit errors are `{ code, message }`; -4 is a user rejection.
  const code = e && typeof e === "object" && "code" in e ? (e as { code: unknown }).code : undefined;
  const message =
    typeof e === "string"
      ? e
      : e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : String(e);

  if (code === -4 || (!message.includes("HostError") && WALLET_REJECTION.test(message))) {
    return { kind: "wallet-rejected" };
  }
  return decodeHostError(message, registryId);
}

export type ErrorContext = { tag?: string; asset?: AssetCode };

export function describeError(err: TagItError, ctx: ErrorContext = {}): string {
  const who = ctx.tag ? `@${ctx.tag}` : "This tag";
  const asset = ctx.asset ?? "that asset";

  switch (err.kind) {
    case "wallet-rejected":
      return "You cancelled in your wallet. Nothing was sent.";
    case "pending":
      return "Submitted, but not confirmed yet. Check the transaction before trying again.";
    case "auth":
      return "Your wallet didn't authorise this. Only the tag's owner can do that.";
    case "unknown":
      return "Something went wrong talking to Stellar. Nothing was sent; try again.";
    case "token":
      switch (err.name) {
        case "Balance":
          return `You don't have enough ${asset} for this.`;
        case "TrustlineMissing":
          return `${who} can't receive ${asset} yet. Send XLM or ask them to add ${asset}.`;
        case "AccountMissing":
          return `${who}'s wallet isn't active yet.`;
        case "BalanceDeauthorized":
          return `${asset} is frozen for one of these accounts.`;
        default:
          return `The ${asset} contract refused this payment (${err.name}).`;
      }
    case "registry":
      switch (err.name) {
        case "InvalidTag":
          return "Tags are 3–20 characters: a–z, 0–9 and _.";
        case "TagTaken":
          return `${who} is already taken.`;
        case "NotFound":
          return ctx.tag ? `No one has claimed ${who} yet.` : "That tag doesn't exist.";
        case "AlreadyHasTag":
          return "This wallet already has a tag. Release it in Settings to claim another.";
        case "RecipientChanged":
          return `${who} just changed their wallet. Review the new address before sending.`;
        case "TokenNotAllowed":
          return `TagIt doesn't support ${asset}.`;
        case "InvalidAmount":
          return "Enter an amount above zero.";
        case "SelfPayment":
          return "That's your own tag.";
        case "InvalidWallet":
          return "That address can't receive payments.";
      }
  }
}
