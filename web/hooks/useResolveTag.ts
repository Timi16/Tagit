"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { lookupTag, type TagRecord } from "@/lib/stellar/registry";
import type { TagItError } from "@/lib/stellar/errors";
import { parseTag, type TagProblem } from "@/lib/stellar/tag";

export type ResolveState =
  | { status: "idle" }
  | { status: "invalid"; problem: TagProblem }
  | { status: "checking"; tag: string }
  | { status: "not-found"; tag: string }
  | { status: "found"; tag: string; record: TagRecord }
  | { status: "error"; tag: string; error: TagItError };

const DEBOUNCE_MS = 300;
const CACHE_MS = 10_000;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Resolves a tag as the user types: debounced, simulated (free), cached for 10 s. */
export function useResolveTag(input: string): ResolveState {
  const parsed = parseTag(input);
  const tag = parsed.ok ? parsed.tag : null;
  const debouncedTag = useDebounced(tag, DEBOUNCE_MS);

  const query = useQuery({
    queryKey: ["tag", debouncedTag],
    queryFn: () => lookupTag(debouncedTag!),
    enabled: debouncedTag !== null,
    staleTime: CACHE_MS,
  });

  if (input.trim() === "") return { status: "idle" };
  if (!parsed.ok) return { status: "invalid", problem: parsed.problem };
  if (tag !== debouncedTag || query.isPending || !query.data) {
    return { status: "checking", tag: parsed.tag };
  }
  return query.data;
}
