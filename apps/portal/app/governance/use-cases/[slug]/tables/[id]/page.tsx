import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ApiState,
  AttributeDetailPanel,
  AttributeTable,
  displayValue,
  EvidenceList,
  StatusPill,
  SummaryStrip,
} from "@/components/governance-v2/GovernancePanels";
import { PageFrame } from "@/components/page-frame";
import { getGovernanceTable } from "@/lib/governance/api";

export const metadata: Metadata = {
  title: "Table Governance - OpenCare Portal",
};

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ attribute?: string }>;
};

export default async function TableGovernancePage({ params, searchParams }: PageProps) {
  const { slug, id } = await params;
  const { attribute: selectedAttributeId } = await searchParams;
  const result = await getGovernanceTable(slug, id);
  const table = result.data;
  if (!table) {
    notFound();
  }
  const selectedAttribute =
    table.attributes.find((item) => item.id === selectedAttributeId) ?? table.attributes[0] ?? null;

  return (
    <PageFrame
      eyebrow="Table Detail"
      title={table.name}
      description="Schema, attribute classification, ownership, consumers, quality, freshness, and evidence status."
      chips={[{ label: `Trust Status: ${table.trust_status}`, tone: "primary" }]}
      actions={[
        <Link key="lineage" className="button secondary" href={`/governance/use-cases/${slug}/lineage`}>
          Lineage
        </Link>,
        <Link key="use-case" className="secondary-link" href={`/governance/use-cases/${slug}`}>
          Use case
        </Link>,
      ]}
      pageClassName="governance-v2-page"
    >
      <ApiState error={result.error} />
      <SummaryStrip
        metrics={[
          { label: "Table", value: table.name, detail: "Governed table identifier." },
          { label: "Stage", value: table.schema_name ?? "Unknown", detail: "Pipeline stage inferred from declaration." },
          { label: "Owner", value: table.owner ?? "Unknown", detail: "Ownership evidence." },
          { label: "Steward", value: table.steward ?? "Unknown", detail: "Stewardship evidence." },
          { label: "DQ Status", value: "Unknown", detail: "dbt run_results evidence is not loaded." },
          { label: "Freshness", value: "Unknown", detail: "Freshness evidence is not loaded." },
          { label: "Classification", value: table.attributes.find((attribute) => attribute.classification !== "unknown")?.classification ?? "Unknown", detail: "From attribute classifications." },
          { label: "Consumers", value: table.consumers.length, detail: "Declared downstream consumers." },
        ]}
      />
      <section className="gv2-table-detail-workspace">
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>Schema</h2>
            <span className="gv2-muted">{table.attributes.length} columns, click any column to view detail</span>
          </div>
          <AttributeTable attributes={table.attributes} slug={slug} tableId={id} selectedAttributeId={selectedAttribute?.id} />
        </article>
        <AttributeDetailPanel attribute={selectedAttribute} tableName={table.name} />
      </section>
      <section className="gv2-workspace-split">
        <article className="gv2-panel">
          <div className="gv2-section-head">
            <h2>Data Quality Checks</h2>
            <span className="gv2-muted">Resolver evidence</span>
          </div>
          <div className="gv2-evidence-cells">
            {["Freshness", "Completeness", "Range check", "Uniqueness", "Referential integrity"].map((check) => (
              <article className="gv2-evidence-cell" key={check}>
                <span>{check}</span>
                <StatusPill label="Status" value="unknown" />
                <small>No dbt run_results evidence loaded.</small>
              </article>
            ))}
          </div>
        </article>
        <article className="gv2-panel">
          <h2>Ownership and Governance</h2>
          <dl className="gv2-definition-grid">
            <div><dt>Owner</dt><dd>{displayValue(table.owner)}</dd></div>
            <div><dt>Steward</dt><dd>{displayValue(table.steward)}</dd></div>
            <div><dt>Review cadence</dt><dd>Unknown</dd></div>
            <div><dt>Last reviewed</dt><dd>Unknown</dd></div>
            <div><dt>Data domain</dt><dd>{displayValue(table.schema_name)}</dd></div>
            <div><dt>Governance tier</dt><dd>Unknown</dd></div>
          </dl>
          <h3>Consumers</h3>
          <div className="gv2-chip-list">
            {table.consumers.length > 0 ? table.consumers.map((consumer) => <span key={consumer}>{consumer}</span>) : <span>Unknown</span>}
          </div>
        </article>
      </section>
      <section className="gv2-section">
        <h2>Evidence</h2>
        <EvidenceList evidence={table.evidence} />
      </section>
    </PageFrame>
  );
}
