import type { Metadata } from "next";
import Link from "next/link";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";
import { getApiJson } from "@/lib/api";
import { filterVisibleUseCases, projectImportedPackagesToUseCases, useCases } from "@/lib/use-cases";

export const metadata: Metadata = {
  title: "Jazan RFP - Performance Management Target Operating Model",
};

const stakeholders = [
  { icon: "01", title: "Decision Makers", lines: ["Executive leadership", "Steering committee"] },
  { icon: "02", title: "Performance Owners", lines: ["Sector leaders", "Department heads"] },
  { icon: "03", title: "Enablers", lines: ["PMO", "Data and analytics", "IT and digital", "Finance"] },
  { icon: "04", title: "Users", lines: ["Employees", "Managers", "Citizens and beneficiaries"] },
  { icon: "05", title: "External Partners", lines: ["National entities", "Vendors and partners", "Auditors and regulators"] },
];

const pillars = [
  {
    number: "1",
    title: "Governance & Leadership",
    tone: "blue",
    diagramHref: "#kpi-governance-diagram",
    lines: ["Clear roles and accountabilities", "Performance Management Office", "Policies, standards, and frameworks"],
  },
  {
    number: "2",
    title: "Strategy & Alignment",
    tone: "teal",
    diagramHref: "#kpi-governance-diagram",
    lines: ["Strategic objectives cascading", "Balanced scorecard and KPIs", "OKR alignment"],
  },
  {
    number: "3",
    title: "Data & Analytics",
    tone: "green",
    diagramHref: "#early-warning-diagram",
    lines: ["One source of truth", "Data quality and governance", "Advanced analytics and AI"],
  },
  {
    number: "4",
    title: "Processes & Methodology",
    tone: "cyan",
    diagramHref: "#early-warning-diagram",
    lines: ["Standardized processes", "Performance planning cycle", "Reviews and decision forums"],
  },
  {
    number: "5",
    title: "Technology & Tools",
    tone: "purple",
    diagramHref: "#early-warning-diagram",
    lines: ["Integrated PM platform", "Dashboards and self-service", "Automation and workflow"],
  },
  {
    number: "6",
    title: "People & Culture",
    tone: "orange",
    diagramHref: "#early-warning-diagram",
    lines: ["Capability building", "Change management", "Performance culture and incentives"],
  },
];

const outcomes = [
  { icon: "SA", title: "Strategic Alignment", note: "Every initiative linked to strategy" },
  { icon: "DD", title: "Data-Driven Decisions", note: "Insights that drive smarter actions" },
  { icon: "AC", title: "Accountability", note: "Clear ownership and performance visibility" },
  { icon: "OE", title: "Operational Excellence", note: "Improved efficiency and productivity" },
  { icon: "CI", title: "Citizen Impact", note: "Better services and measurable outcomes" },
];

const rhythm = [
  ["Plan", "Annually"],
  ["Monitor", "Monthly"],
  ["Review", "Quarterly"],
  ["Analyze", "Quarterly"],
  ["Act & Improve", "Continuous"],
];

const measures = [
  ["Strategic objectives with KPIs", "100%"],
  ["Timely performance reports", ">95%"],
  ["Data quality score", ">90%"],
  ["Initiatives on-track", ">85%"],
  ["Citizen satisfaction", "Improved"],
];

const foundationEnablers = [
  "PMO & Governance",
  "Data Governance",
  "Change Management",
  "Communications",
  "Capability Building",
  "Risk & Compliance",
];

const earlyWarningLayers = [
  {
    title: "Strategy & KPIs",
    arabic: "الأهداف ومؤشرات الأداء",
    detail: "objectives -> KPI dictionary -> scorecards",
    tone: "management",
  },
  {
    title: "Data pipeline",
    arabic: "منصة البيانات",
    detail: "source -> raw -> marts -> output -> decision",
    tone: "evidence",
  },
  {
    title: "Early warning",
    arabic: "الإنذار المبكر",
    detail: "delay forecast, anomalies, risk heatmap",
    tone: "risk",
  },
  {
    title: "Executive cockpit",
    arabic: "لوحة القيادة التنفيذية",
    detail: "performance score, risks, decisions",
    tone: "management",
  },
  {
    title: "Corrective action",
    arabic: "الإجراءات التصحيحية",
    detail: "root cause -> owner -> escalation -> closure",
    tone: "risk",
  },
  {
    title: "Review & decisions",
    arabic: "المراجعة والقرارات",
    detail: "monthly review pack -> leadership decisions",
    tone: "management",
  },
  {
    title: "Governance & evidence",
    arabic: "الحوكمة والأدلة",
    detail: "KPI formula, source, freshness, lineage, audit",
    tone: "evidence",
  },
];

