import type { Metadata } from "next";

import { RequireWallet } from "@/components/welcome";

import { Receive } from "./receive";

export const metadata: Metadata = { title: "Receive · TagIt" };

export default function Page() {
  return (
    <RequireWallet>
      <Receive />
    </RequireWallet>
  );
}
