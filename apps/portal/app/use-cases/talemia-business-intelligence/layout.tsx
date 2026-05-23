import type { ReactNode } from "react";

import { UseCaseEnabledLayout } from "@/lib/use-case-gates";

export default async function TalemiaBusinessIntelligenceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <UseCaseEnabledLayout useCaseId="talemia_business_intelligence">
      {children}
    </UseCaseEnabledLayout>
  );
}
