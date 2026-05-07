import type { Metadata } from "next";

import { TalemiaWorkspace } from "@/components/talemia/TalemiaWorkspace";

export const metadata: Metadata = {
  title: "TALEMIA Business Intelligence - OpenCare Portal",
};

export default function TalemiaWorkspaceIndexPage() {
  return <TalemiaWorkspace activeKey="overview" />;
}
