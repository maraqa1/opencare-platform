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

        <section className="decision-stack">
          {decisionQueue.map((decision, index) => (
            <article className={`decision-card ${decision.tone}`} key={decision.title}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Decision {index + 1}</p>
                  <h3>{decision.ward}: {decision.title}</h3>
                </div>
                <span className={`summary-badge ${decision.tone === "critical" ? "critical" : "warning"}`}>
                  {decision.urgency}
                </span>
              </div>
              <div className="decision-grid">
                <div>
                  <p className="eyebrow">Signal</p>
                  <p>{decision.signal}</p>
                </div>
                <div>
                  <p className="eyebrow">Decision</p>
                  <p>{decision.decision}</p>
                </div>
                <div>
                  <p className="eyebrow">Rationale</p>
                  <p>{decision.rationale}</p>
                </div>
                <div>
                  <p className="eyebrow">Confidence</p>
                  <p className="mono">{decision.confidence}</p>
                </div>
              </div>
              <div className="action-list">
                {decision.actions.map((action) => (
                  <label className="action-check" key={action}>
                    <input type="checkbox" />
                    <span>{action}</span>
                  </label>
                ))}
              </div>
              <div className="button-row">
                <button className="button primary" type="button">Execute All</button>
                <button className="secondary-link" type="button">Mark In Progress</button>
                <button className="secondary-link" type="button">Dismiss with Reason</button>
              </div>
            </article>
          ))}
        </section>

        <section className="panel">
          <p className="eyebrow">Resolved - Last 7 Days</p>
          <div className="compact-feed">
            {resolvedDecisions.map((decision) => (
              <div className="compact-alert" key={decision.title}>
                <span className="status-dot live" />
                <div>
                  <strong>{decision.title} ({decision.date})</strong>
                  <p>Outcome: {decision.outcome}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </UseCaseWorkspace>
    </PageFrame>
  );
}
