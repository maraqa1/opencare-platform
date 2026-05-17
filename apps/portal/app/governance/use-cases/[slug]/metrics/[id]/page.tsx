import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiState, displayValue, EvidenceList, MetricEvidenceGrid, StatusPill, SummaryStrip } from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { getGovernanceMetric } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Metric Governance - OpenCare Portal",
};

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function MetricGovernancePage({ params }: PageProps) {
  const { slug, id } = await params;
  const result = await getGovernanceMetric(slug, id);
  const metric = result.data;
  if (!metric) {
    notFound();
  }

  return (
    <PageFrame
      eyebrow="Metric Detail"
      title={metric.name}
      description="Metric definition, formula, owner, source table, consumers, and resolver evidence."
      chips={[{ label: `Trust Status: ${metric.trust_status}`, tone: "primary" }]}
      actions={[
        metric.source_table_id ? (
          <Link key="table" className="button secondary" href={`/governance/use-cases/${slug}/tables/${encodeURIComponent(metric.source_table_id)}`}>
            Source table
          </Link>
        ) : null,
        <Link key="use-case" className="secondary-link" href={`/governance/use-cases/${slug}`}>
          Use case
        </Link>,
      ]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={result.error} />
      <SummaryStrip
        metrics={[
          { label: "Metric Name", value: metric.name, detail: "Metric identity from governance YAML." },
          { label: "Metric Code", value: metric.id, detail: "Stable API identifier." },
          { label: "Owner", value: metric.owner ?? "Unknown", detail: "Declared owner." },
          { label: "Governance Status", value: metric.trust_status, detail: "Displayed property from resolver signals." },
          { label: "Classification", value: "Unknown", detail: "Metric classification evidence is not loaded." },
          { label: "Last Reviewed", value: "Unknown", detail: "Review evidence is not loaded." },
        ]}
      />
      <section className="gv2-grid two">
        <article className="gv2-panel">
          <div className="gv2-panel-head">
            <h2>Definition</h2>
            <StatusPill label="Trust Status" value={metric.trust_status} />
          </div>
          <dl className="gv2-definition-grid">
            <div>
              <dt>Definition</dt>
              <dd>{displayValue(metric.definition)}</dd>
            </div>
            <div>
              <dt>Formula</dt>
              <dd>{displayValue(metric.formula)}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{displayValue(metric.owner)}</dd>
            </div>
            <div>
              <dt>Source table</dt>
              <dd>{displayValue(metric.source_table_id)}</dd>
            </div>
          </dl>
        </article>
        <article className="gv2-panel">
          <h2>Governance Evidence</h2>
          <MetricEvidenceGrid metric={metric} />
        </article>
      </section>
      <section className="gv2-section">
        <h2>Source and Consumers</h2>
        <div className="gv2-grid two">
          <article className="gv2-panel">
            <h3>Source Table</h3>
            <p>{displayValue(metric.source_table_id)}</p>
          </article>
          <article className="gv2-panel">
            <h3>Consumers</h3>
            <div className="gv2-chip-list">
              {metric.consumers.length > 0 ? metric.consumers.map((consumer) => <span key={consumer}>{consumer}</span>) : <span>Unknown</span>}
            </div>
          </article>
        </div>
      </section>
      <section className="gv2-section">
        <h2>Resolver Evidence</h2>
        <EvidenceList evidence={metric.evidence} />
      </section>
    </PageFrame>
  );
}
