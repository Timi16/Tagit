import { Suspense } from "react";

import { AppShell } from "@/components/shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="gate" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
