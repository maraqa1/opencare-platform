import { DictionaryView } from "@/components/DictionaryView";
import { GovernanceView } from "@/components/GovernanceView";
import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";

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
          <DictionaryView useCase="bed_pressure" />
        </article>

        <article className="panel">
          <p className="eyebrow">Sections 2, 4, 5, 6, 7</p>
          <h3 className="section-heading">Lineage, freshness, impact, quality, compliance</h3>
          <GovernanceView />
        </article>

        <article className="panel">
          <p className="eyebrow">Section 3</p>
          <h3 className="section-heading">Record Specifications</h3>
          <RecordSpecification table="analytics.fct_bed_occupancy" />
          <RecordSpecification table="output.forecast" />
          <RecordSpecification table="output.anomaly" />
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
