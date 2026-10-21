import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingScreen } from "@/components/welcome";
import { parseTag, safeDecode } from "@/lib/stellar/tag";

import { PayLink } from "./pay-link";

export async function generateMetadata({ params }: PageProps<"/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  const parsed = parseTag(safeDecode(tag));
  return { title: parsed.ok ? `Pay @${parsed.tag} · TagIt` : "TagIt" };
}

export default function Page({ params }: PageProps<"/[tag]">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PayLink params={params} />
    </Suspense>
  );
}
