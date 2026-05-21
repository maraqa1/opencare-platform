import type { Metadata } from "next";

import { DictionaryView } from "@/components/DictionaryView";
import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Dictionary Management - OpenCare Portal",
};

export default function DictionaryManagementPage() {
  return (
    <PageFrame
      eyebrow="Governance Admin"
      title="Metric management"
      description="Manage metric definitions, classification, ownership, workflow status, and approved use cases."
      chips={[
        { label: "Draft -> Review -> Approved", tone: "primary" },
        { label: "NDMO classification", tone: "accent" },
      ]}
    >
      <DictionaryView managementMode useCase="bed_pressure" />
    </PageFrame>
  );
}
