import { PageFrame } from "@/components/page-frame";
import { RevenueCycleConsole } from "@/components/RevenueCycleConsole";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { revenueCycleTabs } from "@/lib/use-cases";

export default function RevenueCycleRecoveryQueuePage() {
  return (
    <PageFrame
      eyebrow="Revenue Cycle Management"
      title="Recovery Queue"
      description="The ranked operating queue for revenue recovery actions, prioritized by expected cash recovery and execution effort."
    >
      <UseCaseWorkspace
        activeTab="recovery-queue"
        title="Revenue Cycle Management"
        description="Ranked recovery actions with clear owners, due dates, and expected cash impact."
        trustItems={["Queue: priority-scored", "Ownership: team and named owner", "Outcome loop: expected vs actual recovery"]}
        tabs={revenueCycleTabs}
      >
        <RevenueCycleConsole view="recovery-queue" />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
