import type { Metadata } from "next";

import { DataAiDiagnosticWorkspace } from "./workspace-client";

export const metadata: Metadata = {
  title: "Data & AI Capability Diagnostic - OpenCare Portal",
};

export default function DataAiCapabilityDiagnosticPage() {
  return <DataAiDiagnosticWorkspace />;
}
