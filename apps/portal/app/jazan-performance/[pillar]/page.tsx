import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { TabNav } from "@/components/TabNav";
import { getApiJson } from "@/lib/api";
import {
  emptyJazanPillarsResponse,
  formatJazanFreshness,
  formatJazanMetric,
  formatJazanRisks,
  formatJazanStatus,
  type JazanPillar,
} from "@/lib/jazan";

type PageProps = {
  params: Promise<{ pillar: string }>;
};

type PillarResponse = {
  pillar: JazanPillar | null;
};

type StrategicAlignmentSummary = {
  objectivesCascaded: number | null;
  kpisLinked: number | null;
  initiativesLinked: number | null;
  municipalitiesCovered: number | null;
  openAlignmentGaps: number | null;
  dataFreshness: string | null;
};

type CascadeNode = {
  id: string;
  label: string;
  stage:
    | "vision_ministry"
    | "amanah_objective"
    | "agency_department"
    | "municipality"
    | "kpi_initiative_action";
  owner?: string | null;
  linkedKpiCount?: number | null;
  linkedInitiativeCount?: number | null;
  status:
    | "aligned"
    | "partially_aligned"
    | "missing_kpi"
    | "missing_owner"
    | "missing_initiative"
    | "needs_data";
};

type AlignmentMatrixRow = {
  objectiveId: string;
  strategicObjective: string;
  ministryAlignment: string | null;
  owner: string | null;
  linkedKpis: number | null;
  linkedInitiatives: number | null;
  municipalitiesCovered: string | null;
  status: string;
  gaps: string[];
};

type MunicipalityCoverage = {
  municipalityId: string;
  municipalityName: string;
  coveragePct: number | null;
  linkedObjectives: number | null;
  openGaps: number | null;
  status: "complete" | "partial" | "needs_data" | "at_risk";
};

type InitiativeLinkage = {
  initiativeId: string;
  initiativeName: string;
  objective: string | null;
  owner: string | null;
  linkedKpi: string | null;
  expectedBenefit: string | null;
  municipalityCoverage: string | null;
  status: string;
};

type AlignmentGap = {
  gapId: string;
  gap: string;
  impactedObjective: string;
  owner: string | null;
  dueDate: string | null;
  escalationLevel: string | null;
  expectedOutcome: string | null;
  status: string;
};

type StrategicAlignmentWorkspace = {
  summary: StrategicAlignmentSummary;
  cascadeNodes: CascadeNode[];
  alignmentMatrix: AlignmentMatrixRow[];
  municipalityCoverage: MunicipalityCoverage[];
  initiativeLinkage: InitiativeLinkage[];
  alignmentGaps: AlignmentGap[];
};

const emptyStrategicAlignmentWorkspace: StrategicAlignmentWorkspace = {
  summary: {
    objectivesCascaded: null,
    kpisLinked: null,
    initiativesLinked: null,
    municipalitiesCovered: null,
    openAlignmentGaps: null,
    dataFreshness: null,
  },
  cascadeNodes: [],
  alignmentMatrix: [],
  municipalityCoverage: [],
  initiativeLinkage: [],
  alignmentGaps: [],
};

const pillarTabs = [
  {
    key: "strategic-alignment",
    label: "01 · Strategic alignment",
    href: "/jazan-performance/strategic-alignment-objective-cascade",
  },
  {
    key: "kpi-governance",
    label: "02 · KPI governance",
    href: "/jazan-performance/kpi-performance-governance",
  },
  {
    key: "data-analytics",
    label: "03 · Data & analytics",
    href: "/jazan-performance/data-analytics-dashboards",
  },
  {
    key: "early-warning",
    label: "04 · Early warning",
    href: "/jazan-performance/municipal-project-early-warning",
  },
  {
    key: "decision-rhythm",
    label: "05 · Decision rhythm",
    href: "/jazan-performance/decision-rhythm-corrective-actions",
  },
  {
    key: "sustainability",
    label: "06 · Sustainability",
    href: "/jazan-performance/quality-knowledge-transfer-sustainability",
  },
];

