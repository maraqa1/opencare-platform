import type { Metadata } from "next";
import Link from "next/link";

import type { UseCaseTemplatePackage } from "@/components/admin/use-case-template-types";
import { getApiJson } from "@/lib/api";
import {
  emptyJazanOverview,
  emptyJazanPillarsResponse,
  formatJazanFreshness,
  formatJazanMetric,
  formatJazanRisks,
  formatJazanStatus,
  type JazanOverview,
  type JazanPillarsResponse,
} from "@/lib/jazan";
import { filterVisibleUseCases, projectImportedPackagesToUseCases, useCases } from "@/lib/use-cases";

export const metadata: Metadata = {
  title: "Jazan RFP - Performance Management Target Operating Model",
};

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

export default async function HomePage() {
  const [overview, pillarData, runtime, health, useCaseConfig] = await Promise.all([
    getApiJson<JazanOverview>({
      path: "/api/v1/jazan/overview",
      fallback: emptyJazanOverview,
      cacheMode: "no-store",
    }),
    getApiJson<JazanPillarsResponse>({
      path: "/api/v1/jazan/pillars",
      fallback: emptyJazanPillarsResponse,
      cacheMode: "no-store",
    }),
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
  const pillars = pillarData.pillars ?? [];

  return (
    <div className="page jazan-tom-page">
      <header className="jazan-tom-header">
        <div className="jazan-region-lockup">
          <div className="jazan-region-mark">JR</div>
          <div>
            <em lang="ar" dir="rtl">منطقة جازان</em>
            <strong>{overview.region}</strong>
            <span>{overview.platform}</span>
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
          <h2>Stakeholder Coverage</h2>
          {overview.stakeholders.length === 0 ? (
            <div className="jazan-empty-state">Stakeholder coverage will appear after the Jazan overview feed is available.</div>
          ) : (
            overview.stakeholders.map((group, index) => (
              <article key={group.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.coverage.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))
          )}
        </aside>

        <main className="jazan-operating-model">
          <section className="jazan-vision">
            <p>Our Vision</p>
            <h2>{overview.vision}</h2>
          </section>

          <section className="jazan-pillars">
            <h2>Target Operating Model - 6 RFP Pillars</h2>
            <div className="jazan-pillar-grid">
              {pillars.length === 0 ? (
                <div className="jazan-empty-state">Pillar data is not available yet.</div>
              ) : (
                pillars.map((pillar) => (
                  <Link className={`jazan-pillar-card ${pillar.tone}`} href={pillar.route} key={pillar.id}>
                    <span>{pillar.number}</span>
                    <div>
                      <h3>{pillar.title}</h3>
                      <p>{pillar.summary}</p>
                      <dl className="jazan-pillar-meta">
                        <div>
                          <dt>Status</dt>
                          <dd>{formatJazanStatus(pillar.status)}</dd>
                        </div>
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
                    </div>
                  </Link>
                ))
              )}
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
              {overview.foundation_enablers.length === 0 ? (
                <span>Awaiting foundation configuration</span>
              ) : (
                overview.foundation_enablers.map((enabler) => <span key={enabler}>{enabler}</span>)
              )}
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
          <h2>Governance Structure / Controls</h2>
          <div className="jazan-governance-tree">
            <strong>Governance & Leadership</strong>
            <div>
              {overview.governance_controls.length === 0 ? (
                <span>Awaiting controls feed</span>
              ) : (
                overview.governance_controls.map((control) => <span key={control}>{control}</span>)
              )}
            </div>
          </div>
        </article>

        <article className="jazan-measures-panel">
          <h2>Success Measures</h2>
          <div>
            {overview.success_measures.length === 0 ? (
              <section>
                <p>Measures unavailable</p>
                <strong>Awaiting data</strong>
              </section>
            ) : (
              overview.success_measures.map((measure) => (
                <section key={measure.label}>
                  <p>{measure.label}</p>
                  <strong>{formatJazanMetric(measure)}</strong>
                </section>
              ))
            )}
          </div>
        </article>
      </section>

      <footer className="jazan-tom-footer">
        <span>Aligned Strategy</span>
        <span>Trusted Data</span>
        <span>Empowered People</span>
        <span>Integrated Processes</span>
        <span>Technology & Tools</span>
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
          <span><i className="unavailable" /> awaiting data</span>
        </div>
      </footer>
    </div>
  );
}
