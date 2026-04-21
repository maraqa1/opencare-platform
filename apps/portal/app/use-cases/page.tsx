import Link from "next/link";

import { PageFrame } from "@/components/page-frame";
import { useCases } from "@/lib/use-cases";

export default function UseCasesPage() {
  return (
    <PageFrame
      eyebrow="Use Cases"
      title="A catalogue of operational product modules"
      description="Every card is a self-contained workspace. Enabled use cases open into Overview, Current Status, Predictions, Analysis, and Decisions."
      chips={[
        { label: "Config-driven extensibility", tone: "primary" },
        { label: "Zero portal rebuild for new modules", tone: "accent" },
      ]}
    >
      <section className="use-case-catalogue">
        {useCases.map((useCase) => (
          <article key={useCase.id} className={`catalogue-card ${useCase.status}`}>
            <div className="panel-header">
              <div>
                <span className="use-case-icon">{useCase.icon}</span>
                <h3>{useCase.name}</h3>
                <p>{useCase.description}</p>
              </div>
              <span className={`summary-badge ${useCase.status === "active" ? "normal" : "warning"}`}>
                {useCase.status === "active" ? "Active" : "Coming Soon"}
              </span>
            </div>
            <div className="metric-grid compact">
              {useCase.kpis.map((kpi) => (
                <div className="forecast-stat" key={kpi.label}>
                  <p className="eyebrow">{kpi.label}</p>
                  <strong>{kpi.value}</strong>
                  <p className="section-subtitle">{kpi.note}</p>
                </div>
              ))}
            </div>
            <div className="button-row">
              {useCase.status === "active" ? (
                <Link className="button primary" href={`/use-cases/${useCase.slug}/status`}>
                  Enter Workspace
                </Link>
              ) : (
                <span className="secondary-link disabled">Awaiting data layer</span>
              )}
            </div>
          </article>
        ))}
      </section>
    </PageFrame>
  );
}
