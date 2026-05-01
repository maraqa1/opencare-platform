import { PageFrame } from "@/components/page-frame";
import { RevenueCycleDashboardLink } from "@/components/RevenueCycleDashboardLink";
import { RevenueCycleConsole } from "@/components/RevenueCycleConsole";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { revenueCycleTabs } from "@/lib/use-cases";

export default function RevenueCyclePayerControlPage() {
  return (
    <PageFrame
      eyebrow="Revenue Cycle Management"
      title="Payer Control"
      description="Contract compliance, underpayment exposure, and payment delay accountability by payer."
    >
      <UseCaseWorkspace
        activeTab="payer-control"
        title="Revenue Cycle Management"
        description="Payer performance tied to cash timing, underpayment recovery, and contract enforcement."
        trustItems={["Contracts: monitored", "Underpayments: quantified", "SLA breaches: visible"]}
        tabs={revenueCycleTabs}
        headerActions={<RevenueCycleDashboardLink />}
      >
        <RevenueCycleConsole view="payer-control" />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
