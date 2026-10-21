"use client";

import { useQuery } from "@tanstack/react-query";

import { lookupTag, tagOf, type TagRecord } from "@/lib/stellar/registry";

export type MyTag = { tag: string; record: TagRecord } | null;

export const myTagKey = (address: string | null) => ["my-tag", address] as const;

/** The connected wallet's own tag and record, or null if it has none. */
export function useMyTag(address: string | null) {
  return useQuery({
    queryKey: myTagKey(address),
    enabled: !!address,
    staleTime: 15_000,
    queryFn: async (): Promise<MyTag> => {
      const owned = await tagOf(address!);
      if (!owned.ok) throw owned.error;
      if (!owned.value) return null;
      const lookup = await lookupTag(owned.value);
      if (lookup.status === "found") return { tag: lookup.tag, record: lookup.record };
      if (lookup.status === "error") throw lookup.error;
      return null;
    },
  });
}
