import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getTalemiaTabConfig,
  TalemiaWorkspace,
  type TalemiaTabKey,
} from "@/components/talemia/TalemiaWorkspace";

type PageProps = {
  params: Promise<{ tab: string }>;
};

const validTabs = new Set([
  "overview",
  "executive",
  "financial",
  "business-lines",
  "account-managers",
  "commercial",
  "opportunities",
  "governance",
  "data-contract",
]);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tab } = await params;
  const config = getTalemiaTabConfig(tab);
  return {
    title: `${config.title} - OpenCare Portal`,
  };
}

export default async function TalemiaWorkspaceTabPage({ params }: PageProps) {
  const { tab } = await params;
  if (!validTabs.has(tab)) {
    notFound();
  }

  return <TalemiaWorkspace activeKey={tab as TalemiaTabKey} />;
}
