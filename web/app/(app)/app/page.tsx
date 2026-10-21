import type { Metadata } from "next";

import { RequireWallet } from "@/components/welcome";

import { Home } from "./home";

export const metadata: Metadata = { title: "TagIt" };

export default function Page() {
  return (
    <RequireWallet>
      <Home />
    </RequireWallet>
  );
}
