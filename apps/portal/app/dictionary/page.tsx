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
      description="Metric definitions, calculation notes, units, and backing datasets for the active use case."
      chips={[
        { label: "Governed terminology", tone: "primary" },
        { label: "Use-case aware", tone: "accent" },
      ]}
    >
      <DictionaryView useCase="bed_pressure" />
    </PageFrame>
  );
}
