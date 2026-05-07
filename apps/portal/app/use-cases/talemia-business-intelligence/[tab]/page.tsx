import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getTalemiaTabConfig,
  TalemiaWorkspace,
  type TalemiaTabKey,
} from "@/components/talemia/TalemiaWorkspace";

type PageProps = {
  params: Promise<{ tab: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const validTabs = new Set([
  "overview",
  "executive",
  "financial",
  "business-lines",
  "account-managers",
  "commercial",
  "opportunities",
]);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tab } = await params;
  const config = getTalemiaTabConfig(tab);
  return {
    title: `${config.title} - OpenCare Portal`,
  };
}

export default async function TalemiaWorkspaceTabPage({ params, searchParams }: PageProps) {
  const { tab } = await params;
  if (!validTabs.has(tab)) {
    notFound();
  }

  return <TalemiaWorkspace activeKey={tab as TalemiaTabKey} searchParams={(await searchParams) ?? {}} />;
}
