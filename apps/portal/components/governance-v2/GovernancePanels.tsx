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
import type { GovernanceLineage } from "@/lib/governance/api";

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

export function AttributeTable({ attributes }: { attributes: AttributeRecord[] }) {
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
            <tr tabIndex={0} key={attribute.id}>
              <td>{attribute.name}</td>
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
