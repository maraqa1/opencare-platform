import type { Metadata } from "next";
import { DecisionCards } from "@/components/DecisionCards";
import { PageFrame } from "@/components/page-frame";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";

export const metadata: Metadata = {
  title: "Bed Pressure Decisions - OpenCare Portal",
};

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
            <p className="eyebrow">Active Decisions</p>
            <h3>Prioritized by urgency and impact</h3>
            <p className="section-subtitle">
              Decisions are generated, stored, assigned, tracked, measured, and audited.
            </p>
          </div>
          <div className="trust-line">
            <span>Decision rules executed in backend service</span>
            <span>Audit: decision_log</span>
            <span>Impact: measured after 24h observation window</span>
          </div>
        </section>

        <DecisionCards />
      </UseCaseWorkspace>
    </PageFrame>
  );
}
