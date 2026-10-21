"use client";

import { useQuery } from "@tanstack/react-query";

import { getPaymentHistory, ONE_DAY, type PaymentEvent } from "@/lib/stellar/history";
import { tagOf } from "@/lib/stellar/registry";

export type HistoryItem = PaymentEvent & {
  counterparty: string;
  /** The other side's tag: the tag paid, or the sender's own tag if they have one. */
  counterpartyTag: string | null;
};

export const historyKey = (address: string | null) => ["history", address] as const;

async function withTags(events: PaymentEvent[]): Promise<HistoryItem[]> {
  const senders = [...new Set(events.filter((e) => e.direction === "received").map((e) => e.from))];
  const tags = new Map<string, string | null>();
  await Promise.all(
    senders.map(async (s) => {
      const res = await tagOf(s);
      tags.set(s, res.ok ? res.value : null);
    }),
  );
  return events.map((e) =>
    e.direction === "sent"
      ? { ...e, counterparty: e.to, counterpartyTag: e.tag }
      : { ...e, counterparty: e.from, counterpartyTag: tags.get(e.from) ?? null },
  );
}

/**
 * Sent and received payments, with addresses turned back into @tags. The last
 * day arrives first (one quick request) so lists show at once; the full
 * 7-day window replaces it when it lands.
 */
export function useHistory(address: string | null) {
  const full = useQuery({
    queryKey: historyKey(address),
    enabled: !!address,
    staleTime: 15_000,
    queryFn: async () => withTags(await getPaymentHistory(address!)),
  });
  const quick = useQuery({
    queryKey: [...historyKey(address), "recent"],
    enabled: !!address && !full.data,
    staleTime: 15_000,
    queryFn: async () => withTags(await getPaymentHistory(address!, ONE_DAY)),
  });
  // A quick answer with nothing in it says little about the week: keep waiting for the full one.
  const early = quick.data && quick.data.length > 0 ? quick.data : undefined;
  const data = full.data ?? early;
  return {
    ...full,
    data,
    isPending: data === undefined && !full.isError,
    /** True while only the last day is shown. */
    partial: !full.data && !!early,
  };
}
