import type { ReactNode } from "react";

import { UseCaseEnabledLayout } from "@/lib/use-case-gates";

export default async function BedPressureLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <UseCaseEnabledLayout useCaseId="bed_pressure">{children}</UseCaseEnabledLayout>;
}
