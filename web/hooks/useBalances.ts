"use client";

import { useQuery } from "@tanstack/react-query";

import { getAccountInfo } from "@/lib/stellar/horizon";

export const accountKey = (address: string | null) => ["account", address] as const;

/** Existence, balances and trustlines from Horizon. */
export function useBalances(address: string | null) {
  return useQuery({
    queryKey: accountKey(address),
    enabled: !!address,
    staleTime: 10_000,
    queryFn: () => getAccountInfo(address!),
  });
}
