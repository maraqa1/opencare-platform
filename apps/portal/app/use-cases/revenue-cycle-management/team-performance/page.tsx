import { PageFrame } from "@/components/page-frame";
import { RevenueCycleConsole } from "@/components/RevenueCycleConsole";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { revenueCycleTabs } from "@/lib/use-cases";

export default function RevenueCycleTeamPerformancePage() {
  return (
    <PageFrame
      eyebrow="Revenue Cycle Management"
      title="Team Performance"
      description="Owner-level accountability for assigned work, completed actions, recovered cash, and overdue load."
    >
      <UseCaseWorkspace
        activeTab="team-performance"
        title="Revenue Cycle Management"
        description="Recovery performance measured by output, variance to target, and speed to resolution."
        trustItems={["Owners: visible", "Variance: expected vs actual", "Load: overdue queue tracked"]}
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
        <RevenueCycleConsole view="team-performance" />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
