import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { useCases } from "@/lib/use-cases";

const useCaseDetails: Record<string, {
  sourceTables: string[];
  portalPages: string[];
  apiPrefix: string;
  dashboardId: string;
  recordSpecs: string[];
}> = {
  bed_pressure: {
    sourceTables: ["bed_events", "patients", "wards", "departments"],
    portalPages: ["overview", "status", "predictions", "analysis", "decisions"],
    apiPrefix: "/api/v1",
    dashboardId: "bed-occupancy-trends",
    recordSpecs: ["analytics.fct_bed_occupancy", "output.forecast", "output.anomaly"],
  },
  revenue_cycle_management: {
    sourceTables: ["claims", "financial_postings", "denials", "payer_contracts", "encounters", "referrals"],
    portalPages: ["cash-command", "recovery-queue", "payer-control", "revenue-leakage", "team-performance", "executive-narrative"],
    apiPrefix: "/api/v1/revenue-cycle",
    dashboardId: "revenue-cycle-management",
    recordSpecs: [
      "analytics.fct_cash_recovery_opportunity",
      "analytics.fct_cash_forecast",
      "analytics.fct_payer_contract_performance",
      "analytics.fct_team_recovery_performance",
      "analytics.fct_revenue_cycle",
      "analytics.fct_financial_posting",
      "analytics.fct_claim_aging",
      "analytics.fct_denials",
      "analytics.fct_revenue_leakage",
      "analytics.fct_payer_performance",
      "analytics.fct_patient_acquisition",
    ],
  },
};

export const metadata: Metadata = {
  title: "Configuration - OpenCare Portal",
};

export default function AdminConfigurationPage() {
  return (
    <PageFrame
      eyebrow="Administration"
      title="Configuration"
      description="Current use case settings, thresholds, alert rules, and enablement state."
    >
      <section className="grid">
        <article className="panel span-6">
          <p className="eyebrow">Use Case Configuration</p>
          <h3 className="section-heading">use_cases.yaml projection</h3>
          <div className="compact-feed">
            {useCases.map((useCase) => (
              <div className="compact-alert" key={useCase.id}>
                <span className={`status-dot ${useCase.status === "active" ? "live" : "stale"}`} />
                <div>
                  <strong>{useCase.id}</strong>
                  <p>{useCase.status === "active" ? "enabled: true" : "enabled: false"} | {useCase.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel span-6">
          <p className="eyebrow">Thresholds and Rules</p>
          <table className="table">
            <tbody>
              <tr>
                <th>Critical occupancy</th>
                <td>90%</td>
              </tr>
              <tr>
                <th>Warning occupancy</th>
                <td>75%</td>
              </tr>
              <tr>
                <th>Forecast horizon</th>
                <td>7 days</td>
              </tr>
              <tr>
                <th>Decision priority</th>
                <td>Severity, breach window, confidence</td>
              </tr>
            </tbody>
          </table>
        </article>
        <article className="panel span-12">
          <p className="eyebrow">Use Case Metadata</p>
          <h3 className="section-heading">Operational and governance hooks</h3>
          <div className="compact-feed">
            {useCases
              .filter((useCase) => useCaseDetails[useCase.id])
              .map((useCase) => {
                const details = useCaseDetails[useCase.id];
                return (
                  <div className="panel" key={`${useCase.id}-metadata`}>
                    <p className="eyebrow">{useCase.name}</p>
                    <h4>{useCase.id}</h4>
                    <table className="table">
                      <tbody>
                        <tr>
                          <th>API prefix</th>
                          <td><code>{details.apiPrefix}</code></td>
                        </tr>
                        <tr>
                          <th>Superset dashboard</th>
                          <td><code>{details.dashboardId}</code></td>
                        </tr>
                        <tr>
                          <th>Source tables</th>
                          <td>{details.sourceTables.join(", ")}</td>
                        </tr>
                        <tr>
                          <th>Portal pages</th>
                          <td>{details.portalPages.join(", ")}</td>
                        </tr>
                        <tr>
                          <th>Record specs</th>
                          <td>{details.recordSpecs.length} configured tables</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
          </div>
        </article>
      </section>
    </PageFrame>
  );
}
