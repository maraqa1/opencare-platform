"use client";

import { useMemo, useState } from "react";

import { ClassificationInventory } from "@/components/ClassificationInventory";
import { DataQualitySummary } from "@/components/DataQualitySummary";
import { LineageDAG } from "@/components/LineageDAG";
import { SourceFreshness } from "@/components/SourceFreshness";
import {
  type BusinessTrustNode,
  type CertificationStatus,
  type GovernanceStatus,
  type GovernanceUseCase,
  type GovernedDataset,
  type QualityDimensionStatus,
  getGovernanceOverview,
  getGovernanceUseCases,
} from "@/lib/governance-registry";

type GovernanceMode = "trust-map" | "asset-registry" | "classification" | "dictionary";

const governanceModes: Array<{ key: GovernanceMode; label: string }> = [
  { key: "trust-map", label: "Trust Map" },
  { key: "asset-registry", label: "Asset Registry" },
  { key: "classification", label: "Classification & Policies" },
  { key: "dictionary", label: "Data Dictionary" },
];

const trustMapOrder = [
  "source",
  "landing",
  "staging",
  "mart",
  "runtime",
  "workspace",
  "dashboard",
  "kpi",
  "decision",
] as const;

const sensitivityRank = {
  public: 0,
  internal: 1,
  sensitive: 2,
  restricted: 3,
} as const;

function statusLabel(status: GovernanceStatus | CertificationStatus | string) {
  return String(status).replaceAll("_", " ");
}

function statusTone(status: GovernanceStatus | CertificationStatus | string) {
  switch (status) {
    case "trusted":
    case "approved":
    case "reviewed":
    case "certified":
    case "fresh":
    case "passing":
    case "complete":
    case "compliant":
      return "positive";
    case "draft":
    case "partial":
    case "warning":
    case "needs_review":
      return "warning";
    case "missing":
    case "failing":
    case "stale":
    case "restricted":
    case "gap":
    case "deprecated":
      return "critical";
    default:
      return "neutral";
  }
}

function trustStateForNode(node: BusinessTrustNode): "Trusted" | "Warning" | "Degraded" | "Not instrumented" {
  const statuses = [node.freshnessStatus, node.qualityStatus, node.certificationStatus]
    .filter(Boolean)
    .map(String);
  if (statuses.length === 0) return "Not instrumented";
  if (statuses.some((status) => status === "failing" || status === "stale" || status === "deprecated")) {
    return "Degraded";
  }
  if (statuses.some((status) => status === "warning" || status === "partial" || status === "draft")) {
    return "Warning";
  }
  return "Trusted";
}

function trustStateTone(state: ReturnType<typeof trustStateForNode>) {
  switch (state) {
    case "Trusted":
      return "positive";
    case "Warning":
      return "warning";
    case "Degraded":
      return "critical";
    default:
      return "neutral";
  }
}

function assetTypeLabel(type: GovernedDataset["assetType"]) {
  switch (type) {
    case "fact":
      return "Fact";
    case "dimension":
      return "Dimension";
    case "output":
      return "Runtime Output";
    case "decision":
      return "Decision";
    case "dictionary":
      return "Dictionary";
    case "source":
      return "Source";
    default:
      return "Unknown";
  }
}

function columnClassification(asset: GovernedDataset) {
  const classes = asset.columns?.map((column) => column.sensitivityClass) ?? [];
  if (classes.length === 0) return "unknown";
  return classes.reduce((highest, current) =>
    sensitivityRank[current] > sensitivityRank[highest] ? current : highest,
  );
}

function qualityDimensionEntries(asset: GovernedDataset) {
  return Object.entries(asset.qualityDimensions ?? {}) as [string, QualityDimensionStatus][];
}

