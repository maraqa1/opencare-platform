import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import {
  emptyJazanPillarsResponse,
  formatJazanFreshness,
  formatJazanMetric,
  formatJazanRisks,
  formatJazanStatus,
  type JazanPillarsResponse,
} from "@/lib/jazan";

export const metadata: Metadata = {
  title: "Jazan performance pillars - OpenCare Portal",
};

export default async function JazanPerformancePage() {
  const data = await getApiJson<JazanPillarsResponse>({
    path: "/api/v1/jazan/pillars",
    fallback: emptyJazanPillarsResponse,
    cacheMode: "no-store",
  });

  return (
    <PageFrame
      eyebrow="Jazan Performance"
      title="RFP Pillar Workspaces"
      description="Each route follows the OpenCare use-case contract: status, primary KPI, risks, freshness, evidence, and ownership without invented operational values."
      actions={
        <Link className="secondary-link" href="/">
          Back to operating model
        </Link>
      }
    >
      <section className="jazan-route-grid">
        {data.pillars.length === 0 ? (
          <article className="panel jazan-detail-panel">
            <h2>No pillar data available</h2>
            <p>The Jazan pillar feed is not available yet.</p>
          </article>
        ) : (
          data.pillars.map((pillar) => (
            <Link className={`jazan-route-card ${pillar.tone}`} href={pillar.route} key={pillar.id}>
              <span>{pillar.number}</span>
              <div>
                <h2>{pillar.title}</h2>
                <p>{pillar.summary}</p>
                <dl>
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
                    <dt>Freshness</dt>
                    <dd>{formatJazanFreshness(pillar.data_freshness)}</dd>
                  </div>
                </dl>
              </div>
            </Link>
          ))
        )}
      </section>
    </PageFrame>
  );
}
