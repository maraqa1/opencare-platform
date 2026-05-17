import Link from "next/link";

import type {
  AttributeRecord,
  EvidencePackDescriptor,
  EvidenceSource,
  GovernanceSignal,
  IssueRecord,
  MetricGovernanceRecord,
  PolicyRecord,
  TableGovernanceRecord,
  UseCaseGovernanceRecord,
} from "@/lib/governance/types";
import type { GovernanceEvidenceExport, GovernanceLineage } from "@/lib/governance/api";

export function displayValue(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return "Unknown";
  }
  return String(value).replace(/_/g, " ");
}

export function StatusPill({ label, value }: { label: string; value?: string | null }) {
  const normalised = value ?? "unknown";
  return (
    <span className={`gv2-pill gv2-${normalised.replace(/_/g, "-")}`} aria-label={`${label}: ${displayValue(normalised)}`}>
      <span>{label}</span>
      <strong>{displayValue(normalised)}</strong>
    </span>
  );
}

export function ApiState({ error }: { error?: string }) {
  if (!error) {
    return null;
  }
  return (
    <section className="gv2-state" role="status">
      <strong>Partial evidence</strong>
      <p>{error}</p>
    </section>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="gv2-state">
      <strong>{title}</strong>
      <p>{detail}</p>
    </section>
  );
}

export function EvidenceList({ evidence }: { evidence: EvidenceSource[] }) {
  if (evidence.length === 0) {
    return <EmptyState title="No evidence loaded" detail="The resolver did not return evidence sources for this record." />;
  }
  return (
    <div className="gv2-evidence-list">
      {evidence.map((source) => (
        <div className="gv2-evidence-row" key={`${source.source_id}-${source.source_type}`}>
          <StatusPill label={source.source_type} value={source.state} />
          <p>{source.detail ?? "Unknown"}</p>
        </div>
      ))}
    </div>
  );
}

export function SignalGrid({ signals }: { signals: GovernanceSignal[] }) {
  return (
    <div className="gv2-signal-grid">
      {signals.map((signal) => (
        <article className="gv2-panel" key={signal.name}>
          <div className="gv2-panel-head">
            <h3>{displayValue(signal.name)}</h3>
            <StatusPill label="Signal" value={signal.status} />
          </div>
          <p>{signal.evidence.detail ?? "Unknown"}</p>
          <span className="gv2-muted">{signal.evidence.source_type}</span>
        </article>
      ))}
    </div>
  );
}

export function UseCaseCard({ useCase }: { useCase: UseCaseGovernanceRecord }) {
  return (
    <Link className="gv2-card-link gv2-panel" href={`/governance/use-cases/${useCase.slug}`}>
      <div className="gv2-panel-head">
        <div>
          <span className="gv2-muted">{displayValue(useCase.domain)}</span>
          <h3>{useCase.name}</h3>
        </div>
        <StatusPill label="Trust Status" value={useCase.trust_status} />
      </div>
      <dl className="gv2-definition-grid">
        <div>
          <dt>Owner</dt>
          <dd>{displayValue(useCase.owner)}</dd>
        </div>
        <div>
          <dt>Steward</dt>
          <dd>{displayValue(useCase.steward)}</dd>
        </div>
      </dl>
    </Link>
  );
}

export function MetricList({ metrics, slug }: { metrics: MetricGovernanceRecord[]; slug: string }) {
  if (metrics.length === 0) {
    return <EmptyState title="No metrics configured" detail="No KPI declarations were returned by the governance resolver." />;
  }
  return (
    <div className="gv2-list">
      {metrics.map((metric) => (
        <Link className="gv2-row-link" href={`/governance/use-cases/${slug}/metrics/${metric.id}`} key={metric.id}>
          <span>
            <strong>{metric.name}</strong>
            <small>{displayValue(metric.definition)}</small>
          </span>
          <StatusPill label="Trust Status" value={metric.trust_status} />
        </Link>
      ))}
    </div>
  );
}

export function TableList({ tables, slug }: { tables: TableGovernanceRecord[]; slug: string }) {
  if (tables.length === 0) {
    return <EmptyState title="No tables configured" detail="No governed table declarations were returned by the governance resolver." />;
  }
  return (
    <div className="gv2-list">
      {tables.map((table) => (
        <Link className="gv2-row-link" href={`/governance/use-cases/${slug}/tables/${table.id}`} key={table.id}>
          <span>
            <strong>{table.name}</strong>
            <small>{displayValue(table.schema_name)} / {displayValue(table.table_name)}</small>
          </span>
          <StatusPill label="Trust Status" value={table.trust_status} />
        </Link>
      ))}
    </div>
  );
}

