"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ClassificationInventory } from "@/components/ClassificationInventory";
import { DataQualitySummary } from "@/components/DataQualitySummary";
import { LineageDAG } from "@/components/LineageDAG";
import { SourceFreshness } from "@/components/SourceFreshness";
import {
  type BusinessTrustNode,
  type CertificationStatus,
  type ClassificationRule,
  type GovernanceStatus,
  type GovernanceUseCase,
  type GovernedDataset,
  type QualityDimensionStatus,
  getClassificationRules,
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

      <div className="trust-map-viewport" aria-label="Source to decision journey">
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

function SelectedUseCaseWorkspaceLinks({ useCase }: { useCase: GovernanceUseCase }) {
  return (
    <section className="trust-workspace-links" aria-label={`${useCase.name} governance workspace links`}>
      <div className="trust-workspace-links-header">
        <div>
          <p className="eyebrow">Use Case Workspace</p>
          <h3>{useCase.name}</h3>
          <p>{useCase.businessPurpose}</p>
        </div>
        <Link className="button secondary" href={useCase.workspacePath}>
          Open use-case workspace
        </Link>
      </div>
      <div className="trust-workspace-link-grid">
        {useCase.workspaceCoverage.map((item) => (
          <Link key={`${useCase.id}-${item.href}`} className="trust-workspace-link-card" href={item.href}>
            <strong>{item.label}</strong>
            <span>{item.href}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SelectedStagePanel({
  node,
  onOpenAssetRegistry,
  onToggleTechnicalTrace,
  showTechnicalTrace,
  useCase,
}: {
  node: BusinessTrustNode | null;
  onOpenAssetRegistry: () => void;
  onToggleTechnicalTrace: () => void;
  showTechnicalTrace: boolean;
  useCase: GovernanceUseCase;
}) {
  if (!node) return null;

  const asset = findAssetForNode(useCase, node);
  const trustState = trustStateForNode(node);
  const upstream = asset?.upstreamSources?.[0] ?? useCase.sourceTables[0] ?? "Not mapped";
  const downstream = asset?.downstreamConsumers?.[0] ?? useCase.downstreamConsumers[0] ?? "Not mapped";
  const risk = asset?.openRisks?.[0] ?? (trustState === "Trusted" ? "No active risk" : "Evidence is partial for this stage.");
  const technicalModel = asset?.table ?? useCase.lineageEntryPoints[0]?.technicalModel ?? "";

  return (
    <section className="trust-stage-panel" aria-label={`${businessNodeLabel(node)} evidence`}>
      <div className="trust-stage-panel-header">
        <div>
          <p className="eyebrow">{statusLabel(node.type)} evidence</p>
          <h3>{businessNodeLabel(node)}</h3>
          <p>{node.description ?? "Governed stage in the operational KPI trust chain."}</p>
        </div>
        <span className={`trust-state-pill ${trustStateTone(trustState)}`}>{trustState}</span>
      </div>

      <div className="trust-stage-panel-grid">
        <article>
          <span className="eyebrow">What This Stage Represents</span>
          <p>
            {asset?.businessMeaning ??
              `${businessNodeLabel(node)} is part of the source-to-decision evidence chain for ${useCase.name}.`}
          </p>
        </article>
        <article>
          <span className="eyebrow">Trust Posture</span>
          <p>
            {trustState === "Not instrumented"
              ? "Source-level freshness is not yet connected. Raw landing and downstream dbt stages are governed."
              : `This stage is ${trustState.toLowerCase()} based on certification, freshness, and quality evidence.`}
          </p>
        </article>
        <article>
          <span className="eyebrow">Evidence Summary</span>
          <dl className="trust-evidence-list">
            <div>
              <dt>Certification</dt>
              <dd>{statusLabel(asset?.certification?.status ?? node.certificationStatus ?? "draft")}</dd>
            </div>
            <div>
              <dt>Freshness</dt>
              <dd>{statusLabel(asset?.freshnessStatus ?? node.freshnessStatus ?? "not_connected")}</dd>
            </div>
            <div>
              <dt>Quality</dt>
              <dd>{statusLabel(asset?.testStatus ?? node.qualityStatus ?? "not_connected")}</dd>
            </div>
          </dl>
        </article>
        <article>
          <span className="eyebrow">Sensitivity Classification</span>
          <span className={`governance-classification-badge ${asset ? columnClassification(asset) : node.sensitivityClass ?? "unknown"}`}>
            {asset ? columnClassification(asset) : node.sensitivityClass ?? "unknown"}
          </span>
          <p className="trust-sensitivity-note">This controls handling. It is separate from trust posture.</p>
        </article>
      </div>

      <div className="trust-stage-lineage">
        <div>
          <span className="eyebrow">Upstream</span>
          <strong>{upstream}</strong>
        </div>
        <div>
          <span className="eyebrow">Current Stage / Asset</span>
          <strong>{asset ? `${asset.schema}.${asset.table}` : technicalNodeLabel(node)}</strong>
        </div>
        <div>
          <span className="eyebrow">Downstream</span>
          <strong>{downstream}</strong>
        </div>
      </div>

      <div className="trust-stage-risk-row">
        <div>
          <span className="eyebrow">Risk Or Missing Evidence</span>
          <p>{risk}</p>
        </div>
        <div className="trust-stage-actions">
          <button className="button secondary" type="button" onClick={onToggleTechnicalTrace}>
            {showTechnicalTrace ? "Hide technical trace" : "See technical trace"}
          </button>
          <button className="button primary" type="button" onClick={onOpenAssetRegistry}>
            See full asset detail
          </button>
        </div>
      </div>

      {showTechnicalTrace && technicalModel ? (
        <div className="trust-stage-technical-trace">
          <LineageDAG
            modelName={technicalModel}
            layout="stacked"
            declaredSources={asset?.upstreamSources ?? useCase.sourceTables}
          />
        </div>
      ) : null}
    </section>
  );
}

function stageGroupForAsset(asset: GovernedDataset) {
  if (asset.assetType === "source") return "Source";
  if (asset.schema === "staging") return "Staging";
  if (asset.schema === "analytics") return "Analytics";
  if (asset.schema === "output" || asset.assetType === "output") return "Output";
  if (asset.assetType === "decision") return "Decision";
  if (asset.assetType === "dictionary") return "Dictionary";
  return assetTypeLabel(asset.assetType);
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
  const assetZones = Array.from(
    filteredAssets.reduce((zones, asset) => {
      const group = stageGroupForAsset(asset);
      zones.set(group, [...(zones.get(group) ?? []), asset]);
      return zones;
    }, new Map<string, GovernedDataset[]>()),
  );
  const warningCount = filteredAssets.filter(
    (asset) =>
      ["warning", "stale", "failing", "partial", "missing", "not_connected"].includes(asset.freshnessStatus) ||
      ["warning", "stale", "failing", "partial", "missing", "not_connected"].includes(asset.testStatus) ||
      ["warning", "stale", "failing", "partial", "missing", "not_connected"].includes(asset.lineageStatus),
  ).length;

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

      <div className="asset-registry-matrix" aria-label="Asset landscape matrix">
        <article className="asset-registry-zone-card primary">
          <span className="eyebrow">Selected Use Case</span>
          <strong>{selectedUseCase.name}</strong>
          <p>{filteredAssets.length} governed assets visible after filters.</p>
        </article>
        {assetZones.map(([group, assets]) => (
          <article className="asset-registry-zone-card" key={group}>
            <span className="eyebrow">{group}</span>
            <strong>{assets.length}</strong>
            <p>
              {assets.filter((asset) => statusTone(asset.certification?.status ?? "draft") === "positive").length} certified or reviewed
            </p>
          </article>
        ))}
        <article className="asset-registry-zone-card">
          <span className="eyebrow">Warnings</span>
          <strong>{warningCount}</strong>
          <p>Assets with freshness, quality, or lineage gaps.</p>
        </article>
      </div>

      <div className="asset-registry-layout">
        <div className="asset-list-zone">
          <div className="asset-list-zone-head">
            <div>
              <p className="eyebrow">Asset Landscape</p>
              <h3>Grouped By Pipeline Stage</h3>
            </div>
            <span className="governance-mini-pill">{filteredAssets.length} assets</span>
          </div>
          <div className="asset-card-grid">
            {assetZones.map(([group, assets]) => (
              <section className="asset-stage-group" key={group}>
                <div className="asset-stage-group-head">
                  <span className="eyebrow">{group}</span>
                  <span>{assets.length}</span>
                </div>
                {assets.map((asset) => (
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
              </section>
            ))}
          </div>
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

              <div className="asset-contract-zone">
                <article>
                  <span className="eyebrow">Lineage Summary</span>
                  <p>{selectedAsset.lineageSummary?.[0] ?? "Lineage is represented through the existing dbt-backed lineage service."}</p>
                </article>
                <article>
                  <span className="eyebrow">Open Risk</span>
                  <p>{selectedAsset.openRisks?.[0] ?? "No active risk"}</p>
                </article>
                <article>
                  <span className="eyebrow">Consumers</span>
                  <p>{selectedAsset.downstreamConsumers?.join(", ") || selectedAsset.consumers.join(", ") || "No mapped consumers"}</p>
                </article>
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
              <div className="asset-steward-actions" aria-label="Asset steward actions">
                <button className="button secondary" type="button">Review metadata</button>
                <button className="button secondary" type="button">Assign steward</button>
                <button className="button primary" type="button">Open lineage evidence</button>
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
  const [classificationRules, setClassificationRules] = useState<ClassificationRule[]>(() => getClassificationRules());
  const [selectedRuleId, setSelectedRuleId] = useState(classificationRules[0]?.id ?? "");
  const [savedRuleId, setSavedRuleId] = useState<string | null>(null);
  const selectedRule = classificationRules.find((rule) => rule.id === selectedRuleId) ?? classificationRules[0] ?? null;

  const updateSelectedRule = (updates: Partial<ClassificationRule>) => {
    if (!selectedRule) return;
    setClassificationRules((rules) =>
      rules.map((rule) => (rule.id === selectedRule.id ? { ...rule, ...updates } : rule)),
    );
  };

  return (
    <section className="classification-admin-view">
      <div className="classification-workspace-shell">
        <div className="governance-panel-head">
          <div>
            <p className="eyebrow">Classification & Policies</p>
            <h2>Column Review Queue And Policy Evidence</h2>
            <p className="section-subtitle">
              Sensitivity, review status, confidence, and policy action stay separate so inferred logic cannot enforce by accident.
            </p>
          </div>
          <span className="governance-mini-pill">Review-first</span>
        </div>
        <ClassificationInventory />
      </div>
      <div className="classification-rule-panel">
        <div className="governance-panel-head">
          <div>
            <p className="eyebrow">Classification Policies</p>
            <h3>Active Pattern Rules</h3>
            <p className="section-subtitle">Approved patterns are visible and editable here before any enforcement policy consumes them.</p>
          </div>
          <span className="governance-mini-pill">Editable draft</span>
        </div>
        <div className="classification-policy-workbench">
          <div className="classification-policy-list" aria-label="Classification policy rules">
            {classificationRules.map((rule) => (
              <button
                className={`classification-policy-card ${selectedRule?.id === rule.id ? "selected" : ""}`}
                key={rule.id}
                type="button"
                onClick={() => setSelectedRuleId(rule.id)}
              >
                <div className="governance-card-topline">
                  <span className="governance-mini-pill">Policy</span>
                  <span className={`governance-classification-badge ${rule.classification}`}>{rule.classification}</span>
                </div>
                <h4>{rule.name}</h4>
                <dl className="classification-detail-list">
                  <div>
                    <dt>Pattern</dt>
                    <dd>
                      <code>{rule.matchPattern}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>{statusLabel(rule.scope)}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>Review only until steward approved</dd>
                  </div>
                </dl>
                <p>{rule.rationale}</p>
              </button>
            ))}
          </div>

          <aside className="classification-policy-editor" aria-label="Selected classification policy editor">
            {selectedRule ? (
              <>
                <div className="governance-card-topline">
                  <span className="governance-mini-pill">Selected Rule</span>
                  <span className={`governance-classification-badge ${selectedRule.classification}`}>
                    {selectedRule.classification}
                  </span>
                </div>
                <label>
                  <span className="eyebrow">Rule Name</span>
                  <input
                    value={selectedRule.name}
                    onChange={(event) => updateSelectedRule({ name: event.target.value })}
                  />
                </label>
                <label>
                  <span className="eyebrow">Pattern</span>
                  <input
                    value={selectedRule.matchPattern}
                    onChange={(event) => updateSelectedRule({ matchPattern: event.target.value })}
                  />
                </label>
                <div className="classification-policy-editor-row">
                  <label>
                    <span className="eyebrow">Classification</span>
                    <select
                      value={selectedRule.classification}
                      onChange={(event) =>
                        updateSelectedRule({ classification: event.target.value as ClassificationRule["classification"] })
                      }
                    >
                      <option value="public">public</option>
                      <option value="internal">internal</option>
                      <option value="sensitive">sensitive</option>
                      <option value="restricted">restricted</option>
                    </select>
                  </label>
                  <label>
                    <span className="eyebrow">Scope</span>
                    <select
                      value={selectedRule.scope}
                      onChange={(event) => updateSelectedRule({ scope: event.target.value as ClassificationRule["scope"] })}
                    >
                      <option value="column_name">column name</option>
                      <option value="field_usage">field usage</option>
                    </select>
                  </label>
                </div>
                <label>
                  <span className="eyebrow">Rationale</span>
                  <textarea
                    value={selectedRule.rationale}
                    onChange={(event) => updateSelectedRule({ rationale: event.target.value })}
                  />
                </label>
                <p className="classification-safety-note">
                  Edits are visible in this admin session only. Backend persistence and approval workflow remain a separate governance API change.
                </p>
                <div className="classification-action-grid">
                  <button className="button primary" type="button" onClick={() => setSavedRuleId(selectedRule.id)}>
                    Save draft
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      setClassificationRules(getClassificationRules());
                      setSavedRuleId(null);
                    }}
                  >
                    Reset rules
                  </button>
                  <button className="button secondary" type="button">Submit for approval</button>
                </div>
                {savedRuleId === selectedRule.id ? (
                  <p className="subtle">Draft saved in this session. Persistence will require the governance policy API.</p>
                ) : null}
              </>
            ) : (
              renderUnknown("Select a classification policy rule to edit.")
            )}
          </aside>
        </div>
      </div>
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

export function GovernanceControlTower({
  useCases = getGovernanceUseCases(),
}: {
  useCases?: GovernanceUseCase[];
}) {
  const [mode, setMode] = useState<GovernanceMode>("trust-map");
  const [query, setQuery] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(useCases[0]?.governedDatasets[0]?.id ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTechnicalTrace, setShowTechnicalTrace] = useState(false);
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
    setShowTechnicalTrace(false);
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
                setShowTechnicalTrace(false);
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
                  setShowTechnicalTrace(false);
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
              <SelectedUseCaseWorkspaceLinks useCase={selectedUseCase} />
              <SelectedStagePanel
                node={selectedNode}
                onOpenAssetRegistry={() => {
                  setMode("asset-registry");
                  setShowTechnicalTrace(false);
                }}
                onToggleTechnicalTrace={() => setShowTechnicalTrace((current) => !current)}
                showTechnicalTrace={showTechnicalTrace}
                useCase={selectedUseCase}
              />
            </div>
          </main>
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
