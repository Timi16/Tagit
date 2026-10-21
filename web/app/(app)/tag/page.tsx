import type { Metadata } from "next";

import { RequireWallet } from "@/components/welcome";

import { ManageTag } from "./manage";

export const metadata: Metadata = { title: "My tag · TagIt" };

export default function Page() {
  return (
    <RequireWallet>
      <ManageTag />
    </RequireWallet>
  );
}
