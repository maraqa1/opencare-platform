import { DictionaryView } from "@/components/DictionaryView";
import { PageFrame } from "@/components/page-frame";

export default function DictionaryPage() {
  return (
    <PageFrame
      title="Dictionary"
      description="Metric definitions, calculation notes, units, and source tables for the active use case."
      chips={[
        { label: "Governed terminology", tone: "primary" },
        { label: "Use-case aware", tone: "accent" },
      ]}
    >
      <DictionaryView useCase="bed_pressure" />
    </PageFrame>
  );
}
