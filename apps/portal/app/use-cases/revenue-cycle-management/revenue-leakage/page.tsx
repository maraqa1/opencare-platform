import { PageFrame } from "@/components/page-frame";
import { RevenueCycleConsole } from "@/components/RevenueCycleConsole";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { revenueCycleTabs } from "@/lib/use-cases";

export default function RevenueCycleLeakagePage() {
  return (
    <PageFrame
      eyebrow="Revenue Cycle Management"
      title="Leakage"
      description="Leakage decomposition across unbilled encounters, denials, underpayments, writeoffs, and missed authorization."
    >
      <UseCaseWorkspace
        activeTab="revenue-leakage"
        title="Revenue Cycle Management"
        description="Leakage surfaced as a cash problem with named categories, not a retrospective finance report."
        trustItems={["Leakage: decomposed", "Cash impact: explicit", "Actionability: owner-ready"]}
        tabs={revenueCycleTabs}
      >
        <RevenueCycleConsole view="revenue-leakage" />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
