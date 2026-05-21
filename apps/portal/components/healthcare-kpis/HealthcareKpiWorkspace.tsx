"use client";

import { useMemo, useState } from "react";

import { PageFrame } from "@/components/page-frame";
import {
  executiveLenses,
  getGovernanceReadinessScore,
  getHealthcareKpiById,
  getHealthcareKpisByIds,
  getHealthcareKpisForPack,
  healthcareCockpitDashboardPacks,
  healthcareKpiLevels,
  healthcareKpis,
  hospitalIntelligenceDomains,
  predictiveOpportunityRadar,
  type HealthcareKpi,
} from "@/lib/healthcare-kpis";

const readinessFields: Array<{
  key: keyof HealthcareKpi;
  label: string;
}> = [
  { key: "owner", label: "Owner" },
  { key: "department", label: "Department" },
  { key: "formula", label: "Formula" },
  { key: "source", label: "Source" },
  { key: "refresh", label: "Refresh" },
  { key: "target", label: "Target" },
  { key: "definition", label: "Definition" },
];

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function categoryTone(category: string) {
  if (category === "Real-Time") return "live";
  if (category === "Leading" || category === "Predictive") return "forward";
  if (category === "Lagging") return "lagging";
  return "neutral";
}

function fieldCoverage(field: keyof HealthcareKpi) {
  return Math.round((healthcareKpis.filter((kpi) => Boolean(kpi[field])).length / healthcareKpis.length) * 100);
}