function businessNodeLabel(node: BusinessTrustNode) {
  const replacements: Record<string, string> = {
    "Bed Events": "Hospital Source Events",
    "Airbyte Raw Landing": "Raw Landing",
    "dbt Staging: stg_bed_events": "Standardized Bed Events",
    "Analytics Mart: fct_bed_occupancy": "Occupancy Fact",
    "Forecast Runtime": "Forecast Runtime",
    "Superset Bed Dashboard": "Ward Occupancy Dashboard",
    "Portal KPI: Bed Occupancy": "Ward Occupancy KPI",
    "Decision / Action Queue": "Decision Action",
    "Claims and Denials": "Claims Source Events",
    "dbt Staging": "Standardized Revenue Events",
    "Analytics Mart: fct_revenue_cycle": "Revenue Cycle Fact",
    "Analytics Mart: Recovery Opportunities": "Recovery Opportunity Fact",
    "Cash Forecast Output": "Cash Forecast Runtime",
    "Portal KPI: Cash Command": "Cash Command KPI",
    "Superset CFO Dashboard": "CFO Dashboard",
    "Recovery Action Queue": "Recovery Decision Action",
  };
  return replacements[node.label] ?? node.label.replace(/^Portal KPI:\s*/i, "");
}

function technicalNodeLabel(node: BusinessTrustNode) {
  return node.label === businessNodeLabel(node) ? statusLabel(node.type) : node.label;
}

function findAssetForNode(useCase: GovernanceUseCase, node: BusinessTrustNode | null) {
  if (!node?.assetId) return null;
  return useCase.governedDatasets.find((asset) => asset.id === node.assetId) ?? null;
}

function countWarnings(useCases: GovernanceUseCase[]) {
  return useCases.reduce(
    (count, useCase) =>
      count + useCase.trustMap.nodes.filter((node) => ["Warning", "Degraded"].includes(trustStateForNode(node))).length,
    0,
  );
}

function countClassifiedColumns(useCases: GovernanceUseCase[]) {
  return useCases.reduce(
    (count, useCase) =>
      count +
      useCase.governedDatasets.reduce((assetCount, asset) => assetCount + (asset.columns?.length ?? 0), 0),
    0,
  );
}

function renderUnknown(message: string) {
  return <div className="governance-empty-state">{message}</div>;
}

function TrustPostureStrip({ useCases }: { useCases: GovernanceUseCase[] }) {
  const overview = getGovernanceOverview();
  const lineageCoverage = overview.lineageCoverage;
  const items = [
    ["Trusted assets", overview.certifiedAssets],
    ["Warning stages", countWarnings(useCases)],
    ["Classified columns", countClassifiedColumns(useCases)],
    ["Lineage coverage", lineageCoverage],
  ];

  return (
    <section className="trust-posture-strip" aria-label="Trust posture summary">
      {items.map(([label, value], index) => (
        <span className="trust-posture-inline-item" key={label}>
          <strong>{label}</strong> {value}
          {index < items.length - 1 ? <em>·</em> : null}
        </span>
      ))}
    </section>
  );
}

