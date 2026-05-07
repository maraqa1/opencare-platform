import type { Metadata } from "next";

import { TalemiaWorkspace } from "@/components/talemia/TalemiaWorkspace";

export const metadata: Metadata = {
  title: "TALEMIA Business Intelligence - OpenCare Portal",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TalemiaWorkspaceIndexPage({ searchParams }: PageProps) {
  return <TalemiaWorkspace activeKey="overview" searchParams={(await searchParams) ?? {}} />;
}
