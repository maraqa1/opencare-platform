import { PageFrame } from "@/components/page-frame";
import { RevenueCycleConsole } from "@/components/RevenueCycleConsole";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { revenueCycleTabs } from "@/lib/use-cases";

export default function RevenueCycleCashCommandPage() {
  return (
    <PageFrame
      eyebrow="Revenue Cycle Management"
      title="Cash Command"
      description="The CFO landing page for real-time cash control, recovery execution, and revenue accountability."
    >
      <UseCaseWorkspace
        activeTab="cash-command"
        title="Revenue Cycle Management"
        description="A hospital revenue operating system focused on recoverable cash, payer accountability, owner-led execution, and expected versus actual recovery."
        trustItems={["Financial truth: ERP postings", "Execution: owner-level recovery queue", "Narrative: CFO-ready operating view"]}
        tabs={revenueCycleTabs}
      >
        <RevenueCycleConsole view="cash-command" />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
