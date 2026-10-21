import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingScreen, RequireWallet } from "@/components/welcome";

import { SendFlow } from "./flow";

export const metadata: Metadata = { title: "Send · TagIt" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RequireWallet>
        <SendFlow />
      </RequireWallet>
    </Suspense>
  );
}