const methodology = ["Align", "Cascade", "Link", "Validate", "Act"];

const liveIndicators: Array<[keyof StrategicAlignmentSummary, string]> = [
  ["objectivesCascaded", "Objectives cascaded"],
  ["kpisLinked", "KPIs linked"],
  ["initiativesLinked", "Initiatives linked"],
  ["municipalitiesCovered", "Municipalities covered"],
  ["openAlignmentGaps", "Open alignment gaps"],
];

const targetMeasures = [
  ["Strategic alignment coverage", "100% target"],
  ["Municipality coverage", "25 / 25 target"],
  ["Initiatives linked to objectives", "100% target"],
  ["Objectives with approved KPIs", "100% target"],
  ["Open alignment gaps resolved", ">85% target"],
];

const cascadeStages: CascadeNode[] = [
  {
    id: "vision-ministry",
    label: "Vision 2030 / Ministry Priorities",
    stage: "vision_ministry",
    status: "needs_data",
  },
  {
    id: "amanah-objectives",
    label: "Amanah Strategic Objectives",
    stage: "amanah_objective",
    status: "needs_data",
  },
  {
    id: "agency-department",
    label: "Agency / Department Objectives",
    stage: "agency_department",
    status: "needs_data",
  },
  {
    id: "municipality-objectives",
    label: "Municipality Objectives",
    stage: "municipality",
    status: "needs_data",
  },
  {
    id: "kpi-initiative-action",
    label: "KPIs + Initiatives + Corrective Actions",
    stage: "kpi_initiative_action",
    status: "needs_data",
  },
];

const deliverables = [
  ["Strategic alignment matrix", "Vision / Ministry / Amanah objective mapping"],
  ["Objective cascade map", "Leadership -> agencies -> departments -> municipalities"],
  ["Initiative portfolio", "Strategic and operational initiatives with owners"],
  ["Municipality coverage register", "25 municipality alignment coverage"],
  ["Alignment gap queue", "Missing KPI / owner / initiative / municipality mapping"],
  ["Monthly review input", "Alignment exceptions for leadership review"],
];

const dependencyGroups = [
  {
    title: "Sources",
    items: [
      "source_jazan.strategic_objectives - Amanah and ministry-aligned objective definitions",
      "source_jazan.objective_alignment - objective-to-objective mapping",
      "source_jazan.agencies_departments - agency and department ownership hierarchy",
      "source_jazan.municipalities - reference: 25 municipalities",
      "source_jazan.municipality_objective_map - municipality objective coverage",
      "source_jazan.initiatives - strategic and operational initiatives",
      "source_jazan.kpi_definitions - KPI dictionary references",
      "source_jazan.kpi_results - KPI results for linked objectives",
    ],
  },
  {
    title: "Analytics marts",
    items: [
      "analytics.dim_jazan_objective",
      "analytics.dim_jazan_municipality",
      "analytics.fct_jazan_objective_alignment",
      "analytics.fct_jazan_municipality_objective_coverage",
      "analytics.fct_jazan_initiative_portfolio",
      "analytics.fct_jazan_alignment_gap",
    ],
  },
  {
    title: "Decision tables",
    items: [
      "decision.jazan_alignment_gap_queue",
      "decision.jazan_escalation_recommendations",
      "decision.jazan_monthly_review_pack",
    ],
  },
  {
    title: "APIs",
    items: [
      "GET /api/v1/jazan/strategic-alignment",
      "GET /api/v1/jazan/objectives",
      "GET /api/v1/jazan/objective-cascade",
      "GET /api/v1/jazan/municipality-coverage",
      "GET /api/v1/jazan/alignment-gaps",
      "GET /api/v1/jazan/review-pack/monthly",
    ],
  },
];

