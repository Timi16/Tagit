// Mirrors contracts/tagit-registry/src/tag.rs. The contract is the authority;
// this only exists so the UI can answer instantly and explain why.

export const TAG_MIN = 3;
export const TAG_MAX = 20;
export const TAG_PATTERN = /^[a-z0-9_]{3,20}$/;

export type TagProblem = "empty" | "too-short" | "too-long" | "bad-chars";

export type ParsedTag = { ok: true; tag: string } | { ok: false; problem: TagProblem };

/** What the user typed → what the contract stores: trimmed, no `@`, lowercase. */
export function normalizeTag(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

export function parseTag(input: string): ParsedTag {
  const tag = normalizeTag(input);
  if (tag.length === 0) return { ok: false, problem: "empty" };
  if (!/^[a-z0-9_]*$/.test(tag)) return { ok: false, problem: "bad-chars" };
  if (tag.length < TAG_MIN) return { ok: false, problem: "too-short" };
  if (tag.length > TAG_MAX) return { ok: false, problem: "too-long" };
  return { ok: true, tag };
}

export const TAG_PROBLEM_MESSAGES: Record<TagProblem, string> = {
  empty: "Type a tag, like @david.",
  "too-short": `Tags are at least ${TAG_MIN} characters.`,
  "too-long": `Tags are at most ${TAG_MAX} characters.`,
  "bad-chars": "Tags use only a–z, 0–9 and _.",
};

/**
 * Valid on chain, but `/<tag>` is one of the app's own pages, so its profile
 * link would never open. The claim screen won't offer these.
 */
export const RESERVED_TAGS = new Set([
  "app",
  "send",
  "claim",
  "receive",
  "history",
  "tag",
  "activity",
  "settings",
  "_next",
  "api",
]);

export function isReservedTag(tag: string): boolean {
  return RESERVED_TAGS.has(tag);
}

/** decodeURIComponent that treats a malformed URL as junk input instead of throwing. */
export function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function formatTag(tag: string): string {
  return `@${tag}`;
}
