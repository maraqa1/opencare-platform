import { PageFrame } from "@/components/page-frame";
import { RevenueCycleDashboardLink } from "@/components/RevenueCycleDashboardLink";
import { RevenueCycleConsole } from "@/components/RevenueCycleConsole";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { revenueCycleTabs } from "@/lib/use-cases";

export default function RevenueCycleExecutiveNarrativePage() {
  return (
    <PageFrame
      eyebrow="Revenue Cycle Management"
      title="Executive Narrative"
      description="A CFO-readable explanation of cash impact, drivers, actions, owners, and immediate next steps."
    >
      <UseCaseWorkspace
        activeTab="executive-narrative"
        title="Revenue Cycle Management"
        description="An executive operating narrative grounded in live opportunities, payer breaches, and accountable recovery work."
        trustItems={["Narrative: backend-generated", "Cash impact: live only", "No hardcoded financial values"]}
        tabs={revenueCycleTabs}
        headerActions={<RevenueCycleDashboardLink />}
      >
        <RevenueCycleConsole view="executive-narrative" />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
