import type { ReactNode } from "react";

import { UseCaseEnabledLayout } from "@/lib/use-case-gates";

export default async function RevenueCycleManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <UseCaseEnabledLayout useCaseId="revenue_cycle_management">
      {children}
    </UseCaseEnabledLayout>
  );
}
