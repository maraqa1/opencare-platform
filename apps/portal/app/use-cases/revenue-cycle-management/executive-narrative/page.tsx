import { PageFrame } from "@/components/page-frame";
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
        headerActions={
          <a
            className="secondary-link"
            href="https://analytics.opencare.opendatalake.com/superset/dashboard/revenue-cycle-management/"
            target="_blank"
            rel="noreferrer"
          >
            Open Executive Dashboard
          </a>
        }
      >
        <RevenueCycleConsole view="executive-narrative" />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
