import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingScreen } from "@/components/welcome";
import { parseTag, safeDecode } from "@/lib/stellar/tag";

import { PayLink } from "./pay-link";

export async function generateMetadata({ params }: PageProps<"/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  const parsed = parseTag(safeDecode(tag));
  if (!parsed.ok) return { title: "TagIt" };
  const title = `Pay @${parsed.tag} on TagIt`;
  const description = `Send XLM or USDC to @${parsed.tag} by name. You see their full Stellar wallet before you pay.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default function Page({ params }: PageProps<"/[tag]">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PayLink params={params} />
    </Suspense>
  );
}
