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
      <section className="gv2-grid two">
        <article className="gv2-panel">
          <div className="gv2-panel-head">
            <h2>Ownership</h2>
            <StatusPill label="Trust Status" value={table.trust_status} />
          </div>
          <dl className="gv2-definition-grid">
            <div>
              <dt>Schema</dt>
              <dd>{displayValue(table.schema_name)}</dd>
            </div>
            <div>
              <dt>Table</dt>
              <dd>{displayValue(table.table_name)}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{displayValue(table.owner)}</dd>
            </div>
            <div>
              <dt>Steward</dt>
              <dd>{displayValue(table.steward)}</dd>
            </div>
          </dl>
        </article>
        <article className="gv2-panel">
          <h2>Consumers</h2>
          <div className="gv2-chip-list">
            {table.consumers.length > 0 ? table.consumers.map((consumer) => <span key={consumer}>{consumer}</span>) : <span>Unknown</span>}
          </div>
        </article>
      </section>
      <section className="gv2-section">
        <h2>Attributes</h2>
        <div className="gv2-attribute-workspace">
          <AttributeTable attributes={table.attributes} slug={slug} tableId={id} selectedAttributeId={selectedAttribute?.id} />
          <AttributeDetailPanel attribute={selectedAttribute} tableName={table.name} />
        </div>
      </section>
      <section className="gv2-section">
        <h2>Evidence</h2>
        <EvidenceList evidence={table.evidence} />
      </section>
    </PageFrame>
  );
}
