import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import {
  municipalityRisks,
  sabyaDrivers,
  sabyaKpis,
  sabyaTrend,
} from "@/lib/jazan-early-warning-demo";

type PageProps = {
  params: Promise<{ municipality: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { municipality: slug } = await params;
  const municipality = municipalityRisks.find((item) => item.slug === slug);

  return {
    title: municipality ? `${municipality.name} early warning - Jazan Performance` : "Municipality early warning",
  };
}

function RiskBadge({ label }: { label: string }) {
  return <span className={`jazan-status-chip ${label.replace(" ", "-")}`}>{label}</span>;
}

function TrendChart() {
  const points = "34,66 132,72 230,96 328,118 426,146 524,162";

  return (
    <div className="jazan-trend-chart">
      <div className="jazan-chart-title">
        <strong>90-day performance trend</strong>
        <span>هبوط الأداء</span>
      </div>
      <svg viewBox="0 0 560 210" role="img" aria-label="Sabya 90-day performance trend">
        <line x1="34" y1="48" x2="524" y2="48" className="grid" />
        <line x1="34" y1="102" x2="524" y2="102" className="grid" />
        <line x1="34" y1="156" x2="524" y2="156" className="grid" />
        <line x1="34" y1="92" x2="524" y2="92" className="target" />
        <text x="522" y="88" textAnchor="end">
          target 80%
        </text>
        <polyline points={points} className="trend-line" />
        {sabyaTrend.map((item, index) => {
          const [x, y] = points.split(" ")[index].split(",").map(Number);
          return (
            <g key={item.month}>
              <circle cx={x} cy={y} r={5} className={index === sabyaTrend.length - 1 ? "final" : ""} />
              <text x={x} y="190" textAnchor="middle">
                {item.month}
              </text>
              {index === 0 ? (
                <text x={x - 12} y={y - 12}>
                  82%
                </text>
              ) : null}
              {index === sabyaTrend.length - 1 ? (
                <text x={x - 54} y={y + 15} className="final-label">
                  68% now
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default async function MunicipalityEarlyWarningPage({ params }: PageProps) {
  const { municipality: slug } = await params;
  const municipality = municipalityRisks.find((item) => item.slug === slug);

  if (!municipality) {
    notFound();
  }

  return (
    <PageFrame
      eyebrow="Home > Use cases > Municipal early warning"
      title={municipality.name}
      description={`${municipality.arabicName} - municipality`}
      chips={[
        { label: municipality.status, tone: municipality.status === "high risk" ? "accent" : "primary" },
        { label: `ranked ${municipality.rank} of 25 municipalities`, tone: "accent" },
      ]}
      actions={
        <>
          <Link className="secondary-link" href="/jazan-performance/municipal-project-early-warning">
            Back to early warning
          </Link>
          <Link className="secondary-link" href="/jazan-performance/decision-rhythm-corrective-actions">
            Decision rhythm
          </Link>
        </>
      }
      pageClassName="jazan-workspace-page jazan-municipality-detail-page"
    >
      <section className="jazan-detail-score-grid">
        <article className="jazan-warning-metric">
          <span>Performance score</span>
          <strong>{municipality.score}%</strong>
          <p>{municipality.trend} over 90 days</p>
        </article>
        <article className="jazan-warning-metric">
          <span>Risk level</span>
          <strong>{municipality.status === "high risk" ? "High" : "Watch"}</strong>
          <p>composite of 4 drivers</p>
        </article>
        <article className="jazan-warning-metric">
          <span>Active risk drivers</span>
          <strong>4</strong>
          <p>1 critical - 3 elevated</p>
        </article>
        <article className="jazan-warning-metric">
          <span>Open actions</span>
          <strong>{municipality.openActions}</strong>
          <p>auto-created</p>
        </article>
      </section>

      <section className="panel jazan-workspace-section">
        <TrendChart />
      </section>

      <section className="jazan-two-column-grid">
        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Risk drivers</p>
              <h2>Why it was flagged</h2>
            </div>
          </div>
          <div className="jazan-risk-driver-list">
            {sabyaDrivers.map((driver) => (
              <div key={driver.title}>
                <span className={`risk-dot ${driver.severity}`} />
                <div>
                  <strong>{driver.title}</strong>
                  <p>{driver.detail}</p>
                </div>
                <RiskBadge label={driver.severity} />
              </div>
            ))}
          </div>
        </article>

        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Underlying KPIs</p>
              <h2>مؤشرات حسب</h2>
            </div>
          </div>
          <div className="jazan-kpi-list">
            {sabyaKpis.map((kpi) => (
              <div key={kpi.label}>
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <RiskBadge label={kpi.status} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel jazan-action-panel">
        <div>
          <span className="summary-badge">New</span>
          <h2>Investigate {municipality.name} performance drop</h2>
          <p>auto-created from the performance anomaly - unassigned - 12 minutes ago</p>
        </div>
        <Link className="button primary" href="/jazan-performance/decision-rhythm-corrective-actions">
          Open action
        </Link>
      </section>
    </PageFrame>
  );
}