function KpiDetailDrawer({
  kpi,
  onClose,
}: {
  kpi: HealthcareKpi | null;
  onClose: () => void;
}) {
  if (!kpi) return null;

  return (
    <div className="healthcare-detail-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="healthcare-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${kpi.name} details`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="healthcare-detail-head">
          <div>
            <p className="eyebrow">{kpi.level} | {kpi.type}</p>
            <h2>{kpi.name}</h2>
            <p className="healthcare-arabic-name">{kpi.arabicName}</p>
          </div>
          <button className="journey-close" type="button" onClick={onClose} aria-label="Close KPI detail">
            ×
          </button>
        </div>

        <div className="healthcare-detail-grid">
          <div>
            <span>Owner</span>
            <strong>{kpi.owner}</strong>
          </div>
          <div>
            <span>Department</span>
            <strong>{kpi.department}</strong>
          </div>
          <div>
            <span>Refresh</span>
            <strong>{kpi.refresh}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{kpi.target || "TBD"}</strong>
          </div>
        </div>

        <section>
          <p className="eyebrow">Definition</p>
          <p>{kpi.definition}</p>
        </section>
        <section>
          <p className="eyebrow">Strategic Purpose</p>
          <p>{kpi.purpose}</p>
        </section>
        <section>
          <p className="eyebrow">Formula and Source</p>
          <dl className="healthcare-detail-list">
            <div>
              <dt>Formula</dt>
              <dd>{kpi.formula}</dd>
            </div>
            <div>
              <dt>Source system</dt>
              <dd>{kpi.source}</dd>
            </div>
            <div>
              <dt>Family / Group</dt>
              <dd>{kpi.family}</dd>
            </div>
          </dl>
        </section>
        <section className="healthcare-ai-note">
          <span>Predictive Opportunity</span>
          <strong>{kpi.aiOpportunity || "No AI opportunity specified."}</strong>
          <p>Opportunity requires source validation, governance review, and executive acceptance criteria before operational use.</p>
        </section>
      </aside>
    </div>
  );
}

export function HealthcareKpiWorkspace() {
  const [selectedLensId, setSelectedLensId] = useState(executiveLenses[0].id);
  const [selectedKpi, setSelectedKpi] = useState<HealthcareKpi | null>(null);
  const selectedLens = executiveLenses.find((lens) => lens.id === selectedLensId) ?? executiveLenses[0];
  const selectedLensKpis = getHealthcareKpisByIds(selectedLens.kpiIds);
  const readinessScore = getGovernanceReadinessScore(healthcareKpis);
  const realTimeCount = healthcareKpis.filter((kpi) => kpi.category === "Real-Time").length;
  const predictiveCount = healthcareKpis.filter((kpi) => Boolean(kpi.aiOpportunity)).length;
  const sourceSystemCount = uniqueCount(healthcareKpis.map((kpi) => kpi.source));

  const featuredKpis = useMemo(() => {
    return [
      ...selectedLensKpis,
      ...predictiveOpportunityRadar.map((item) => getHealthcareKpiById(item.kpiId)).filter((kpi): kpi is HealthcareKpi => Boolean(kpi)),
    ].filter((kpi, index, list) => list.findIndex((item) => item.id === kpi.id) === index).slice(0, 10);
  }, [selectedLensKpis]);

  return (
    <PageFrame
      pageClassName="healthcare-kpi-page healthcare-cockpit-page"
      eyebrow="Healthcare KPI Intelligence"
      title="Hospital performance intelligence for Hospital Name"
      description="A premium executive cockpit that turns a 70-KPI hospital catalogue into persona-led dashboards, predictive opportunities, and governance-ready performance intelligence."
      chips={[
        { label: "70 governed KPI definitions", tone: "primary" },
        { label: `${healthcareCockpitDashboardPacks.length} dashboard packs`, tone: "accent" },
        { label: `${readinessScore}% metadata readiness`, tone: "primary" },
      ]}
    >
      <section className="healthcare-command-hero">
        <div className="healthcare-command-copy">
          <p className="eyebrow">Pre-Sales Executive Cockpit</p>
          <h2>From KPI catalogue to hospital command intelligence.</h2>
          <p>
            OpenCare organizes Hospital Name’s performance measures by executive question, operating domain, predictive opportunity, and governance readiness. L1-L7 remains available as traceability metadata, not the primary experience.
          </p>
        </div>
        <div className="healthcare-command-metrics">
          <article>
            <span>Catalogue</span>
            <strong>{healthcareKpis.length}</strong>
            <p>Hospital KPIs across strategy, operations, finance, digital, workforce, and research.</p>
          </article>
          <article>
            <span>Real-Time Signals</span>
            <strong>{realTimeCount}</strong>
            <p>Measures suited to operating-room, ED, command-center, and reliability views.</p>
          </article>
          <article>
            <span>AI Candidates</span>
            <strong>{predictiveCount}</strong>
            <p>Predictive ideas captured with guardrails and source-readiness expectations.</p>
          </article>
          <article>
            <span>Source Coverage</span>
            <strong>{sourceSystemCount}</strong>
            <p>Named source-system patterns ready for discovery and governance mapping.</p>
          </article>
        </div>
      </section>

      <section className="healthcare-section">
        <div className="healthcare-section-head">
          <div>
            <p className="eyebrow">Executive Lenses</p>
            <h2 className="section-heading">Start with the executive question</h2>
            <p className="section-subtitle">Persona lenses focus the same KPI catalogue for each hospital leader.</p>
          </div>
        </div>
        <div className="healthcare-lens-grid">
          {executiveLenses.map((lens) => (
            <button
              className={lens.id === selectedLens.id ? "healthcare-lens-card active" : "healthcare-lens-card"}
              key={lens.id}
              type="button"
              onClick={() => setSelectedLensId(lens.id)}
            >
              <span>{lens.role}</span>
              <strong>{lens.title}</strong>
              <p>{lens.boardQuestion}</p>
            </button>
          ))}
        </div>
        <article className="healthcare-lens-detail">
          <div>
            <p className="eyebrow">{selectedLens.title}</p>
            <h3>{selectedLens.mandate}</h3>
            <p>{selectedLens.boardQuestion}</p>
          </div>
          <div className="healthcare-lens-kpis">
            {selectedLensKpis.map((kpi) => (
              <button key={kpi.id} type="button" onClick={() => setSelectedKpi(kpi)}>
                <span>{kpi.category}</span>
                <strong>{kpi.name}</strong>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="healthcare-section">
        <div className="healthcare-section-head">
          <div>
            <p className="eyebrow">Dashboard Packs</p>
            <h2 className="section-heading">Executive-ready dashboard products</h2>
            <p className="section-subtitle">Each pack is framed as a buyer-ready cockpit, not a worksheet tab.</p>
          </div>
        </div>
        <div className="healthcare-pack-grid">
          {healthcareCockpitDashboardPacks.map((pack) => {
            const packKpis = getHealthcareKpisForPack(pack);
            const packReadiness = getGovernanceReadinessScore(packKpis);
            return (
              <article className="healthcare-pack-card" key={pack.id}>
                <div className="healthcare-pack-top">
                  <span>{pack.audience}</span>
                  <strong>{packKpis.length}</strong>
                </div>
                <h3>{pack.title}</h3>
                <p>{pack.operatingQuestion}</p>
                <div className="healthcare-pack-readiness">
                  <span style={{ width: `${packReadiness}%` }} />
                </div>
                <div className="healthcare-pack-meta">
                  <span>{packReadiness}% ready</span>
                  <span>{pack.lensIds.length} lenses</span>
                </div>
                <div className="healthcare-pack-kpis">
                  {getHealthcareKpisByIds(pack.kpiIds).slice(0, 3).map((kpi) => (
                    <button key={kpi.id} type="button" onClick={() => setSelectedKpi(kpi)}>
                      {kpi.name}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="healthcare-section">
        <div className="healthcare-section-head">
          <div>
            <p className="eyebrow">Hospital Intelligence Map</p>
            <h2 className="section-heading">How the cockpit thinks about the hospital</h2>
          </div>
        </div>
        <div className="healthcare-domain-map">
          {hospitalIntelligenceDomains.map((domain, index) => (
            <article className="healthcare-domain-node" key={domain.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{domain.title}</h3>
              <p>{domain.description}</p>
              <strong>{domain.signal}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="healthcare-two-column">
        <article className="healthcare-section">
          <div className="healthcare-section-head">
            <div>
              <p className="eyebrow">Predictive Opportunity Radar</p>
              <h2 className="section-heading">AI candidates with guardrails</h2>
              <p className="section-subtitle">Positioned as opportunities, not production promises.</p>
            </div>
          </div>
          <div className="healthcare-radar-list">
            {predictiveOpportunityRadar.map((item) => {
              const kpi = getHealthcareKpiById(item.kpiId);
              return (
                <button className="healthcare-radar-row" key={item.id} type="button" onClick={() => kpi && setSelectedKpi(kpi)}>
                  <span className={`healthcare-readiness ${item.readiness.toLowerCase()}`}>{item.readiness}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.valueCase}</p>
                    <em>{item.guardrail}</em>
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        <article className="healthcare-section">
          <div className="healthcare-section-head">
            <div>
              <p className="eyebrow">KPI Governance Readiness</p>
              <h2 className="section-heading">{readinessScore}% catalogue metadata readiness</h2>
              <p className="section-subtitle">Readiness is calculated from owner, department, formula, source, refresh, target, and definition coverage.</p>
            </div>
          </div>
          <div className="healthcare-readiness-list">
            {readinessFields.map((field) => {
              const coverage = fieldCoverage(field.key);
              return (
                <div className="healthcare-readiness-row" key={field.key}>
                  <div>
                    <span>{field.label}</span>
                    <strong>{coverage}%</strong>
                  </div>
                  <div className="healthcare-pack-readiness">
                    <span style={{ width: `${coverage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="healthcare-section">
        <div className="healthcare-section-head">
          <div>
            <p className="eyebrow">KPI Catalogue</p>
            <h2 className="section-heading">Featured KPI catalogue preview</h2>
            <p className="section-subtitle">The full 70-KPI catalogue stays available beneath the executive cockpit as evidence and drilldown.</p>
          </div>
          <div className="healthcare-level-badges">
            {healthcareKpiLevels.map((level) => (
              <span key={level.level}>{level.level}</span>
            ))}
          </div>
        </div>
        <div className="healthcare-catalogue-grid">
          {featuredKpis.map((kpi) => (
            <article className="healthcare-catalogue-card" key={kpi.id}>
              <div>
                <span className={`healthcare-category ${categoryTone(kpi.category)}`}>{kpi.category}</span>
                <span className="healthcare-level-chip">{kpi.level}</span>
              </div>
              <h3>{kpi.name}</h3>
              <p className="healthcare-arabic-name">{kpi.arabicName}</p>
              <p>{kpi.definition}</p>
              <button type="button" onClick={() => setSelectedKpi(kpi)}>View KPI detail</button>
            </article>
          ))}
        </div>
      </section>

      <KpiDetailDrawer kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />
    </PageFrame>
  );
}
