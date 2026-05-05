import type { Metadata } from "next";
import { DictionaryView } from "@/components/DictionaryView";
import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Dictionary - OpenCare Portal",
};

export default function DictionaryPage() {
  return (
    <PageFrame
      title="Dictionary"
      description="Metric definitions, sensitivity classification, approved uses, ownership, and lineage evidence for the active use case."
      chips={[
        { label: "NDMO-labelled metrics", tone: "primary" },
        { label: "Clickable drill-down", tone: "accent" },
      ]}
    >
      <DictionaryView useCase="bed_pressure" />
    </PageFrame>
  );
}