function TrustMapHero({
  selectedNodeId,
  useCase,
  onSelectNode,
}: {
  selectedNodeId: string | null;
  useCase: GovernanceUseCase;
  onSelectNode: (node: BusinessTrustNode) => void;
}) {
  const orderedNodes = trustMapOrder.flatMap((stage) => useCase.trustMap.nodes.filter((node) => node.type === stage));

  return (
    <section className="trust-map-hero" aria-label={`${useCase.name} trust map`}>
      <div className="trust-map-hero-head">
        <div>
          <p className="eyebrow">Business Trust Map</p>
          <h2>{useCase.trustMap.title}</h2>
          <p>{useCase.trustMap.summary}</p>
        </div>
        <span className={`trust-state-pill ${statusTone(useCase.complianceContext.posture)}`}>
          {statusLabel(useCase.complianceContext.posture)}
        </span>
      </div>

      <div className="trust-map-chain" style={{ ["--trust-node-count" as string]: orderedNodes.length }}>
        {orderedNodes.map((node, index) => {
          const trustState = trustStateForNode(node);
          const selected = selectedNodeId === node.id;
          return (
            <div className="trust-map-chain-step" key={node.id}>
              <button
                className={`trust-map-node ${selected ? "selected" : ""}`}
                type="button"
                onClick={() => onSelectNode(node)}
              >
                <span className="trust-map-stage">{statusLabel(node.type)}</span>
                <strong>{businessNodeLabel(node)}</strong>
                <em>{node.description ?? technicalNodeLabel(node)}</em>
                <span className={`trust-state-pill ${trustStateTone(trustState)}`}>{trustState}</span>
              </button>
              {index < orderedNodes.length - 1 ? <span className="trust-map-connector" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UseCaseRail({
  selectedUseCaseId,
  useCases,
  onSelect,
}: {
  selectedUseCaseId: string;
  useCases: GovernanceUseCase[];
  onSelect: (useCase: GovernanceUseCase) => void;
}) {
  return (
    <aside className="trust-usecase-rail" aria-label="Use case switcher">
      <p className="eyebrow">Use Cases</p>
      {useCases.map((useCase) => {
        const selected = useCase.id === selectedUseCaseId;
        return (
          <button
            className={`trust-usecase-option ${selected ? "selected" : ""}`}
            key={useCase.id}
            type="button"
            onClick={() => onSelect(useCase)}
          >
            <span className={`trust-posture-dot ${statusTone(useCase.complianceContext.posture)}`} />
            <span>{useCase.name}</span>
          </button>
        );
      })}
    </aside>
  );
}

function EvidenceDrawer({
  node,
  onClose,
  onOpenAssetRegistry,
  useCase,
}: {
  node: BusinessTrustNode | null;
  onClose: () => void;
  onOpenAssetRegistry: () => void;
  useCase: GovernanceUseCase;
}) {
  if (!node) return null;

  const asset = findAssetForNode(useCase, node);
  const trustState = trustStateForNode(node);
  const upstream = asset?.upstreamSources?.[0] ?? useCase.sourceTables[0] ?? "Not mapped";
  const downstream = asset?.downstreamConsumers?.[0] ?? useCase.downstreamConsumers[0] ?? "Not mapped";
  const risk = asset?.openRisks?.[0] ?? (trustState === "Trusted" ? "No active risk" : "Evidence is partial for this stage.");

  return (
    <div className="trust-drawer-layer" role="dialog" aria-modal="true" aria-label={`${businessNodeLabel(node)} evidence`}>
      <button className="trust-drawer-scrim" type="button" aria-label="Close evidence drawer" onClick={onClose} />
      <aside className="trust-evidence-drawer">
        <button className="trust-drawer-close" type="button" onClick={onClose} aria-label="Close">
          X
        </button>
        <header>
          <span className="eyebrow">{statusLabel(node.type)}</span>
          <h3>{businessNodeLabel(node)}</h3>
          <span className={`trust-state-pill ${trustStateTone(trustState)}`}>{trustState}</span>
          <p>{node.description ?? "Governed stage in the operational KPI trust chain."}</p>
        </header>

        <section>
          <h4>Trust Posture</h4>
          <p>
            {trustState === "Not instrumented"
              ? "Source-level freshness is not yet connected. Raw landing and downstream dbt stages are governed."
              : `This stage is marked ${trustState.toLowerCase()} based on certification, freshness, and quality evidence.`}
          </p>
        </section>

        <section>
          <h4>Evidence Summary</h4>
          <dl className="trust-evidence-list">
            <div>
              <dt>Owner / Steward</dt>
              <dd>{asset ? `${asset.owner ?? "Unknown"} / ${asset.steward ?? "Unknown"}` : `${node.owner ?? useCase.owner} / ${node.steward ?? useCase.steward ?? "Unknown"}`}</dd>
            </div>
            <div>
              <dt>Certification</dt>
              <dd>{statusLabel(asset?.certification?.status ?? node.certificationStatus ?? "draft")}</dd>
            </div>
            <div>
              <dt>Freshness</dt>
              <dd>{statusLabel(asset?.freshnessStatus ?? node.freshnessStatus ?? "not_connected")}</dd>
            </div>
            <div>
              <dt>Quality posture</dt>
              <dd>{statusLabel(asset?.testStatus ?? node.qualityStatus ?? "not_connected")}</dd>
            </div>
            <div>
              <dt>Sensitivity</dt>
              <dd>
                <span className={`governance-classification-badge ${asset ? columnClassification(asset) : node.sensitivityClass ?? "unknown"}`}>
                  {asset ? columnClassification(asset) : node.sensitivityClass ?? "unknown"}
                </span>
                <span className="trust-sensitivity-note">Classification, not trust posture</span>
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h4>Lineage Summary</h4>
          <dl className="trust-evidence-list">
            <div>
              <dt>Upstream source</dt>
              <dd>{upstream}</dd>
            </div>
            <div>
              <dt>Current stage / asset</dt>
              <dd>{asset ? `${asset.schema}.${asset.table}` : technicalNodeLabel(node)}</dd>
            </div>
            <div>
              <dt>Downstream consumer</dt>
              <dd>{downstream}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h4>Risk</h4>
          <p>{risk}</p>
        </section>

        <div className="trust-drawer-actions">
          <button className="button secondary" type="button" onClick={onOpenAssetRegistry}>
            See technical trace
          </button>
          <button className="button primary" type="button" onClick={onOpenAssetRegistry}>
            See full asset detail
          </button>
        </div>
      </aside>
    </div>
  );
}

function AssetRegistryView({
  query,
  selectedAssetId,
  selectedUseCaseId,
  useCases,
  onQueryChange,
  onSelectAsset,
  onSelectUseCase,
}: {
  query: string;
  selectedAssetId: string | null;
  selectedUseCaseId: string;
  useCases: GovernanceUseCase[];
  onQueryChange: (query: string) => void;
  onSelectAsset: (assetId: string) => void;
  onSelectUseCase: (useCaseId: string) => void;
}) {
  const selectedUseCase = useCases.find((useCase) => useCase.id === selectedUseCaseId) ?? useCases[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredAssets = selectedUseCase.governedDatasets.filter((asset) => {
    const haystack = `${asset.name} ${asset.schema}.${asset.table} ${asset.businessMeaning} ${asset.owner ?? ""} ${asset.steward ?? ""}`.toLowerCase();
    return !normalizedQuery || haystack.includes(normalizedQuery);
  });
  const selectedAsset =
    selectedUseCase.governedDatasets.find((asset) => asset.id === selectedAssetId) ??
    filteredAssets[0] ??
    selectedUseCase.governedDatasets[0] ??
    null;

  return (
    <section className="asset-registry-workbench">
      <div className="governance-panel-head">
        <div>
          <p className="eyebrow">Asset Registry</p>
          <h2>Governed Assets And Technical Evidence</h2>
          <p className="section-subtitle">
            Data steward workflow for source tables, columns, quality, compliance, and dbt-backed technical lineage.
          </p>
        </div>
      </div>

      <div className="registry-toolbar">
        <label>
          <span className="eyebrow">Search</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search assets, owners, tables"
          />
        </label>
        <label>
          <span className="eyebrow">Use Case</span>
          <select value={selectedUseCase.id} onChange={(event) => onSelectUseCase(event.target.value)}>
            {useCases.map((useCase) => (
              <option key={useCase.id} value={useCase.id}>
                {useCase.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="asset-registry-layout">
        <div className="asset-card-grid">
          {filteredAssets.map((asset) => (
            <button
              className={`registry-asset-card ${selectedAsset?.id === asset.id ? "selected" : ""}`}
              key={asset.id}
              type="button"
              onClick={() => onSelectAsset(asset.id)}
            >
              <span className="governance-mini-pill">{assetTypeLabel(asset.assetType)}</span>
              <strong>{asset.name}</strong>
              <em>
                {asset.schema}.{asset.table}
              </em>
              <span className={`trust-state-pill ${statusTone(asset.certification?.status ?? "draft")}`}>
                {statusLabel(asset.certification?.status ?? "draft")}
              </span>
            </button>
          ))}
        </div>

        <article className="asset-detail-panel">
          {selectedAsset ? (
            <>
              <div className="governance-panel-head">
                <div>
                  <p className="eyebrow">{assetTypeLabel(selectedAsset.assetType)}</p>
                  <h3>{selectedAsset.name}</h3>
                  <p className="section-subtitle">{selectedAsset.businessMeaning}</p>
                </div>
                <span className={`governance-classification-badge ${columnClassification(selectedAsset)}`}>
                  {columnClassification(selectedAsset)}
                </span>
              </div>

              <div className="asset-detail-grid">
                <div>
                  <span className="eyebrow">Owner / Steward</span>
                  <strong>{selectedAsset.owner ?? "Unknown"} / {selectedAsset.steward ?? "Unknown"}</strong>
                </div>
                <div>
                  <span className="eyebrow">Certification</span>
                  <strong>{statusLabel(selectedAsset.certification?.status ?? "draft")}</strong>
                </div>
                <div>
                  <span className="eyebrow">Freshness</span>
                  <strong>{statusLabel(selectedAsset.freshnessStatus)}</strong>
                </div>
                <div>
                  <span className="eyebrow">Quality</span>
                  <strong>{statusLabel(selectedAsset.testStatus)}</strong>
                </div>
              </div>

              <div className="governance-dq-scorecard">
                {qualityDimensionEntries(selectedAsset).map(([dimension, status]) => (
                  <div className="governance-dq-cell" key={dimension}>
                    <span className="eyebrow">{dimension}</span>
                    <span className={`governance-status-pill ${statusTone(status)}`}>{statusLabel(status)}</span>
                  </div>
                ))}
              </div>

              <div className="registry-columns">
                <h4>Columns / Contract</h4>
                {(selectedAsset.columns ?? []).length > 0 ? (
                  <table className="governance-column-table">
                    <thead>
                      <tr>
                        <th>Column</th>
                        <th>Type</th>
                        <th>Classification</th>
                        <th>Workspace</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAsset.columns?.map((column) => (
                        <tr key={column.name}>
                          <td>
                            <code>{column.name}</code>
                          </td>
                          <td className="subtle">{column.dataType}</td>
                          <td>
                            <span className={`governance-classification-badge ${column.sensitivityClass}`}>
                              {column.sensitivityClass}
                            </span>
                          </td>
                          <td>{column.suppressedInWorkspace ? "Suppressed" : "Exposed"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  renderUnknown("Column inventory not configured.")
                )}
              </div>

              <div className="governance-legacy-grid">
                <DataQualitySummary modelFilters={selectedUseCase.diagnosticsScope?.qualityModels} />
                <SourceFreshness sourceFilters={selectedUseCase.diagnosticsScope?.freshnessSources} />
              </div>

              <div className="technical-lineage-panel">
                <div className="governance-panel-head">
                  <div>
                    <p className="eyebrow">Technical Lineage</p>
                    <h3>dbt-backed trace</h3>
                    <p className="section-subtitle">This uses the existing backend lineage service and LineageDAG component.</p>
                  </div>
                </div>
                <LineageDAG
                  modelName={selectedAsset.table}
                  layout="stacked"
                  declaredSources={selectedAsset.upstreamSources ?? selectedUseCase.sourceTables}
                />
              </div>
            </>
          ) : (
            renderUnknown("No governed assets match the current filters.")
          )}
        </article>
      </div>
    </section>
  );
}

function ClassificationPoliciesView({ useCases }: { useCases: GovernanceUseCase[] }) {
  const policies = useCases.flatMap((useCase) =>
    useCase.complianceContext.policies.map((policy) => ({ policy, useCase })),
  );

  return (
    <section className="classification-admin-view">
      <ClassificationInventory />
      <div className="classification-rule-panel">
        <div className="governance-panel-head">
          <div>
            <p className="eyebrow">Structured Policies</p>
            <h3>Compliance Controls</h3>
            <p className="section-subtitle">Policy evidence remains separate from sensitivity, confidence, review status, and action.</p>
          </div>
        </div>
        <table className="governance-policy-table">
          <thead>
            <tr>
              <th>Framework</th>
              <th>Control / Policy</th>
              <th>Evidence</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Next Review</th>
            </tr>
          </thead>
          <tbody>
            {policies.map(({ policy, useCase }) => (
              <tr key={`${useCase.id}-${policy.id}`}>
                <td>
                  <span className="governance-mini-pill">{policy.framework}</span>
                </td>
                <td>
                  <strong>{policy.policy}</strong>
                  <p className="subtle">{useCase.name}</p>
                </td>
                <td className="subtle">{policy.evidence}</td>
                <td className="subtle">{policy.owner}</td>
                <td>
                  <span className={`governance-status-pill ${statusTone(policy.status)}`}>{statusLabel(policy.status)}</span>
                </td>
                <td className="subtle">{policy.nextReviewDate ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DataDictionaryView({ useCases }: { useCases: GovernanceUseCase[] }) {
  const terms = useCases.flatMap((useCase) => useCase.dictionaryTerms.map((term) => ({ term, useCase })));

  return (
    <section className="dictionary-workbench">
      <div className="governance-panel-head">
        <div>
          <p className="eyebrow">Data Dictionary</p>
          <h2>Terms, Metrics, Owners, And Examples</h2>
          <p className="section-subtitle">Reference language is kept out of the Trust Map landing and available here for lookup.</p>
        </div>
      </div>
      <div className="governance-glossary-grid">
        {terms.map(({ term, useCase }) => (
          <article className="governance-glossary-card" key={`${useCase.id}-${term.id}`}>
            <div className="governance-card-topline">
              <span className="governance-mini-pill">{term.domain}</span>
              <span className={`governance-badge ${statusTone(term.status)}`}>{statusLabel(term.status)}</span>
            </div>
            <h4>{term.term}</h4>
            <p>{term.definition}</p>
            {term.synonyms && term.synonyms.length > 0 ? (
              <div className="governance-inline-list">
                {term.synonyms.map((synonym) => (
                  <span className="governance-mini-pill" key={synonym}>
                    {synonym}
                  </span>
                ))}
              </div>
            ) : null}
            {term.exampleUsage ? <p className="subtle">{term.exampleUsage}</p> : null}
            <div className="governance-term-meta">
              <span>
                Use case: <strong>{useCase.name}</strong>
              </span>
              <span>
                Owner: <strong>{term.owner ?? useCase.owner}</strong>
              </span>
              <span>
                Steward: <strong>{term.steward ?? useCase.steward}</strong>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function GovernanceControlTower() {
  const useCases = getGovernanceUseCases();
  const [mode, setMode] = useState<GovernanceMode>("trust-map");
  const [query, setQuery] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(useCases[0]?.governedDatasets[0]?.id ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState(useCases[0]?.id ?? "");

  const selectedUseCase =
    useCases.find((useCase) => useCase.id === selectedUseCaseId) ??
    useCases[0] ??
    null;
  const selectedNode =
    selectedUseCase?.trustMap.nodes.find((node) => node.id === selectedNodeId) ?? null;

  const handleSelectUseCase = (useCase: GovernanceUseCase) => {
    setSelectedUseCaseId(useCase.id);
    setSelectedAssetId(useCase.governedDatasets[0]?.id ?? null);
    setSelectedNodeId(null);
  };

  if (!selectedUseCase) {
    return renderUnknown("Governance metadata not yet configured.");
  }

  return (
    <div className="governance-control-tower trust-product-shell">
      <header className="trust-product-header">
        <div>
          <p className="eyebrow">OpenCare Governance</p>
          <h1>Can I trust this operational decision?</h1>
          <p>
            OpenCare traces every operational KPI from source system to transformation, quality checks, analytics output,
            dashboard, and operational decision, then shows whether it can be trusted.
          </p>
        </div>
        <nav className="trust-mode-switcher" aria-label="Governance views">
          {governanceModes.map((item) => (
            <button
              className={mode === item.key ? "active" : ""}
              key={item.key}
              type="button"
              onClick={() => {
                setMode(item.key);
                setSelectedNodeId(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {mode === "trust-map" ? (
        <>
          <TrustPostureStrip useCases={useCases} />
          <main className="trust-map-layout">
            <UseCaseRail
              selectedUseCaseId={selectedUseCase.id}
              useCases={useCases}
              onSelect={handleSelectUseCase}
            />
            <div className="trust-map-main">
              <TrustMapHero
                selectedNodeId={selectedNodeId}
                useCase={selectedUseCase}
                onSelectNode={(node) => {
                  setSelectedNodeId(node.id);
                  const asset = findAssetForNode(selectedUseCase, node);
                  if (asset) {
                    setSelectedAssetId(asset.id);
                  }
                }}
              />
              <div className="trust-map-primary-action">
                <button className="button primary" type="button" onClick={() => setMode("asset-registry")}>
                  Explore Asset Registry
                </button>
              </div>
            </div>
          </main>
          <EvidenceDrawer
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onOpenAssetRegistry={() => {
              setSelectedNodeId(null);
              setMode("asset-registry");
            }}
            useCase={selectedUseCase}
          />
        </>
      ) : null}

      {mode === "asset-registry" ? (
        <AssetRegistryView
          query={query}
          selectedAssetId={selectedAssetId}
          selectedUseCaseId={selectedUseCase.id}
          useCases={useCases}
          onQueryChange={setQuery}
          onSelectAsset={setSelectedAssetId}
          onSelectUseCase={(useCaseId) => {
            const nextUseCase = useCases.find((useCase) => useCase.id === useCaseId);
            if (nextUseCase) {
              handleSelectUseCase(nextUseCase);
            }
          }}
        />
      ) : null}

      {mode === "classification" ? <ClassificationPoliciesView useCases={useCases} /> : null}
      {mode === "dictionary" ? <DataDictionaryView useCases={useCases} /> : null}
    </div>
  );
}
