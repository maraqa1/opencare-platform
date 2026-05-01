import { DictionaryView } from "@/components/DictionaryView";
import { GovernanceView } from "@/components/GovernanceView";
import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";

const governanceUseCases = [
  {
    id: "bed_pressure",
    name: "Bed Pressure Intelligence",
    description: "Occupancy, forecasting, anomaly detection, and discharge decision metadata.",
    recordSpecs: [
      "analytics.fct_bed_occupancy",
      "output.forecast",
      "output.anomaly",
    ],
  },
  {
    id: "revenue_cycle_management",
    name: "Revenue Cycle Management",
    description: "Cash control, recovery execution, payer accountability, and leakage metadata.",
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
];

export default function AdminGovernancePage() {
  return (
    <PageFrame
      eyebrow="Administration"
      title="Governance"
      description="All Phase 4b governance content lives here, with lightweight trust cues still present on operational screens."
      chips={[
        { label: "Dictionary", tone: "primary" },
        { label: "Lineage", tone: "accent" },
        { label: "Record specs", tone: "primary" },
        { label: "Compliance", tone: "accent" },
      ]}
    >
      <section className="governance-stack">
        <article className="panel">
          <p className="eyebrow">Section 1</p>
          <h3 className="section-heading">Data Dictionary and Business Definitions</h3>
          <div className="compact-feed">
            {governanceUseCases.map((useCase) => (
              <div className="panel" key={useCase.id}>
                <p className="eyebrow">{useCase.name}</p>
                <p className="section-subtitle">{useCase.description}</p>
                <DictionaryView useCase={useCase.id} recordSpecBaseHref="/admin/governance" />
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Sections 2, 4, 5, 6, 7</p>
          <h3 className="section-heading">Lineage, freshness, impact, quality, compliance</h3>
          <GovernanceView />
        </article>

        <article className="panel">
          <p className="eyebrow">Section 3</p>
          <h3 className="section-heading">Record Specifications</h3>
          <div className="compact-feed">
            {governanceUseCases.map((useCase) => (
              <div key={useCase.id}>
                <p className="eyebrow">{useCase.name}</p>
                <p className="section-subtitle">{useCase.description}</p>
                {useCase.recordSpecs.map((table) => (
                  <RecordSpecification
                    key={table}
                    table={table}
                    lineageHref="/admin/governance"
                    dictionaryHref="/admin/governance"
                  />
                ))}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Section 8</p>
          <h3 className="section-heading">Audit Trail Summary</h3>
          <div className="compact-feed">
            {[
              ["2026-04-21 09:15", "bed_manager", "/occupancy", "12 wards"],
              ["2026-04-21 09:14", "admin", "/lineage", "3 models"],
              ["2026-04-21 09:10", "bed_manager", "/forecast", "ICU-01"],
            ].map(([time, user, route, scope]) => (
              <div className="compact-alert" key={`${time}-${route}`}>
                <span className="status-dot live" />
                <div>
                  <strong>{time} | {user}</strong>
                  <p>{route} | {scope}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageFrame>
  );
}