const matrixColumns = [
  "Strategic Objective",
  "Vision / Ministry Alignment",
  "Owner",
  "Linked KPIs",
  "Linked Initiatives",
  "Municipalities Covered",
  "Status",
  "Gaps",
  "Action",
];

const initiativeColumns = [
  "Initiative",
  "Linked objective",
  "Owner",
  "Linked KPI",
  "Expected benefit",
  "Municipality coverage",
  "Status",
];

const gapColumns = ["Gap", "Impacted objective", "Owner", "Due date", "Escalation level", "Expected outcome", "Status"];

async function getPillar(pillarId: string) {
  const fallback = emptyJazanPillarsResponse.pillars.find((item) => item.id === pillarId) ?? null;
  const data = await getApiJson<PillarResponse>({
    path: `/api/v1/jazan/pillars/${pillarId}`,
    fallback: { pillar: fallback },
    cacheMode: "no-store",
  });

  return data.pillar?.bullets?.length ? data.pillar : fallback;
}

async function getStrategicAlignmentWorkspace() {
  return getApiJson<StrategicAlignmentWorkspace>({
    path: "/api/v1/jazan/strategic-alignment",
    fallback: emptyStrategicAlignmentWorkspace,
    cacheMode: "no-store",
  });
}

function formatNullableNumber(value: number | null) {
  return value === null || value === undefined ? "No data loaded" : String(value);
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function EmptyState({ message }: { message: string }) {
  return <div className="jazan-empty-state">{message}</div>;
}

function StrategicAlignmentWorkspacePage({ pillar, data }: { pillar: JazanPillar; data: StrategicAlignmentWorkspace }) {
  const cascadeNodes = data.cascadeNodes.length > 0 ? data.cascadeNodes : cascadeStages;

  return (
    <PageFrame
      eyebrow="Pillar 01"
      title={pillar.title}
      description="المواءمة الاستراتيجية وتسلسل الأهداف"
      chips={[
        { label: `Status: ${formatJazanStatus(pillar.status)}`, tone: "primary" },
        { label: `Primary KPI: ${pillar.primary_kpi.label}`, tone: "accent" },
        { label: `Route: ${pillar.route}`, tone: "accent" },
      ]}
      actions={
        <>
          <Link className="secondary-link" href="/jazan-performance">
            Back to operating model
          </Link>
          <Link className="secondary-link" href="/jazan-performance/kpi-performance-governance">
            View KPI Governance
          </Link>
          <Link className="button primary" href="#alignment-gaps">
            Open Alignment Gaps
          </Link>
        </>
      }
      pageClassName="jazan-workspace-page"
    >
      <TabNav items={pillarTabs} activeKey="strategic-alignment" />

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Scope & Methodology</p>
            <h2>Strategic alignment operating model</h2>
          </div>
          <span className="summary-badge">Data freshness: {formatJazanFreshness(data.summary.dataFreshness)}</span>
        </div>
        <p>
          Convert the Amanah strategy into an operating alignment model by cascading Vision 2030, ministry, and Amanah
          objectives to agencies, departments, and all 25 municipalities; linking each objective to KPIs, initiatives,
          owners, targets, and alignment gaps.
        </p>
        <div className="jazan-method-chain" aria-label="Strategic alignment methodology">
          {methodology.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </section>

      <section className="jazan-two-column-grid">
        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Section A</p>
              <h2>Live Alignment Indicators</h2>
            </div>
          </div>
          <div className="jazan-metric-grid">
            {liveIndicators.map(([key, label]) => (
              <article className="jazan-metric-card" key={key}>
                <span>Live</span>
                <h3>{label}</h3>
                <strong>{formatNullableNumber(data.summary[key] as number | null)}</strong>
              </article>
            ))}
          </div>
        </article>

        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Section B</p>
              <h2>Target Success Measures</h2>
            </div>
          </div>
          <div className="jazan-metric-grid">
            {targetMeasures.map(([label, value]) => (
              <article className="jazan-metric-card target" key={label}>
                <span>Target</span>
                <h3>{label}</h3>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Cascade</p>
            <h2>Strategic Cascade Map</h2>
          </div>
        </div>
        <div className="jazan-cascade-map">
          {cascadeNodes.map((node) => (
            <article className="jazan-cascade-node" key={node.id}>
              <span className={`jazan-status-chip ${node.status}`}>{formatStatusLabel(node.status)}</span>
              <h3>{node.label}</h3>
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>{node.owner || "Needs data"}</dd>
                </div>
                <div>
                  <dt>Linked KPIs</dt>
                  <dd>{formatNullableNumber(node.linkedKpiCount ?? null)}</dd>
                </div>
                <div>
                  <dt>Linked initiatives</dt>
                  <dd>{formatNullableNumber(node.linkedInitiativeCount ?? null)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        {data.cascadeNodes.length === 0 ? (
          <EmptyState message="No cascade data loaded. Connect strategic objectives, KPI definitions, initiatives, and municipality mappings to populate this view." />
        ) : null}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Matrix</p>
            <h2>Strategic Alignment Matrix</h2>
          </div>
        </div>
        {data.alignmentMatrix.length === 0 ? (
          <EmptyState message="No strategic alignment matrix loaded." />
        ) : (
          <div className="jazan-table-wrap">
            <table className="table jazan-data-table">
              <thead>
                <tr>{matrixColumns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.alignmentMatrix.map((row) => (
                  <tr key={row.objectiveId}>
                    <td>{row.strategicObjective}</td>
                    <td>{row.ministryAlignment ?? "Needs data"}</td>
                    <td>{row.owner ?? "Needs data"}</td>
                    <td>{formatNullableNumber(row.linkedKpis)}</td>
                    <td>{formatNullableNumber(row.linkedInitiatives)}</td>
                    <td>{row.municipalitiesCovered ?? "Needs data"}</td>
                    <td>{row.status}</td>
                    <td>{row.gaps.length > 0 ? row.gaps.join(", ") : "No data loaded"}</td>
                    <td>No data loaded</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">25 municipalities</p>
            <h2>Municipality Coverage</h2>
          </div>
        </div>
        {data.municipalityCoverage.length === 0 ? (
          <EmptyState message="No municipality coverage data loaded. Coverage is expected across 25 municipalities once mappings are connected." />
        ) : (
          <div className="jazan-municipality-grid">
            {data.municipalityCoverage.map((municipality) => (
              <article className="jazan-municipality-tile" key={municipality.municipalityId}>
                <h3>{municipality.municipalityName}</h3>
                <span className={`jazan-status-chip ${municipality.status}`}>{formatStatusLabel(municipality.status)}</span>
                <dl>
                  <div>
                    <dt>Coverage</dt>
                    <dd>{municipality.coveragePct === null ? "No data loaded" : `${municipality.coveragePct}%`}</dd>
                  </div>
                  <div>
                    <dt>Linked objectives</dt>
                    <dd>{formatNullableNumber(municipality.linkedObjectives)}</dd>
                  </div>
                  <div>
                    <dt>Open gaps</dt>
                    <dd>{formatNullableNumber(municipality.openGaps)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Initiatives</p>
            <h2>Initiative Linkage</h2>
          </div>
        </div>
        {data.initiativeLinkage.length === 0 ? (
          <EmptyState message="No initiative linkage data loaded." />
        ) : (
          <div className="jazan-table-wrap">
            <table className="table jazan-data-table">
              <thead>
                <tr>{initiativeColumns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.initiativeLinkage.map((initiative) => (
                  <tr key={initiative.initiativeId}>
                    <td>{initiative.initiativeName}</td>
                    <td>{initiative.objective ?? "Needs data"}</td>
                    <td>{initiative.owner ?? "Needs data"}</td>
                    <td>{initiative.linkedKpi ?? "Needs data"}</td>
                    <td>{initiative.expectedBenefit ?? "Needs data"}</td>
                    <td>{initiative.municipalityCoverage ?? "Needs data"}</td>
                    <td>{initiative.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel jazan-workspace-section" id="alignment-gaps">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Decision bridge</p>
            <h2>Alignment Gaps Requiring Action</h2>
          </div>
        </div>
        {data.alignmentGaps.length === 0 ? (
          <EmptyState message="No alignment gaps generated." />
        ) : (
          <div className="jazan-table-wrap">
            <table className="table jazan-data-table">
              <thead>
                <tr>{gapColumns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {data.alignmentGaps.map((gap) => (
                  <tr key={gap.gapId}>
                    <td>{gap.gap}</td>
                    <td>{gap.impactedObjective}</td>
                    <td>{gap.owner ?? "Needs data"}</td>
                    <td>{gap.dueDate ?? "Needs data"}</td>
                    <td>{gap.escalationLevel ?? "Needs data"}</td>
                    <td>{gap.expectedOutcome ?? "Needs data"}</td>
                    <td>{gap.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="jazan-two-column-grid">
        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Outputs</p>
              <h2>Deliverables</h2>
            </div>
          </div>
          <div className="jazan-deliverable-grid">
            {deliverables.map(([title, description]) => (
              <article className="jazan-deliverable-card" key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Integration contract</p>
              <h2>Data Sources & Dependencies</h2>
            </div>
          </div>
          <div className="jazan-dependency-groups">
            {dependencyGroups.map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </section>
    </PageFrame>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pillar: pillarId } = await params;
  const pillar = await getPillar(pillarId);
  return {
    title: pillar ? `${pillar.title} - Jazan Performance` : "Jazan Performance Pillar",
  };
}

export default async function JazanPerformancePillarPage({ params }: PageProps) {
  const { pillar: pillarId } = await params;
  const pillar = await getPillar(pillarId);

  if (!pillar) {
    notFound();
  }

  if (pillar.id === "strategic-alignment-objective-cascade") {
    const data = await getStrategicAlignmentWorkspace();
    return <StrategicAlignmentWorkspacePage pillar={pillar} data={data} />;
  }

  return (
    <PageFrame
      eyebrow={`Pillar ${String(pillar.number).padStart(2, "0")}`}
      title={pillar.title}
      description={pillar.bullets.join(" | ")}
      chips={[
        { label: `Status: ${formatJazanStatus(pillar.status)}`, tone: "primary" },
        { label: `Route: ${pillar.route}`, tone: "accent" },
      ]}
      actions={
        <Link className="secondary-link" href="/jazan-performance">
          Back to operating model
        </Link>
      }
    >
      <TabNav items={pillarTabs} activeKey={pillar.id} />
      <section className="jazan-detail-grid">
        <article className="panel jazan-detail-panel">
          <h2>Pillar Scope</h2>
          <ul>
            {pillar.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>

        <article className="panel jazan-detail-panel">
          <h2>Use-Case Contract</h2>
          <dl>
            <div>
              <dt>Primary KPI</dt>
              <dd>{pillar.primary_kpi.label}</dd>
            </div>
            <div>
              <dt>KPI Value</dt>
              <dd>{formatJazanMetric(pillar.primary_kpi)}</dd>
            </div>
            <div>
              <dt>Open Risks</dt>
              <dd>{formatJazanRisks(pillar.open_risks)}</dd>
            </div>
            <div>
              <dt>Data Freshness</dt>
              <dd>{formatJazanFreshness(pillar.data_freshness)}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{pillar.route}</dd>
            </div>
          </dl>
        </article>

        <article className="panel jazan-detail-panel">
          <h2>Empty State</h2>
          <p>No data loaded</p>
        </article>
      </section>
    </PageFrame>
  );
}
