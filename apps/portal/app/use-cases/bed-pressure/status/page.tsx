import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { BedPressureStatusWorkspaceClient } from "./status-workspace-client";

export const metadata: Metadata = {
  title: "Bed Pressure Status - OpenCare Portal",
};

export default function BedPressureStatusPage() {
  return (
    <PageFrame
      eyebrow="Operational Landing Page"
      title="Current Status"
      description="The bed manager command console: worst-first pressure, active alerts, and lightweight trust cues on every number."
    >
      <BedPressureStatusWorkspaceClient />
    </PageFrame>
  );
}