export function AttributeTable({
  attributes,
  slug,
  tableId,
  selectedAttributeId,
}: {
  attributes: AttributeRecord[];
  slug: string;
  tableId: string;
  selectedAttributeId?: string;
}) {
  if (attributes.length === 0) {
    return (
      <EmptyState
        title="No evidence loaded"
        detail="Attribute schema evidence is not loaded yet, so classifications render as unavailable instead of inferred rows."
      />
    );
  }
  return (
    <div className="gv2-table-scroll">
      <table className="gv2-table">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Business name</th>
            <th>Data type</th>
            <th>Classification</th>
            <th>Policy</th>
            <th>Matched rule</th>
            <th>Sensitivity</th>
            <th>Review</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {attributes.map((attribute) => (
            <tr className={attribute.id === selectedAttributeId ? "gv2-selected-row" : undefined} tabIndex={0} key={attribute.id}>
              <td>
                <Link
                  className="gv2-cell-link"
                  href={`/governance/use-cases/${slug}/tables/${tableId}?attribute=${encodeURIComponent(attribute.id)}`}
                  aria-current={attribute.id === selectedAttributeId ? "true" : undefined}
                >
                  {attribute.name}
                </Link>
              </td>
              <td>{displayValue(attribute.business_name)}</td>
              <td>{displayValue(attribute.data_type)}</td>
              <td>{displayValue(attribute.classification)}</td>
              <td>{displayValue(attribute.policy_id)} {attribute.policy_version ? `v${attribute.policy_version}` : ""}</td>
              <td>{displayValue(attribute.matched_rule)}</td>
              <td>{displayValue(attribute.sensitivity)}</td>
              <td>{displayValue(attribute.review_status)}</td>
              <td>Not configured</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AttributeDetailPanel({
  attribute,
  tableName,
}: {
  attribute: AttributeRecord | null;
  tableName: string;
}) {
  if (!attribute) {
    return (
      <EmptyState
        title="No attribute selected"
        detail="No governed attributes were returned for this table, so classification detail remains unavailable."
      />
    );
  }

  return (
    <aside className="gv2-panel gv2-attribute-detail" aria-label={`Attribute detail for ${attribute.name}`}>
      <div className="gv2-panel-head">
        <div>
          <span className="gv2-muted">{tableName}</span>
          <h3>{attribute.business_name ?? attribute.name}</h3>
        </div>
        <StatusPill label="Classification" value={attribute.classification} />
      </div>
      <dl className="gv2-definition-grid">
        <div>
          <dt>Attribute</dt>
          <dd>{attribute.name}</dd>
        </div>
        <div>
          <dt>Technical data type</dt>
          <dd>{displayValue(attribute.data_type)}</dd>
        </div>
        <div>
          <dt>Source table</dt>
          <dd>{displayValue(attribute.table_id)}</dd>
        </div>
        <div>
          <dt>Sensitivity</dt>
          <dd>{displayValue(attribute.sensitivity)}</dd>
        </div>
        <div>
          <dt>Policy ID</dt>
          <dd>{displayValue(attribute.policy_id)}</dd>
        </div>
        <div>
          <dt>Policy version</dt>
          <dd>{displayValue(attribute.policy_version)}</dd>
        </div>
        <div>
          <dt>Matched rule</dt>
          <dd>{displayValue(attribute.matched_rule)}</dd>
        </div>
        <div>
          <dt>Review state</dt>
          <dd>{displayValue(attribute.review_status)}</dd>
        </div>
        <div>
          <dt>Last reviewed</dt>
          <dd>{displayValue(attribute.last_reviewed)}</dd>
        </div>
        <div>
          <dt>Active exception</dt>
          <dd>Unknown</dd>
        </div>
      </dl>
      <div className="gv2-detail-block">
        <h4>Business description</h4>
        <p>{displayValue(attribute.description)}</p>
      </div>
      <div className="gv2-detail-block">
        <h4>Evidence</h4>
        <EvidenceList evidence={[attribute.evidence]} />
      </div>
      <div className="gv2-detail-block">
        <h4>Usage and history</h4>
        <p>Usage, consumers, reviewer, and change history are Unknown until supporting evidence is loaded through the resolver.</p>
      </div>
    </aside>
  );
}

export function IssuesList({ issues }: { issues: IssueRecord[] }) {
  if (issues.length === 0) {
    return <EmptyState title="No issue evidence loaded" detail="The issue store returned no records through the resolver." />;
  }
  return (
    <div className="gv2-list">
      {issues.map((issue) => (
        <article className="gv2-panel" key={issue.id}>
          <div className="gv2-panel-head">
            <h3>{issue.title}</h3>
            <StatusPill label="Severity" value={issue.severity} />
          </div>
          <p>{issue.description ?? "Unknown"}</p>
          <StatusPill label="Status" value={issue.status} />
        </article>
      ))}
    </div>
  );
}

export function EvidencePackList({ packs }: { packs: EvidencePackDescriptor[] }) {
  if (packs.length === 0) {
    return <EmptyState title="No evidence packs configured" detail="The backend returned no evidence pack descriptors." />;
  }
  return (
    <div className="gv2-grid two">
      {packs.map((pack) => (
        <article className="gv2-panel" key={pack.id}>
          <div className="gv2-panel-head">
            <h3>{pack.name}</h3>
            <StatusPill label="State" value={pack.state} />
          </div>
          <p>{pack.description}</p>
          <EvidenceList evidence={pack.evidence_sources} />
          <form action="/api/portal/governance/evidence/exports" method="post">
            <input type="hidden" name="pack_id" value={pack.id} />
            <button className="button secondary" type="submit">
              Request export
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}

export function EvidenceExportList({ exports }: { exports: GovernanceEvidenceExport[] }) {
  if (exports.length === 0) {
    return <EmptyState title="No recent exports" detail="No evidence export records were returned by the backend." />;
  }
  return (
    <div className="gv2-list">
      {exports.map((item) => (
        <article className="gv2-panel" key={item.export_id}>
          <div className="gv2-panel-head">
            <div>
              <span className="gv2-muted">{item.export_id}</span>
              <h3>{displayValue(item.pack_id)}</h3>
            </div>
            <StatusPill label="Status" value={item.status} />
          </div>
          <dl className="gv2-definition-grid">
            <div>
              <dt>Requested by</dt>
              <dd>{displayValue(item.requested_by)}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{displayValue(item.completed_at)}</dd>
            </div>
          </dl>
          {item.status === "completed" ? (
            <a className="secondary-link" href={`/api/portal/api/v1/governance/evidence/exports/${item.export_id}/download`}>
              Download JSON
            </a>
          ) : null}
          {item.error_message ? <p>{item.error_message}</p> : null}
        </article>
      ))}
    </div>
  );
}

export function PolicyList({ policies }: { policies: PolicyRecord[] }) {
  if (policies.length === 0) {
    return <EmptyState title="No policies loaded" detail="No classification policy YAML records were returned by the resolver." />;
  }
  return (
    <div className="gv2-grid two">
      {policies.map((policy) => (
        <article className="gv2-panel" key={`${policy.policy_id}-${policy.version}`}>
          <div className="gv2-panel-head">
            <div>
              <span className="gv2-muted">{policy.policy_id} v{policy.version}</span>
              <h3>{policy.name}</h3>
            </div>
            <StatusPill label="Status" value={policy.status} />
          </div>
          <dl className="gv2-definition-grid">
            <div>
              <dt>Owner</dt>
              <dd>{displayValue(policy.owner)}</dd>
            </div>
            <div>
              <dt>Framework</dt>
              <dd>{displayValue(policy.standard_or_framework)}</dd>
            </div>
          </dl>
          <div className="gv2-rule-list">
            {policy.rules.map((rule) => (
              <div className="gv2-rule-row" key={String(rule.rule_id)}>
                <strong>{displayValue(String(rule.rule_id))}</strong>
                <span>{displayValue(String(rule.classification))} / {displayValue(String(rule.sensitivity))}</span>
              </div>
            ))}
          </div>
          <EvidenceList evidence={[policy.evidence]} />
        </article>
      ))}
    </div>
  );
}

export function LineageCanvas({ lineage }: { lineage: GovernanceLineage | null }) {
  if (!lineage) {
    return <EmptyState title="Lineage unavailable" detail="The lineage resolver did not return a use-case lineage payload." />;
  }
  return (
    <div className="gv2-lineage">
      <div className="gv2-lineage-nodes">
        {lineage.nodes.map((node) => {
          const content = (
            <>
              <span>{displayValue(node.kind)}</span>
              <strong>{node.label}</strong>
              <small>{node.evidence_source}</small>
            </>
          );
          return node.detail_route ? (
            <Link className="gv2-lineage-node" href={node.detail_route} key={node.id}>
              {content}
            </Link>
          ) : (
            <div className="gv2-lineage-node" key={node.id}>
              {content}
            </div>
          );
        })}
      </div>
      {lineage.edges.length === 0 ? (
        <EmptyState title="Observed edges unavailable" detail="dbt manifest evidence is not loaded, so observed lineage edges remain Unknown." />
      ) : null}
      <EvidenceList evidence={lineage.evidence} />
    </div>
  );
}