const governanceBlocks = [
  {
    title: "KPI definitions",
    arabic: "تعريفات المؤشرات",
    detail: "strategic, project, service, revenue, compliance",
    tone: "management",
  },
  {
    title: "Definition",
    arabic: "التعريف",
    detail: "formula, unit, direction, frequency",
    tone: "management",
  },
  {
    title: "Accountability",
    arabic: "المساءلة",
    detail: "KPI owner, data owner, source system",
    tone: "management",
  },
  {
    title: "Targets & status",
    arabic: "المستهدفات والحالة",
    detail: "green, amber, red thresholds",
    tone: "management",
  },
  {
    title: "Evidence",
    arabic: "الأدلة",
    detail: "dictionary, source freshness, lineage, audit",
    tone: "evidence",
  },
  {
    title: "KPI result -> status",
    arabic: "النتيجة والحالة",
    detail: "actual vs target -> green / amber / red",
    tone: "risk",
  },
  {
    title: "Municipality scorecard & score",
    arabic: "بطاقة أداء البلدية",
    detail: "weighted roll-up -> performance score",
    tone: "management",
  },
];

export default async function HomePage() {
  const [runtime, health, useCaseConfig] = await Promise.all([
    getApiJson<{
      runtimes?: Array<{ name: string; last_run?: string | null; row_count?: number }>;
    }>({
      path: "/api/v1/admin/runtime-status",
      fallback: { runtimes: [] },
    }),
    getApiJson<{
      checks?: Array<{ name: string; healthy: boolean }>;
    }>({
      path: "/api/v1/admin/health",
      fallback: { checks: [] },
    }),
    getApiJson<{
      all_use_cases?: Record<string, { enabled?: boolean }>;
      active_imported_use_cases?: UseCaseTemplatePackage[];
    }>({
      path: "/api/v1/config/use-cases",
      fallback: { all_use_cases: {} },
      cacheMode: "no-store",
    }),
  ]);

  const visibleUseCases = filterVisibleUseCases(useCases, useCaseConfig.all_use_cases ?? {});
  const importedUseCases = projectImportedPackagesToUseCases(useCaseConfig.active_imported_use_cases ?? []);
  const activeUseCases = [...visibleUseCases, ...importedUseCases];
  const healthyCount = (health.checks ?? []).filter((item) => item.healthy).length;
  const healthTotal = health.checks?.length ?? 0;
  const runtimeCount = runtime.runtimes?.length ?? 0;

  return (
    <div className="page jazan-tom-page">
      <header className="jazan-tom-header">
        <div className="jazan-region-lockup">
          <div className="jazan-region-mark">JR</div>
          <div>
            <em lang="ar" dir="rtl">منطقة جازان</em>
            <strong>Jazan Region</strong>
            <span>Performance management platform</span>
          </div>
        </div>
        <div className="jazan-title-block">
          <h1>Jazan RFP - Performance Management Target Operating Model</h1>
          <p>Data-Driven | Integrated | Accountable | Impact-Focused</p>
        </div>
        <div className="jazan-impact-lockup">
          <em lang="ar" dir="rtl">نحو إدارة أداء تحقق الأثر</em>
          <strong>Performance that Delivers Impact</strong>
          <span>Foundation shell for measurable outcomes</span>
        </div>
      </header>

      <section className="jazan-tom-layout">
        <aside className="jazan-stakeholders">
          <h2>Key Stakeholders</h2>
          {stakeholders.map((group) => (
            <article key={group.title}>
              <span>{group.icon}</span>
              <div>
                <h3>{group.title}</h3>
                <ul>
                  {group.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </aside>

        <main className="jazan-operating-model">
          <section className="jazan-vision">
            <p>Our Vision</p>
            <h2>
              A unified performance management ecosystem that drives strategic alignment, data-driven decisions,
              accountability, and measurable impact for Jazan Region.
            </h2>
          </section>

          <nav className="jazan-diagram-jump-row" aria-label="Operating model diagram navigation">
            <Link href="#early-warning-diagram">Open Early Warning Diagram</Link>
            <Link href="#kpi-governance-diagram">Open KPI Governance Diagram</Link>
          </nav>

          <section className="jazan-pillars">
            <h2>Target Operating Model - 6 Pillars</h2>
            <div className="jazan-pillar-grid">
              {pillars.map((pillar) => (
                <Link className={`jazan-pillar-card ${pillar.tone}`} href={pillar.diagramHref} key={pillar.number}>
                  <span>{pillar.number}</span>
                  <div>
                    <h3>{pillar.title}</h3>
                    <ul>
                      {pillar.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </Link>
              ))}
            </div>
            <div className="jazan-value-cycle" aria-label="Performance management value cycle">
              {["Plan", "Measure", "Monitor", "Analyze", "Act", "Improve"].map((step) => (
                <span key={step}>{step}</span>
              ))}
              <strong>Performance Management Value Cycle</strong>
            </div>
          </section>

          <section className="jazan-enablers">
            <h2>Foundation Enablers</h2>
            <div>
              {foundationEnablers.map((enabler) => (
                <span key={enabler}>{enabler}</span>
              ))}
            </div>
          </section>
        </main>

        <aside className="jazan-outcomes">
          <h2>Target Outcomes</h2>
          {outcomes.map((outcome) => (
            <article key={outcome.title}>
              <span>{outcome.icon}</span>
              <div>
                <h3>{outcome.title}</h3>
                <p>{outcome.note}</p>
              </div>
            </article>
          ))}
        </aside>
      </section>

      <section className="jazan-operating-diagrams">
        <article className="jazan-flow-panel" id="early-warning-diagram">
          <div className="jazan-diagram-heading">
            <p>Jazan municipal performance early warning</p>
            <span lang="ar" dir="rtl">الإنذار المبكر لتعثر المشاريع وتأخر الأداء</span>
            <strong>OpenCare performance operating model - continuous refresh loop</strong>
          </div>
          <div className="jazan-flow-stack">
            {earlyWarningLayers.map((layer) => (
              <section className={`jazan-flow-layer ${layer.tone}`} key={layer.title}>
                <div>
                  <h3>{layer.title}</h3>
                  <p>{layer.detail}</p>
                </div>
                <span lang="ar" dir="rtl">{layer.arabic}</span>
              </section>
            ))}
          </div>
        </article>

        <article className="jazan-flow-panel" id="kpi-governance-diagram">
          <div className="jazan-diagram-heading">
            <p>Strategy & KPI governance layer</p>
            <span lang="ar" dir="rtl">حوكمة الأهداف ومؤشرات الأداء</span>
            <strong>Strategic objectives cascade to governed municipal scorecards</strong>
          </div>
          <div className="jazan-cascade">
            {["Vision", "Ministry", "Amanah", "Agency", "Municipality"].map((level) => (
              <span key={level}>{level}</span>
            ))}
          </div>
          <div className="jazan-flow-stack compact">
            {governanceBlocks.map((block) => (
              <section className={`jazan-flow-layer ${block.tone}`} key={block.title}>
                <div>
                  <h3>{block.title}</h3>
                  <p>{block.detail}</p>
                </div>
                <span lang="ar" dir="rtl">{block.arabic}</span>
              </section>
            ))}
          </div>
        </article>
      </section>

      <section className="jazan-bottom-grid">
        <article className="jazan-rhythm-panel">
          <h2>Operating Rhythm</h2>
          <div>
            {rhythm.map(([label, cadence]) => (
              <section key={label}>
                <span>{label.slice(0, 2).toUpperCase()}</span>
                <strong>{label}</strong>
                <p>{cadence}</p>
              </section>
            ))}
          </div>
        </article>

        <article className="jazan-governance-panel">
          <h2>Governance Structure</h2>
          <div className="jazan-governance-tree">
            <strong>Steering Committee</strong>
            <div>
              <span>PMO</span>
              <span>Performance Owners</span>
              <span>Data & Analytics</span>
            </div>
          </div>
        </article>

        <article className="jazan-measures-panel">
          <h2>Success Measures</h2>
          <div>
            {measures.map(([label, value]) => (
              <section key={label}>
                <p>{label}</p>
                <strong>{value}</strong>
              </section>
            ))}
          </div>
        </article>
      </section>

      <footer className="jazan-tom-footer">
        <span>Aligned Strategy</span>
        <span>Trusted Data</span>
        <span>Empowered People</span>
        <span>Integrated Processes</span>
        <span>Smart Technology</span>
        <strong>Sustainable Impact for Jazan</strong>
        <div>
          <Link className="button primary" href="/admin/configuration">
            Configure Foundation
          </Link>
          <Link className="secondary-link" href="/admin/use-case-templates">
            Prepare Use Case
          </Link>
        </div>
        <p>
          Active municipal use cases: {activeUseCases.length} | Services healthy: {healthyCount}/{healthTotal} |
          Runtimes tracked: {runtimeCount}
        </p>
        <div className="jazan-status-legend" aria-label="Operating model status legend">
          <span><i className="on-track" /> on track</span>
          <span><i className="watch" /> watch</span>
          <span><i className="at-risk" /> at risk</span>
        </div>
      </footer>
    </div>
  );
}
