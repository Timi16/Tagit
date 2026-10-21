import type { Metadata } from "next";

import { RequireWallet } from "@/components/welcome";

import { History } from "./history";

export const metadata: Metadata = { title: "History · TagIt" };

export default function Page() {
  return (
    <RequireWallet>
      <History />
    </RequireWallet>
  );
}
