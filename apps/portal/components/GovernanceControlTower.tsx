"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ClassificationInventory } from "@/components/ClassificationInventory";
import { DataQualitySummary } from "@/components/DataQualitySummary";
import { LineageDAG } from "@/components/LineageDAG";
import { SourceFreshness } from "@/components/SourceFreshness";
import {
  type BusinessTrustNode,
  type ClassificationRule,
  type DictionaryTerm,
  type GovernanceStatus,
  type GovernanceUseCase,
  type GovernedDataset,
  type QualityDimensionStatus,
  type ScopeCoverage,
  getClassificationRules,
  getGovernanceOverview,
  getGovernanceUseCases,
} from "@/lib/governance-registry";

type ScopeFilter = "all" | ScopeCoverage;
type GovernanceTab =
  | "overview"
  | "contracts"
  | "glossary"
  | "assets"
  | "lineage"
  | "quality"
  | "compliance"
  | "classification";
type LineageMode = "business" | "technical";

const scopeLabels: Array<{ key: ScopeFilter; label: string; tab: GovernanceTab }> = [
  { key: "classification", label: "Classification", tab: "classification" },
  { key: "all", label: "All", tab: "overview" },
  { key: "use_cases", label: "Use Cases", tab: "contracts" },
  { key: "assets", label: "Assets", tab: "assets" },
  { key: "glossary", label: "Glossary", tab: "glossary" },
  { key: "lineage", label: "Lineage", tab: "lineage" },
  { key: "quality", label: "Quality", tab: "quality" },
  { key: "compliance", label: "Compliance", tab: "compliance" },
];

const tabLabels: Array<{ key: GovernanceTab; label: string; description: string }> = [
  {
    key: "classification",
    label: "Classification",
    description: "Column-level classification inventory, confidence, evidence, review state, and curated rules.",
  },
  {
    key: "overview",
    label: "Overview",
    description: "Product-facing governance summary with the curated Data Trust Map and primary trust signals.",
  },
  {
    key: "contracts",
    label: "Contracts",
    description: "Business purpose, workspace coverage, downstream consumers, and use-case contract definition.",
  },
  {
    key: "glossary",
    label: "Glossary",
    description: "Business-readable definitions, synonyms, and steward-owned language for each governed domain.",
  },
  {
    key: "assets",
    label: "Assets",
    description: "Governed datasets, runtime outputs, trust metadata, and asset-by-asset operational context.",
  },
  {
    key: "lineage",
    label: "Lineage",
    description: "Curated business trust map plus technical lineage powered by the existing dbt-backed DAG.",
  },
  {
    key: "quality",
    label: "Quality",
    description: "Freshness, quality dimensions, record specs, and evidence-backed trust gaps surfaced honestly.",
  },
  {
    key: "compliance",
    label: "Compliance",
    description: "Structured governance policies, evidence, owners, and review dates by use case.",
  },
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

function statusTone(status: GovernanceStatus | string) {
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
    case "sensitive":
    case "internal":
    case "public":
    case "not_assessed":
    case "not_connected":
    case "unknown":
    default:
      return "neutral";
  }
}

