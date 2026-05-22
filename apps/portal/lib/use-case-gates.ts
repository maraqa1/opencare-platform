import type { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getApiJson } from "@/lib/api";

type UseCaseManifestEntry = {
  enabled?: boolean;
};

export async function assertUseCaseEnabled(useCaseId: string) {
  const config = await getApiJson<{
    all_use_cases?: Record<string, UseCaseManifestEntry>;
  }>({
    path: "/api/v1/config/use-cases",
    fallback: { all_use_cases: {} },
    cacheMode: "no-store",
  });

  const useCase = config.all_use_cases?.[useCaseId];
  if (useCase?.enabled !== true) {
    notFound();
  }
}

export async function UseCaseEnabledLayout({
  useCaseId,
  children,
}: {
  useCaseId: string;
  children: ReactNode;
}) {
  await assertUseCaseEnabled(useCaseId);
  return children;
}
