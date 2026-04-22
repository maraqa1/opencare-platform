import { DecisionCards } from "@/components/DecisionCards";
import { PageFrame } from "@/components/page-frame";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { decisionQueue, resolvedDecisions } from "@/lib/use-cases";

export default function BedPressureDecisionsPage() {
  return (
    <PageFrame
      eyebrow="Decision Layer"
      title="Decisions"
      description="The full chain from data to signal to decision to action to outcome."
    >
      <UseCaseWorkspace activeTab="decisions">
        <section className="panel pressure-strip">
          <div>
            <p className="eyebrow">Active Decisions ({decisionQueue.length})</p>
            <h3>Prioritized by urgency</h3>
            <p className="section-subtitle">Most critical action first. Every alert has an action, or it is not an alert.</p>
          </div>
          <div className="trust-line">
            <span>Rules from use_cases.yaml</span>
            <span>42/42 tests</span>
          </div>
        </section>

        <DecisionCards decisions={decisionQueue} resolved={resolvedDecisions} />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