function statusLabel(status: GovernanceStatus | string) {
  return String(status).replaceAll("_", " ");
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

function searchMatchesUseCase(useCase: GovernanceUseCase, query: string) {
  const haystack = [
    useCase.name,
    useCase.domain,
    useCase.description,
    useCase.businessPurpose,
    useCase.owner,
    useCase.steward,
    ...useCase.workspaceCoverage.map((item) => item.label),
    ...useCase.governedDatasets.flatMap((dataset) => [
      dataset.name,
      `${dataset.schema}.${dataset.table}`,
      dataset.businessMeaning,
      ...(dataset.columns?.map((column) => column.name) ?? []),
    ]),
    ...useCase.dictionaryTerms.flatMap((term) => [
      term.term,
      term.definition,
      ...(term.synonyms ?? []),
      term.exampleUsage,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function scopeMatchesUseCase(useCase: GovernanceUseCase, scope: ScopeFilter) {
  switch (scope) {
    case "all":
    case "use_cases":
      return true;
    case "assets":
      return useCase.governedDatasets.length > 0;
    case "glossary":
      return useCase.dictionaryTerms.length > 0;
    case "lineage":
      return useCase.lineageEntryPoints.length > 0 || useCase.trustMap.nodes.length > 0;
    case "quality":
      return useCase.governedDatasets.some((dataset) => Boolean(dataset.qualityDimensions));
    case "compliance":
      return useCase.complianceContext.policies.length > 0;
    case "classification":
      return useCase.governedDatasets.some((dataset) => (dataset.columns?.length ?? 0) > 0);
    default:
      return true;
  }
}

function countConnectedAssets(useCase: GovernanceUseCase) {
  return useCase.governedDatasets.filter(
    (dataset) => dataset.lineageStatus === "complete" || dataset.lineageStatus === "partial",
  ).length;
}

function recordCoverage(useCase: GovernanceUseCase) {
  return `${useCase.governedDatasets.filter((dataset) => dataset.recordSpecStatus === "complete").length}/${useCase.governedDatasets.length}`;
}

function missingMetadata(asset: GovernedDataset) {
  const gaps: string[] = [];
  if (!asset.owner || !asset.steward) gaps.push("owner or steward");
  if (!asset.columns || asset.columns.length === 0) gaps.push("column inventory");
  if (!asset.certification) gaps.push("certification");
  if (!asset.qualityDimensions) gaps.push("quality dimensions");
  if (!asset.relatedDashboards || asset.relatedDashboards.length === 0) gaps.push("dashboard links");
  return gaps;
}

function renderUnknown(message: string) {
  return <div className="governance-empty-state">{message}</div>;
}

function qualityDimensionEntries(asset: GovernedDataset) {
  return Object.entries(asset.qualityDimensions ?? {}) as [string, QualityDimensionStatus][];
}

function TrustContextBreadcrumb({
  useCase,
  assetLabel,
}: {
  useCase: GovernanceUseCase;
  assetLabel?: string | null;
}) {
  return (
    <div className="governance-breadcrumb">
      <span>{useCase.domain}</span>
      <span className="governance-breadcrumb-sep">&gt;</span>
      <span>{useCase.name}</span>
      {assetLabel ? (
        <>
          <span className="governance-breadcrumb-sep">&gt;</span>
          <span>{assetLabel}</span>
        </>
      ) : null}
    </div>
  );
}

function BusinessTrustMapView({
  useCase,
  selectedNodeId,
  onSelectNode,
}: {
  useCase: GovernanceUseCase;
  selectedNodeId: string | null;
  onSelectNode: (node: BusinessTrustNode) => void;
}) {
  return (
    <section className="governance-trust-map-shell">
      <div className="governance-panel-head">
        <div>
          <p className="eyebrow">Data Trust Map</p>
          <h3>{useCase.trustMap.title}</h3>
          <p className="section-subtitle">{useCase.trustMap.summary}</p>
        </div>
        <span className="governance-mini-pill">Curated business view</span>
      </div>
      <div className="governance-trust-map">
        {trustMapOrder.map((stage) => {
          const stageNodes = useCase.trustMap.nodes.filter((node) => node.type === stage);
          if (stageNodes.length === 0) {
            return null;
          }
          return (
            <div className="governance-trust-column" key={stage}>
              <div className="governance-trust-column-head">
                <span className="eyebrow">{statusLabel(stage)}</span>
              </div>
              <div className="governance-trust-column-body">
                {stageNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={`governance-trust-node ${selectedNodeId === node.id ? "selected" : ""}`}
                    onClick={() => onSelectNode(node)}
                  >
                    <div className="governance-card-topline">
                      <span className="governance-mini-pill">{statusLabel(node.type)}</span>
                      {node.sensitivityClass ? (
                        <span className={`governance-classification-badge ${node.sensitivityClass}`}>
                          {node.sensitivityClass}
                        </span>
                      ) : null}
                    </div>
                    <strong>{node.label}</strong>
                    {node.description ? <p>{node.description}</p> : null}
                    <div className="governance-inline-list">
                      {node.freshnessStatus ? (
                        <span className={`governance-status-pill ${statusTone(node.freshnessStatus)}`}>
                          {statusLabel(node.freshnessStatus)}
                        </span>
                      ) : null}
                      {node.certificationStatus ? (
                        <span className={`governance-status-pill ${statusTone(node.certificationStatus)}`}>
                          {statusLabel(node.certificationStatus)}
                        </span>
                      ) : null}
                      {node.qualityStatus ? (
                        <span className={`governance-status-pill ${statusTone(node.qualityStatus)}`}>
                          Tests {statusLabel(node.qualityStatus)}
                        </span>
                      ) : null}
                    </div>
                    {node.uses && node.uses.length > 0 ? (
                      <div className="governance-inline-list">
                        {node.uses.slice(0, 2).map((item) => (
                          <span className="governance-mini-pill" key={`${node.id}-${item}`}>
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="governance-trust-flow">
        {useCase.trustMap.edges.map((edge) => {
          const fromNode = useCase.trustMap.nodes.find((node) => node.id === edge.from);
          const toNode = useCase.trustMap.nodes.find((node) => node.id === edge.to);
          if (!fromNode || !toNode) return null;
          return (
            <div className="governance-trust-flow-item" key={`${edge.from}-${edge.to}`}>
              <span>{fromNode.label}</span>
              <strong>&rarr;</strong>
              <span>{toNode.label}</span>
              {edge.label ? <em>{edge.label}</em> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TrustDrawer({
  useCase,
  asset,
}: {
  useCase: GovernanceUseCase;
  asset: GovernedDataset | null;
}) {
  const classification = asset ? columnClassification(asset) : "unknown";
  const policyCoverage = useCase.complianceContext.policies.length;
  const gaps = asset ? missingMetadata(asset) : [];

  return (
    <aside className="governance-trust-drawer governance-trust-sidebar">
      <div className="governance-panel-head">
        <div>
          <p className="eyebrow">Trust Drawer</p>
          <h3>Trust context: {useCase.name}</h3>
          <p className="section-subtitle">{asset ? `${useCase.name} / ${asset.name}` : `${useCase.name} / Use case contract`}</p>
        </div>
        <span className={`governance-badge ${statusTone(asset?.certification?.status ?? useCase.complianceContext.posture)}`}>
          {statusLabel(asset?.certification?.status ?? useCase.complianceContext.posture)}
        </span>
      </div>

      <div className="governance-drawer-grid">
        <div className="governance-drawer-block">
          <h4>Owner / Steward</h4>
          <p>{asset ? `${asset.owner ?? "Unknown"} / ${asset.steward ?? "Unknown"}` : `${useCase.owner} / ${useCase.steward ?? "Unknown"}`}</p>
        </div>
        <div className="governance-drawer-block">
          <h4>Certification</h4>
          {asset?.certification ? (
            <div className="governance-inline-list">
              <span className={`governance-status-pill ${statusTone(asset.certification.status)}`}>
                {statusLabel(asset.certification.status)}
              </span>
              {asset.certification.certifiedDate ? (
                <span className="governance-mini-pill">Since {asset.certification.certifiedDate}</span>
              ) : null}
            </div>
          ) : (
            <p>{asset ? "Certification metadata not configured." : "Use-case level governance posture only."}</p>
          )}
        </div>
        <div className="governance-drawer-block">
          <h4>Freshness / Quality</h4>
          <div className="governance-inline-list">
            <span className={`governance-status-pill ${statusTone(asset?.freshnessStatus ?? useCase.qualitySummary.freshness)}`}>
              Freshness {statusLabel(asset?.freshnessStatus ?? useCase.qualitySummary.freshness)}
            </span>
            <span className={`governance-status-pill ${statusTone(asset?.testStatus ?? useCase.qualitySummary.quality)}`}>
              Quality {statusLabel(asset?.testStatus ?? useCase.qualitySummary.quality)}
            </span>
          </div>
        </div>
        <div className="governance-drawer-block">
          <h4>Sensitivity</h4>
          {asset ? (
            <div className="governance-inline-list">
              <span className={`governance-classification-badge ${classification === "unknown" ? "internal" : classification}`}>
                {classification === "unknown" ? "unknown" : classification}
              </span>
              <span className="governance-mini-pill">{asset.columns?.length ?? 0} columns mapped</span>
            </div>
          ) : (
            <p>Use-case coverage spans both internal and sensitive assets depending on the selected dataset.</p>
          )}
        </div>
        <div className="governance-drawer-block">
          <h4>Policy Coverage</h4>
          <div className="governance-inline-list">
            <span className="governance-mini-pill">{policyCoverage} mapped policies</span>
            {useCase.complianceContext.policies.map((policy) => (
              <span className={`governance-status-pill ${statusTone(policy.status)}`} key={policy.id}>
                {policy.framework} {statusLabel(policy.status)}
              </span>
            ))}
          </div>
        </div>
        <div className="governance-drawer-block">
          <h4>Upstream Sources</h4>
          <div className="governance-inline-list">
            {(asset?.upstreamSources ?? useCase.sourceTables).map((item) => (
              <span className="governance-mini-pill" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="governance-drawer-block">
          <h4>Downstream Consumers</h4>
          <div className="governance-inline-list">
            {(asset?.downstreamConsumers ?? useCase.downstreamConsumers).map((item) => (
              <span className="governance-mini-pill" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="governance-drawer-block">
          <h4>Related Dashboards / KPIs</h4>
          {(asset?.relatedDashboards ?? []).length > 0 ? (
            <div className="governance-inline-list">
              {asset?.relatedDashboards?.map((item) => (
                <span className="governance-mini-pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p>{asset ? "No dashboard links mapped yet." : "Select an asset to inspect dashboard and KPI relationships."}</p>
          )}
        </div>
        <div className="governance-drawer-block">
          <h4>Open Risks / Missing Metadata</h4>
          {(asset?.openRisks?.length ?? 0) > 0 || gaps.length > 0 ? (
            <ul className="governance-bullet-list">
              {asset?.openRisks?.map((risk) => <li key={risk}>{risk}</li>)}
              {gaps.map((gap) => <li key={gap}>Missing {gap}</li>)}
            </ul>
          ) : (
            <p>No material governance gaps are highlighted for the current context.</p>
          )}
        </div>
        <div className="governance-drawer-block">
          <h4>Column Inventory</h4>
          {(asset?.columns ?? []).length > 0 ? (
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
                {asset?.columns?.map((column) => (
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
      </div>
    </aside>
  );
}

export function GovernanceControlTower() {
  const useCases = getGovernanceUseCases();
  const overview = getGovernanceOverview();
  const classificationRules = getClassificationRules();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("classification");
  const [domain, setDomain] = useState<GovernanceUseCase["domain"] | "All domains">("All domains");
  const [activeUseCaseId, setActiveUseCaseId] = useState(useCases[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<GovernanceTab>("classification");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(useCases[0]?.governedDatasets[0]?.id ?? null);
  const [selectedTrustNodeId, setSelectedTrustNodeId] = useState<string | null>(useCases[0]?.trustMap.focusNodeId ?? null);
  const [lineageMode, setLineageMode] = useState<LineageMode>("business");

  const availableTabs = useMemo(
    () =>
      tabLabels.filter((tab) => {
        if (tab.key === "classification") {
          return classificationRules.length > 0;
        }
        return true;
      }),
    [classificationRules.length],
  );

  const filteredUseCases = useMemo(() => {
    return useCases.filter((useCase) => {
      if (domain !== "All domains" && useCase.domain !== domain) {
        return false;
      }
      if (!scopeMatchesUseCase(useCase, scope)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return searchMatchesUseCase(useCase, query);
    });
  }, [domain, query, scope, useCases]);

  const activeUseCase =
    filteredUseCases.find((useCase) => useCase.id === activeUseCaseId) ??
    filteredUseCases[0] ??
    useCases[0] ??
    null;

  useEffect(() => {
    if (!activeUseCase) {
      return;
    }
    if (activeUseCase.id !== activeUseCaseId) {
      setActiveUseCaseId(activeUseCase.id);
    }
  }, [activeUseCase, activeUseCaseId]);

  useEffect(() => {
    if (!activeUseCase) {
      return;
    }
    const hasAsset = activeUseCase.governedDatasets.some((dataset) => dataset.id === selectedAssetId);
    if (!hasAsset) {
      setSelectedAssetId(activeUseCase.governedDatasets[0]?.id ?? null);
    }
    const hasNode = activeUseCase.trustMap.nodes.some((node) => node.id === selectedTrustNodeId);
    if (!hasNode) {
      setSelectedTrustNodeId(activeUseCase.trustMap.focusNodeId ?? activeUseCase.trustMap.nodes[0]?.id ?? null);
    }
  }, [activeUseCase, selectedAssetId, selectedTrustNodeId]);

  const selectedAsset =
    activeUseCase?.governedDatasets.find((dataset) => dataset.id === selectedAssetId) ??
    activeUseCase?.governedDatasets[0] ??
    null;

  const selectedTrustNode =
    activeUseCase?.trustMap.nodes.find((node) => node.id === selectedTrustNodeId) ?? null;

  const assetLabel = selectedAsset?.name ?? selectedTrustNode?.label ?? null;
  const activeTabMeta = availableTabs.find((tab) => tab.key === activeTab) ?? availableTabs[0];

  const matchingGlossaryTerms = useMemo(() => {
    if (!activeUseCase) return [];
    const terms = activeUseCase.dictionaryTerms;
    if (!query) return terms;
    return terms.filter((term) =>
      `${term.term} ${term.definition} ${(term.synonyms ?? []).join(" ")} ${term.exampleUsage ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  }, [activeUseCase, query]);

  const relatedTermsById = useMemo(
    () => new Map((activeUseCase?.dictionaryTerms ?? []).map((term) => [term.id, term])),
    [activeUseCase],
  );

  const selectedLineageModel =
    activeUseCase?.lineageEntryPoints[0]?.technicalModel ??
    selectedAsset?.table ??
    null;

  const handleUseCaseSelect = (useCase: GovernanceUseCase) => {
    setActiveUseCaseId(useCase.id);
    setSelectedAssetId(useCase.governedDatasets[0]?.id ?? null);
    setSelectedTrustNodeId(useCase.trustMap.focusNodeId ?? useCase.trustMap.nodes[0]?.id ?? null);
  };

  const handleTrustNodeSelect = (node: BusinessTrustNode) => {
    setSelectedTrustNodeId(node.id);
    if (node.assetId) {
      setSelectedAssetId(node.assetId);
    }
  };

  if (!activeUseCase) {
    return renderUnknown("Governance metadata not yet configured.");
  }

  const resolveRelatedTerms = (relatedTermIds?: string[]) =>
    (relatedTermIds ?? [])
      .map((relatedId) => relatedTermsById.get(relatedId))
      .filter((term): term is DictionaryTerm => Boolean(term));

  return (
    <div className="governance-control-tower">
      <section className="governance-summary-grid">
        {[
          ["Use Cases Covered", overview.useCasesCovered, "Operational governance coverage across active OpenCare products."],
          ["Certified Assets", overview.certifiedAssets, "Governed assets with reviewed or certified trust metadata."],
          ["Classified Columns", overview.classifiedColumns, "Fields classified as public, internal, sensitive, or restricted."],
          ["Policies Mapped", overview.policiesMapped, "Structured governance and compliance policy coverage."],
          ["Quality Checks", overview.qualityChecksRepresented, "Assets carrying explicit quality dimensions and trust evidence."],
          ["Glossary Coverage", overview.glossaryCoverage, "Business vocabulary and steward-owned definitions mapped to products."],
          ["Lineage Coverage", overview.lineageCoverage, "Assets with complete or partial lineage represented in governance."],
          ["High-Risk Assets", overview.highRiskAssets, "Assets carrying open risk markers, stale freshness, or failing trust signals."],
        ].map(([label, value, note]) => (
          <article className="governance-stat-card" key={label}>
            <p className="eyebrow">{label}</p>
            <strong>{value}</strong>
            <p>{note}</p>
          </article>
        ))}
      </section>

      <section className="governance-discovery-shell">
        <div className="governance-discovery-row">
          <label className="governance-search-shell">
            <span className="eyebrow">Discovery</span>
            <input
              className="governance-search-input"
              type="search"
              placeholder="Search assets, glossary terms, stewards, and trust context..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="governance-domain-filter">
            <span className="eyebrow">Domain</span>
            <select
              value={domain}
              onChange={(event) =>
                setDomain(event.target.value as GovernanceUseCase["domain"] | "All domains")
              }
            >
              <option>All domains</option>
              <option>Clinical Operations</option>
              <option>Financial Operations</option>
              <option>Platform Administration</option>
            </select>
          </label>
        </div>
        <div className="governance-chip-row">
          {scopeLabels.map((item) => (
            <button
              key={item.key}
              className={`governance-chip ${scope === item.key ? "active" : ""}`}
              type="button"
              onClick={() => {
                setScope(item.key);
                setActiveTab(item.tab);
                if (item.tab === "lineage") {
                  setLineageMode("business");
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="governance-search-note">
          {query
            ? `${filteredUseCases.length} use cases match, with ${matchingGlossaryTerms.length} glossary terms visible in the current context.`
            : "Governance metadata is registry-backed and curated for product trust storytelling. Technical lineage continues to come from the existing backend DAG."}
        </div>
      </section>

      {activeTab === "classification" ? (
        <section className="governance-classification-workbench">
          <ClassificationInventory />
          <div className="classification-rule-panel">
            <div className="governance-panel-head">
              <div>
                <p className="eyebrow">Curated Registry</p>
                <h3>Classification Rules</h3>
                <p className="section-subtitle">
                  Existing curated rules remain visible as policy context while the backend inventory becomes the resolved classification source.
                </p>
              </div>
            </div>
            <table className="governance-policy-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Matches</th>
                  <th>Classification</th>
                  <th>Scope</th>
                  <th>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {classificationRules.map((rule: ClassificationRule) => (
                  <tr key={rule.id}>
                    <td>
                      <strong>{rule.name}</strong>
                    </td>
                    <td>
                      <code>{rule.matchPattern}</code>
                    </td>
                    <td>
                      <span className={`governance-classification-badge ${rule.classification}`}>
                        {rule.classification}
                      </span>
                    </td>
                    <td className="subtle">{statusLabel(rule.scope)}</td>
                    <td className="subtle">{rule.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab !== "classification" ? (
      <section className="governance-master-detail">
        <aside className="governance-usecase-list">
          {filteredUseCases.map((useCase) => {
            const selected = useCase.id === activeUseCase.id;
            return (
              <button
                className={`governance-usecase-list-item ${selected ? "selected" : ""}`}
                key={useCase.id}
                type="button"
                onClick={() => handleUseCaseSelect(useCase)}
              >
                <div className="governance-card-topline">
                  <span className="eyebrow">{useCase.domain}</span>
                  <span className={`governance-badge ${statusTone(useCase.complianceContext.posture)}`}>
                    {statusLabel(useCase.complianceContext.posture)}
                  </span>
                </div>
                <h4>{useCase.name}</h4>
                <p className="governance-usecase-purpose">{useCase.businessPurpose}</p>
                <div className="governance-inline-list">
                  <span className="governance-mini-pill">{useCase.governedDatasets.length} assets</span>
                  <span className="governance-mini-pill">{countConnectedAssets(useCase)} mapped</span>
                  <span className="governance-mini-pill">{useCase.dictionaryTerms.length} terms</span>
                </div>
              </button>
            );
          })}
        </aside>

        <div className="governance-detail-shell">
          <TrustContextBreadcrumb useCase={activeUseCase} assetLabel={assetLabel} />

          <div className="governance-detail-layout">
            <div className="governance-detail-main">
              <div className="governance-panel-head">
                <div>
                  <p className="eyebrow">Governance Summary</p>
                  <h3>{activeUseCase.name}</h3>
                  <p className="section-subtitle">{activeUseCase.description}</p>
                </div>
                <div className="governance-inline-list">
                  <span className="governance-mini-pill">{activeUseCase.domain}</span>
                  <Link className="button secondary" href={activeUseCase.workspacePath}>
                    Open Workspace
                  </Link>
                </div>
              </div>

              {(activeTab === "overview" || activeTab === "lineage") && (
                <BusinessTrustMapView
                  useCase={activeUseCase}
                  selectedNodeId={selectedTrustNodeId}
                  onSelectNode={handleTrustNodeSelect}
                />
              )}

              <div className="governance-tab-row">
                {availableTabs.map((tab) => (
                  <button
                    className={`governance-tab ${activeTab === tab.key ? "active" : ""}`}
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="governance-tab-panel">
                <div className="governance-panel-head">
                  <div>
                    <p className="eyebrow">Selected View</p>
                    <h3>{activeTabMeta?.label}</h3>
                    <p className="section-subtitle">{activeTabMeta?.description}</p>
                  </div>
                  <div className="governance-inline-list">
                    <span className={`governance-status-pill ${statusTone(activeUseCase.qualitySummary.lineage)}`}>
                      Lineage {statusLabel(activeUseCase.qualitySummary.lineage)}
                    </span>
                    <span className={`governance-status-pill ${statusTone(activeUseCase.qualitySummary.quality)}`}>
                      Quality {statusLabel(activeUseCase.qualitySummary.quality)}
                    </span>
                    <span className={`governance-status-pill ${statusTone(activeUseCase.qualitySummary.freshness)}`}>
                      Freshness {statusLabel(activeUseCase.qualitySummary.freshness)}
                    </span>
                  </div>
                </div>

                {activeTab === "overview" ? (
                  <div className="governance-overview-grid">
                    <article className="governance-contract-block">
                      <h4>Use Case Contract</h4>
                      <p>{activeUseCase.businessPurpose}</p>
                      <div className="governance-inline-list">
                        {activeUseCase.workspaceCoverage.map((item) => (
                          <Link className="governance-link-pill" href={item.href} key={item.href}>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </article>
                    <article className="governance-contract-block">
                      <h4>Trust Signals</h4>
                      <div className="governance-inline-list">
                        <span className={`governance-status-pill ${statusTone(activeUseCase.qualitySummary.recordSpecs)}`}>
                          Record specs {statusLabel(activeUseCase.qualitySummary.recordSpecs)}
                        </span>
                        <span className={`governance-status-pill ${statusTone(activeUseCase.complianceContext.posture)}`}>
                          Compliance {statusLabel(activeUseCase.complianceContext.posture)}
                        </span>
                        <span className="governance-mini-pill">{recordCoverage(activeUseCase)} specs</span>
                        <span className="governance-mini-pill">{countConnectedAssets(activeUseCase)} lineage-mapped assets</span>
                      </div>
                      <p className="governance-search-note">{activeUseCase.qualitySummary.note}</p>
                    </article>
                    <article className="governance-contract-block">
                      <h4>Top Governed Assets</h4>
                      <div className="governance-inline-list">
                        {activeUseCase.governedDatasets.slice(0, 6).map((dataset) => (
                          <button
                            className="governance-link-pill"
                            key={dataset.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssetId(dataset.id);
                              setActiveTab("assets");
                            }}
                          >
                            {dataset.name}
                          </button>
                        ))}
                      </div>
                    </article>
                    <article className="governance-contract-block">
                      <h4>Downstream Surfaces</h4>
                      <div className="governance-inline-list">
                        {activeUseCase.downstreamConsumers.map((item) => (
                          <span className="governance-mini-pill" key={item}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </article>
                  </div>
                ) : null}

                {activeTab === "contracts" ? (
                  <div className="governance-contract-grid">
                    <article className="governance-contract-block">
                      <h4>Business Purpose</h4>
                      <p>{activeUseCase.businessPurpose}</p>
                    </article>
                    <article className="governance-contract-block">
                      <h4>Workspace Coverage</h4>
                      <div className="governance-link-cloud">
                        {activeUseCase.workspaceCoverage.map((item) => (
                          <Link className="governance-link-pill" href={item.href} key={item.href}>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </article>
                    <article className="governance-contract-block">
                      <h4>Lineage Entry Points</h4>
                      <ul className="governance-bullet-list">
                        {activeUseCase.lineageEntryPoints.map((entryPoint) => (
                          <li key={entryPoint.id}>
                            <strong>{entryPoint.label}:</strong> {entryPoint.summary}
                          </li>
                        ))}
                      </ul>
                    </article>
                    <article className="governance-contract-block">
                      <h4>Downstream Consumers</h4>
                      <div className="governance-inline-list">
                        {activeUseCase.downstreamConsumers.map((item) => (
                          <span className="governance-mini-pill" key={item}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </article>
                  </div>
                ) : null}

                {activeTab === "glossary" ? (
                  matchingGlossaryTerms.length > 0 ? (
                    <div className="governance-glossary-grid">
                      {matchingGlossaryTerms.map((term) => (
                        <article className="governance-glossary-card" key={term.id}>
                          <div className="governance-card-topline">
                            <span className="governance-mini-pill">{term.domain}</span>
                            <span className={`governance-badge ${statusTone(term.status)}`}>
                              {statusLabel(term.status)}
                            </span>
                          </div>
                          <h4>{term.term}</h4>
                          {term.synonyms && term.synonyms.length > 0 ? (
                            <div className="governance-inline-list">
                              {term.synonyms.map((synonym) => (
                                <span className="governance-mini-pill" key={synonym}>
                                  {synonym}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p>{term.definition}</p>
                          {term.exampleUsage ? (
                            <p className="subtle">
                              <em>{term.exampleUsage}</em>
                            </p>
                          ) : null}
                          {term.relatedTermIds && term.relatedTermIds.length > 0 ? (
                            <div className="governance-inline-list">
                              {resolveRelatedTerms(term.relatedTermIds).map((relatedTerm) => (
                                  <span className="governance-mini-pill" key={relatedTerm.id}>
                                    {relatedTerm.term}
                                  </span>
                                ))}
                            </div>
                          ) : null}
                          <div className="governance-term-meta">
                            {term.steward ? (
                              <span>
                                Steward: <strong>{term.steward}</strong>
                              </span>
                            ) : null}
                            {term.owner ? (
                              <span>
                                Owner: <strong>{term.owner}</strong>
                              </span>
                            ) : null}
                            {term.sourceMetric ? (
                              <span>
                                Source: <strong>{term.sourceMetric}</strong>
                              </span>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    renderUnknown("Governance metadata not yet configured.")
                  )
                ) : null}

                {activeTab === "assets" ? (
                  <div className="governance-asset-grid">
                    {activeUseCase.governedDatasets.map((asset) => (
                      <button
                        className={`governance-asset-card ${selectedAsset?.id === asset.id ? "selected" : ""}`}
                        key={asset.id}
                        type="button"
                        onClick={() => setSelectedAssetId(asset.id)}
                      >
                        <div className="governance-card-topline">
                          <span className="governance-mini-pill">{assetTypeLabel(asset.assetType)}</span>
                          <span className={`governance-badge ${statusTone(asset.certification?.status ?? asset.certificationStatus)}`}>
                            {statusLabel(asset.certification?.status ?? asset.certificationStatus)}
                          </span>
                        </div>
                        <h4>{asset.name}</h4>
                        <p className="governance-asset-label">
                          {asset.schema}.{asset.table}
                        </p>
                        <p>{asset.businessMeaning}</p>
                        <div className="governance-asset-meta">
                          <span>
                            Columns <strong>{asset.columns?.length ?? 0}</strong>
                          </span>
                          <span>
                            Row count <strong>{asset.rowCount?.toLocaleString() ?? "Unknown"}</strong>
                          </span>
                        </div>
                        <div className="governance-asset-status-row">
                          <span className={`governance-status-pill ${statusTone(asset.freshnessStatus)}`}>
                            Freshness {statusLabel(asset.freshnessStatus)}
                          </span>
                          <span className={`governance-status-pill ${statusTone(asset.testStatus)}`}>
                            Quality {statusLabel(asset.testStatus)}
                          </span>
                          <span className={`governance-status-pill ${statusTone(asset.lineageStatus)}`}>
                            Lineage {statusLabel(asset.lineageStatus)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {activeTab === "lineage" ? (
                  <>
                    <div className="governance-lineage-toolbar">
                      <span className="eyebrow">Lineage mode</span>
                      <div className="governance-chip-row">
                        <button
                          className={`governance-chip ${lineageMode === "business" ? "active" : ""}`}
                          type="button"
                          onClick={() => setLineageMode("business")}
                        >
                          Business Trust Map
                        </button>
                        <button
                          className={`governance-chip ${lineageMode === "technical" ? "active" : ""}`}
                          type="button"
                          onClick={() => setLineageMode("technical")}
                        >
                          Technical Lineage
                        </button>
                      </div>
                    </div>
                    {lineageMode === "business" ? (
                      <div className="governance-lineage-summary-note">
                        The business trust map is curated product lineage. Technical lineage remains available below through the existing backend DAG.
                      </div>
                    ) : selectedLineageModel ? (
                      <div className="governance-lineage-hero">
                        <LineageDAG
                          modelName={selectedLineageModel}
                          layout="stacked"
                          declaredSources={activeUseCase.sourceTables}
                        />
                      </div>
                    ) : (
                      renderUnknown("Detailed lineage not yet connected.")
                    )}
                    <div className="governance-lineage-grid">
                      {activeUseCase.lineageEntryPoints.map((entryPoint) => (
                        <article className="governance-lineage-card" key={entryPoint.id}>
                          <div className="governance-card-topline">
                            <span className="governance-mini-pill">{entryPoint.technicalModel}</span>
                            <span className={`governance-badge ${statusTone(entryPoint.status)}`}>
                              {statusLabel(entryPoint.status)}
                            </span>
                          </div>
                          <h4>{entryPoint.label}</h4>
                          <p>{entryPoint.summary}</p>
                          <div className="governance-inline-list">
                            {entryPoint.impactTargets.map((target) => (
                              <span className="governance-mini-pill" key={target}>
                                {target}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}

                {activeTab === "quality" ? (
                  <>
                    {activeUseCase.qualitySummary.dqDimensions ? (
                      <div className="governance-dq-scorecard">
                        {(Object.entries(activeUseCase.qualitySummary.dqDimensions) as [string, QualityDimensionStatus][]).map(
                          ([dimension, status]) => (
                            <div className="governance-dq-cell" key={dimension}>
                              <span className="eyebrow">{dimension}</span>
                              <span className={`governance-status-pill ${statusTone(status)}`}>
                                {statusLabel(status)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    ) : null}
                    <div className="governance-legacy-grid">
                      <DataQualitySummary modelFilters={activeUseCase.diagnosticsScope?.qualityModels} />
                      <SourceFreshness sourceFilters={activeUseCase.diagnosticsScope?.freshnessSources} />
                    </div>
                    <div className="governance-quality-grid">
                      {activeUseCase.governedDatasets.map((dataset) => (
                        <article className="governance-quality-card" key={dataset.id}>
                          <h4>{dataset.name}</h4>
                          <p>
                            {dataset.schema}.{dataset.table}
                          </p>
                          <div className="governance-quality-list">
                            <span className={`governance-status-pill ${statusTone(dataset.freshnessStatus)}`}>
                              Freshness {statusLabel(dataset.freshnessStatus)}
                            </span>
                            <span className={`governance-status-pill ${statusTone(dataset.testStatus)}`}>
                              Quality {statusLabel(dataset.testStatus)}
                            </span>
                            <span className={`governance-status-pill ${statusTone(dataset.recordSpecStatus)}`}>
                              Record spec {statusLabel(dataset.recordSpecStatus)}
                            </span>
                          </div>
                          {qualityDimensionEntries(dataset).length > 0 ? (
                            <div className="governance-inline-list">
                              {qualityDimensionEntries(dataset).map(([dimension, status]) => (
                                <span className={`governance-status-pill ${statusTone(status)}`} key={`${dataset.id}-${dimension}`}>
                                  {dimension} {statusLabel(status)}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}

                {activeTab === "compliance" ? (
                  <>
                    <div className="governance-panel-head">
                      <div>
                        <p className="eyebrow">Compliance Policies</p>
                        <h3>{activeUseCase.name}</h3>
                        <p className="section-subtitle">
                          Regulation-linked policies, standards, ownership, and governance evidence by use case.
                        </p>
                      </div>
                      <span className={`governance-badge ${statusTone(activeUseCase.complianceContext.posture)}`}>
                        {statusLabel(activeUseCase.complianceContext.posture)}
                      </span>
                    </div>
                    <table className="governance-policy-table">
                      <thead>
                        <tr>
                          <th>Framework</th>
                          <th>Policy / Control</th>
                          <th>Evidence</th>
                          <th>Owner</th>
                          <th>Status</th>
                          <th>Next Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeUseCase.complianceContext.policies.map((policy) => (
                          <tr key={policy.id}>
                            <td>
                              <span className="governance-mini-pill">{policy.framework}</span>
                            </td>
                            <td>
                              <strong>{policy.policy}</strong>
                            </td>
                            <td className="subtle">{policy.evidence}</td>
                            <td className="subtle">{policy.owner}</td>
                            <td>
                              <span className={`governance-status-pill ${statusTone(policy.status)}`}>
                                {statusLabel(policy.status)}
                              </span>
                            </td>
                            <td className="subtle">{policy.nextReviewDate ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="subtle">{activeUseCase.complianceContext.summary}</p>
                  </>
                ) : null}

              </div>
            </div>

            <TrustDrawer useCase={activeUseCase} asset={selectedAsset} />
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}
