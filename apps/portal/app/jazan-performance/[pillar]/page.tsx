import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import {
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

async function getPillar(pillarId: string) {
  const data = await getApiJson<PillarResponse>({
    path: `/api/v1/jazan/pillars/${pillarId}`,
    fallback: { pillar: null },
    cacheMode: "no-store",
  });

  return data.pillar;
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

  return (
    <PageFrame
      eyebrow="Jazan Performance Pillar"
      title={pillar.title}
      description={pillar.summary}
      chips={[
        { label: `Status: ${formatJazanStatus(pillar.status)}`, tone: "primary" },
        { label: `Control: ${pillar.responsible_control}`, tone: "accent" },
      ]}
      actions={
        <Link className="secondary-link" href="/">
          Back to operating model
        </Link>
      }
    >
      <section className="jazan-detail-grid">
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
          <p>
            Operational values are intentionally blank until the Jazan data pipelines publish certified KPI,
            freshness, and risk facts into the platform.
          </p>
        </article>
      </section>
    </PageFrame>
  );
}
