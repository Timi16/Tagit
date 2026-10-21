import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingScreen, RequireWallet } from "@/components/welcome";

import { Claim } from "./claim";

export const metadata: Metadata = { title: "Claim your tag · TagIt" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RequireWallet>
        <Claim />
      </RequireWallet>
    </Suspense>
  );
}
