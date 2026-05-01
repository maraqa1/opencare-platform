"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  type GovernanceStatus,
  type GovernanceUseCase,
  type GovernedDataset,
  getGovernanceOverview,
  getGovernanceUseCases,
} from "@/lib/governance-registry";

type ScopeFilter =
  | "all"
  | "use-cases"
  | "data-assets"
  | "glossary-terms"
  | "record-specs"
  | "lineage"
  | "quality-issues";

type GovernanceTab =
  | "contracts"
  | "glossary"
  | "assets"
  | "lineage"
  | "quality"
  | "compliance";

const scopeLabels: Array<{ key: ScopeFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "use-cases", label: "Use Cases" },
  { key: "data-assets", label: "Data Assets" },
  { key: "glossary-terms", label: "Glossary Terms" },
  { key: "record-specs", label: "Record Specs" },
  { key: "lineage", label: "Lineage" },
  { key: "quality-issues", label: "Quality Issues" },
];

const tabLabels: Array<{ key: GovernanceTab; label: string }> = [
  { key: "contracts", label: "Use Case Contracts" },
  { key: "glossary", label: "Business Glossary" },
  { key: "assets", label: "Governed Assets" },
  { key: "lineage", label: "Lineage & Impact" },
  { key: "quality", label: "Quality & Freshness" },
  { key: "compliance", label: "Compliance Evidence" },
];

function statusTone(status: GovernanceStatus | string) {
  switch (status) {
    case "trusted":
    case "approved":
    case "fresh":
    case "passing":
    case "complete":
      return "positive";
    case "draft":
    case "partial":
    case "warning":
      return "warning";
    case "missing":
    case "failing":
    case "stale":
      return "critical";
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
      return "Output";
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

function countConnectedAssets(useCase: GovernanceUseCase) {
  return useCase.governedDatasets.filter((dataset) => dataset.lineageStatus !== "missing").length;
}

function recordCoverage(useCase: GovernanceUseCase) {
  return `${useCase.governedDatasets.filter((dataset) => dataset.recordSpecStatus === "complete").length}/${useCase.governedDatasets.length}`;
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
    ...useCase.governedDatasets.flatMap((dataset) => [dataset.name, `${dataset.schema}.${dataset.table}`, dataset.businessMeaning]),
    ...useCase.dictionaryTerms.flatMap((term) => [term.term, term.definition]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function scopeMatchesUseCase(useCase: GovernanceUseCase, scope: ScopeFilter) {
  switch (scope) {
    case "all":
    case "use-cases":
      return true;
    case "data-assets":
      return useCase.governedDatasets.length > 0;
    case "glossary-terms":
      return useCase.dictionaryTerms.length > 0;
    case "record-specs":
      return useCase.governedDatasets.some((dataset) => dataset.recordSpecStatus !== "missing");
    case "lineage":
      return useCase.lineageEntryPoints.length > 0;
    case "quality-issues":
      return useCase.governedDatasets.some(
        (dataset) =>
          dataset.testStatus !== "passing" ||
          dataset.freshnessStatus !== "fresh" ||
          dataset.lineageStatus !== "complete",
      );
    default:
      return true;
  }
}

function renderUnknown(message: string) {
  return <div className="governance-empty-state">{message}</div>;
}

export function GovernanceControlTower() {
  const useCases = getGovernanceUseCases();
  const overview = getGovernanceOverview();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [domain, setDomain] = useState<GovernanceUseCase["domain"] | "All domains">("All domains");
  const [activeUseCaseId, setActiveUseCaseId] = useState(useCases[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<GovernanceTab>("contracts");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

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

  const activeUseCase = filteredUseCases.find((useCase) => useCase.id === activeUseCaseId) ?? filteredUseCases[0] ?? useCases[0];

  const selectedAsset =
    activeUseCase?.governedDatasets.find((dataset) => dataset.id === selectedAssetId) ??
    activeUseCase?.governedDatasets[0] ??
    null;

  const matchingGlossaryTerms = useMemo(() => {
    const terms = filteredUseCases.flatMap((useCase) => useCase.dictionaryTerms.map((term) => ({ ...term, useCaseName: useCase.name })));
    if (!query) {
      return terms;
    }
    return terms.filter((term) => `${term.term} ${term.definition}`.toLowerCase().includes(query.toLowerCase()));
  }, [filteredUseCases, query]);

  const matchingAssets = useMemo(() => {
    const assets = filteredUseCases.flatMap((useCase) =>
      useCase.governedDatasets.map((dataset) => ({ ...dataset, useCaseName: useCase.name, useCaseId: useCase.id })),
    );
    if (!query) {
      return assets;
    }
    return assets.filter((asset) =>
      `${asset.name} ${asset.schema}.${asset.table} ${asset.businessMeaning}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [filteredUseCases, query]);

  const glossaryGroups = useMemo(() => {
    const grouped = new Map<string, typeof matchingGlossaryTerms>();
    for (const term of matchingGlossaryTerms) {
      const existing = grouped.get(term.useCaseName) ?? [];
      existing.push(term);
      grouped.set(term.useCaseName, existing);
    }
    return Array.from(grouped.entries());
  }, [matchingGlossaryTerms]);

  return (
    <div className="governance-control-tower">
      <section className="governance-summary-grid">
        {[
          ["Active Use Cases", String(overview.activeUseCases), "Operational workspaces represented in governance."],
          ["Governed Data Assets", String(overview.governedAssets), "Registry-backed governed products and supporting assets."],
          ["Glossary Terms", String(overview.glossaryTerms), "Business-readable definitions across active domains."],
          ["Record Specs", String(overview.recordSpecs), "Assets with a known specification or partial contract."],
          ["Lineage Coverage", overview.lineageCoverage, "Simplified product lineage mapped in the registry."],
          ["Quality Status", overview.qualityStatus, "Quality evidence not connected to live telemetry yet."],
          ["Freshness Status", overview.freshnessStatus, "Freshness status remains descriptive in phase 1."],
          ["Compliance Gaps", String(overview.complianceGaps), "Documented areas where governance evidence is incomplete."],
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
              placeholder="Search datasets, glossary terms, use cases, owners, lineage..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="governance-domain-filter">
            <span className="eyebrow">Domain</span>
            <select value={domain} onChange={(event) => setDomain(event.target.value as GovernanceUseCase["domain"] | "All domains")}>
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
                if (item.key === "use-cases") setActiveTab("contracts");
                if (item.key === "data-assets" || item.key === "record-specs") setActiveTab("assets");
                if (item.key === "glossary-terms") setActiveTab("glossary");
                if (item.key === "lineage") setActiveTab("lineage");
                if (item.key === "quality-issues") setActiveTab("quality");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="governance-search-note">
          {query ? `${filteredUseCases.length} use cases, ${matchingAssets.length} assets, and ${matchingGlossaryTerms.length} glossary terms match.` : "Frontend governance registry is active. Metadata search source is not yet connected to a live catalog backend."}
        </div>
      </section>

      <section className="governance-usecase-grid">
        {filteredUseCases.map((useCase) => {
          const selected = activeUseCase?.id === useCase.id;
          return (
            <article
              className={`governance-usecase-card ${selected ? "selected" : ""}`}
              key={useCase.id}
              onClick={() => {
                setActiveUseCaseId(useCase.id);
                setSelectedAssetId(useCase.governedDatasets[0]?.id ?? null);
                setActiveTab("contracts");
              }}
            >
              <div className="governance-usecase-head">
                <div>
                  <p className="eyebrow">{useCase.domain}</p>
                  <h3>{useCase.name}</h3>
                </div>
                <span className={`governance-badge ${statusTone(useCase.complianceContext.posture)}`}>{statusLabel(useCase.complianceContext.posture)}</span>
              </div>
              <p className="governance-usecase-purpose">{useCase.businessPurpose}</p>
              <div className="governance-usecase-meta">
                <div>
                  <span>Owner</span>
                  <strong>{useCase.owner}</strong>
                </div>
                <div>
                  <span>Steward</span>
                  <strong>{useCase.steward ?? "Governance metadata not yet configured."}</strong>
                </div>
              </div>
              <div className="governance-usecase-stats">
                <div><span>Governed assets</span><strong>{useCase.governedDatasets.length}</strong></div>
                <div><span>Glossary terms</span><strong>{useCase.dictionaryTerms.length}</strong></div>
                <div><span>Record specs</span><strong>{recordCoverage(useCase)}</strong></div>
                <div><span>Lineage</span><strong>{countConnectedAssets(useCase)}/{useCase.governedDatasets.length}</strong></div>
                <div><span>Quality</span><strong>{statusLabel(useCase.qualitySummary.quality)}</strong></div>
                <div><span>Freshness</span><strong>{statusLabel(useCase.qualitySummary.freshness)}</strong></div>
              </div>
              <div className="governance-usecase-footer">
                <div className="governance-workspace-pills">
                  {useCase.workspaceCoverage.slice(0, 3).map((item) => (
                    <span key={item.label} className="governance-mini-pill">{item.label}</span>
                  ))}
                  {useCase.workspaceCoverage.length > 3 ? <span className="governance-mini-pill">+{useCase.workspaceCoverage.length - 3} more</span> : null}
                </div>
                <div className="governance-card-actions">
                  <button type="button" className="button secondary" onClick={(event) => { event.stopPropagation(); setActiveUseCaseId(useCase.id); setActiveTab("contracts"); }}>
                    Open Contract
                  </button>
                  <button type="button" className="button secondary" onClick={(event) => { event.stopPropagation(); setActiveUseCaseId(useCase.id); setActiveTab("assets"); }}>
                    View Assets
                  </button>
                  <button type="button" className="button secondary" onClick={(event) => { event.stopPropagation(); setActiveUseCaseId(useCase.id); setActiveTab("glossary"); }}>
                    View Glossary
                  </button>
                  <button type="button" className="button secondary" onClick={(event) => { event.stopPropagation(); setActiveUseCaseId(useCase.id); setActiveTab("lineage"); }}>
                    View Lineage
                  </button>
                  <button type="button" className="button secondary" onClick={(event) => { event.stopPropagation(); setActiveUseCaseId(useCase.id); setActiveTab("quality"); }}>
                    View Quality
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {activeUseCase ? (
        <>
          <section className="governance-contract-layout">
            <article className="governance-contract-panel">
              <div className="governance-panel-head">
                <div>
                  <p className="eyebrow">Selected Use Case Contract</p>
                  <h3>{activeUseCase.name}</h3>
                  <p className="section-subtitle">{activeUseCase.description}</p>
                </div>
                <Link className="button secondary" href={activeUseCase.workspacePath}>
                  Open Workspace
                </Link>
              </div>
              <div className="governance-contract-grid">
                <div className="governance-contract-block">
                  <h4>Business Purpose</h4>
                  <p>{activeUseCase.businessPurpose}</p>
                </div>
                <div className="governance-contract-block">
                  <h4>Operational Workspace Coverage</h4>
                  <div className="governance-link-cloud">
                    {activeUseCase.workspaceCoverage.map((item) => (
                      <Link key={item.href} className="governance-link-pill" href={item.href}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="governance-contract-block">
                  <h4>Quality &amp; Freshness Evidence</h4>
                  <ul className="governance-bullet-list">
                    <li>Quality: {statusLabel(activeUseCase.qualitySummary.quality)}</li>
                    <li>Freshness: {statusLabel(activeUseCase.qualitySummary.freshness)}</li>
                    <li>Record specs: {statusLabel(activeUseCase.qualitySummary.recordSpecs)}</li>
                    <li>{activeUseCase.qualitySummary.note}</li>
                  </ul>
                </div>
                <div className="governance-contract-block">
                  <h4>Governed Data Assets</h4>
                  <div className="governance-inline-list">
                    {activeUseCase.governedDatasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        type="button"
                        className="governance-link-pill"
                        onClick={() => setSelectedAssetId(dataset.id)}
                      >
                        {dataset.schema}.{dataset.table}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="governance-contract-block">
                  <h4>Business Glossary Terms</h4>
                  <div className="governance-inline-list">
                    {activeUseCase.dictionaryTerms.map((term) => (
                      <span className="governance-mini-pill" key={term.id}>{term.term}</span>
                    ))}
                  </div>
                </div>
                <div className="governance-contract-block">
                  <h4>Compliance Context</h4>
                  <p>{activeUseCase.complianceContext.summary}</p>
                  <div className="governance-inline-status">
                    <span className={`governance-badge ${statusTone(activeUseCase.complianceContext.posture)}`}>
                      {statusLabel(activeUseCase.complianceContext.posture)}
                    </span>
                  </div>
                </div>
                <div className="governance-contract-block">
                  <h4>Lineage Entry Points</h4>
                  <div className="governance-inline-list">
                    {activeUseCase.lineageEntryPoints.map((entryPoint) => (
                      <div className="governance-lineage-entry" key={entryPoint.id}>
                        <strong>{entryPoint.label}</strong>
                        <p>{entryPoint.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="governance-contract-block">
                  <h4>Record Specifications</h4>
                  <ul className="governance-bullet-list">
                    <li>{recordCoverage(activeUseCase)} assets currently show complete record-spec coverage.</li>
                    <li>Phase 1 previews are registry-backed and business-readable.</li>
                    <li>Detailed spec APIs remain available elsewhere in the admin surface.</li>
                  </ul>
                </div>
                <div className="governance-contract-block">
                  <h4>Downstream Consumers</h4>
                  <div className="governance-inline-list">
                    {activeUseCase.downstreamConsumers.map((consumer) => (
                      <span className="governance-mini-pill" key={consumer}>{consumer}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <aside className="governance-trust-drawer">
              {selectedAsset ? (
                <>
                  <div className="governance-panel-head">
                    <div>
                      <p className="eyebrow">Dataset Trust Drawer</p>
                      <h3>{selectedAsset.name}</h3>
                      <p className="section-subtitle">{selectedAsset.schema}.{selectedAsset.table}</p>
                    </div>
                    <span className={`governance-badge ${statusTone(selectedAsset.certificationStatus)}`}>{statusLabel(selectedAsset.certificationStatus)}</span>
                  </div>
                  <div className="governance-drawer-grid">
                    <div className="governance-drawer-block">
                      <h4>Asset Overview</h4>
                      <p>{selectedAsset.businessMeaning}</p>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Business Meaning</h4>
                      <p>{selectedAsset.businessMeaning}</p>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Grain</h4>
                      <p>{selectedAsset.grain ?? "Governance metadata not yet configured."}</p>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Owner / Steward</h4>
                      <p>{selectedAsset.owner ?? "Unknown"} / {selectedAsset.steward ?? "Unknown"}</p>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Related Business Terms</h4>
                      <div className="governance-inline-list">
                        {(selectedAsset.relatedTerms ?? []).length > 0
                          ? selectedAsset.relatedTerms?.map((term) => <span className="governance-mini-pill" key={term}>{term}</span>)
                          : renderUnknown("Governance metadata not yet configured.")}
                      </div>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Record Specification Preview</h4>
                      <p>{selectedAsset.recordSpecStatus === "complete" ? "Record specification preview available in registry." : "Governance metadata not yet configured."}</p>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Quality Tests</h4>
                      <p>{selectedAsset.testStatus === "not_connected" ? "Quality evidence not connected." : statusLabel(selectedAsset.testStatus)}</p>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Freshness</h4>
                      <p>{selectedAsset.freshnessStatus === "not_connected" ? "Freshness not connected." : statusLabel(selectedAsset.freshnessStatus)}</p>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Lineage Summary</h4>
                      {(selectedAsset.lineageSummary ?? []).length > 0 ? (
                        <ul className="governance-bullet-list">
                          {selectedAsset.lineageSummary?.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      ) : (
                        <p>Detailed lineage not yet connected.</p>
                      )}
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Downstream Consumers</h4>
                      <div className="governance-inline-list">
                        {selectedAsset.consumers.map((consumer) => (
                          <span className="governance-mini-pill" key={consumer}>{consumer}</span>
                        ))}
                      </div>
                    </div>
                    <div className="governance-drawer-block">
                      <h4>Compliance Notes</h4>
                      {(selectedAsset.complianceNotes ?? []).length > 0 ? (
                        <ul className="governance-bullet-list">
                          {selectedAsset.complianceNotes?.map((note) => <li key={note}>{note}</li>)}
                        </ul>
                      ) : (
                        <p>Governance metadata not yet configured.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : renderUnknown("Governed asset metadata not yet configured.")}
            </aside>
          </section>

          <section className="governance-tabs-shell">
            <div className="governance-tab-row">
              {tabLabels.map((tab) => (
                <button
                  key={tab.key}
                  className={`governance-tab ${activeTab === tab.key ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "contracts" ? (
              <div className="governance-tab-panel">
                <div className="governance-panel-head">
                  <div>
                    <p className="eyebrow">Use Case Contracts</p>
                    <h3>Governed operational products</h3>
                  </div>
                </div>
                <div className="governance-contract-tiles">
                  {filteredUseCases.map((useCase) => (
                    <article className="governance-contract-tile" key={useCase.id}>
                      <p className="eyebrow">{useCase.domain}</p>
                      <h4>{useCase.name}</h4>
                      <p>{useCase.businessPurpose}</p>
                      <div className="governance-tile-meta">
                        <span>{useCase.governedDatasets.length} assets</span>
                        <span>{useCase.dictionaryTerms.length} glossary terms</span>
                        <span>{recordCoverage(useCase)} record specs</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "glossary" ? (
              <div className="governance-tab-panel">
                <div className="governance-panel-head">
                  <div>
                    <p className="eyebrow">Business Glossary</p>
                    <h3>Grouped by use case and domain</h3>
                  </div>
                </div>
                {matchingGlossaryTerms.length > 0 ? (
                  <div className="governance-glossary-groups">
                    {glossaryGroups.map(([useCaseName, terms]) => (
                      <section className="governance-glossary-group" key={useCaseName}>
                        <div className="governance-panel-head">
                          <div>
                            <p className="eyebrow">Use Case</p>
                            <h4>{useCaseName}</h4>
                          </div>
                          <span className="governance-mini-pill">{terms[0]?.domain ?? "Unknown domain"}</span>
                        </div>
                        <div className="governance-glossary-grid">
                          {terms.map((term) => (
                            <article className="governance-glossary-card" key={term.id}>
                              <div className="governance-card-topline">
                                <span className="governance-mini-pill">{term.domain}</span>
                                <span className={`governance-badge ${statusTone(term.status)}`}>{statusLabel(term.status)}</span>
                              </div>
                              <h4>{term.term}</h4>
                              <p>{term.definition}</p>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : renderUnknown("Governance metadata not yet configured.")}
              </div>
            ) : null}

            {activeTab === "assets" ? (
              <div className="governance-tab-panel">
                <div className="governance-panel-head">
                  <div>
                    <p className="eyebrow">Governed Assets</p>
                    <h3>Trusted data products and supporting assets</h3>
                  </div>
                </div>
                {matchingAssets.length > 0 ? (
                  <div className="governance-asset-grid">
                    {matchingAssets.map((asset) => (
                      <button
                        className="governance-asset-card"
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          setActiveUseCaseId(asset.useCaseId);
                          setSelectedAssetId(asset.id);
                        }}
                      >
                        <div className="governance-card-topline">
                          <span className="governance-mini-pill">{asset.useCaseName}</span>
                          <span className={`governance-badge ${statusTone(asset.certificationStatus)}`}>{statusLabel(asset.certificationStatus)}</span>
                        </div>
                        <h4>{asset.name}</h4>
                        <p className="governance-asset-label">{asset.schema}.{asset.table}</p>
                        <p>{asset.businessMeaning}</p>
                        <div className="governance-asset-meta">
                          <span>{assetTypeLabel(asset.assetType)}</span>
                          <span>{asset.grain ?? "Grain not configured"}</span>
                        </div>
                        <div className="governance-asset-status-row">
                          <span className={`governance-status-pill ${statusTone(asset.freshnessStatus)}`}>Freshness: {statusLabel(asset.freshnessStatus)}</span>
                          <span className={`governance-status-pill ${statusTone(asset.testStatus)}`}>Quality: {statusLabel(asset.testStatus)}</span>
                          <span className={`governance-status-pill ${statusTone(asset.lineageStatus)}`}>Lineage: {statusLabel(asset.lineageStatus)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : renderUnknown("Governance metadata not yet configured.")}
              </div>
            ) : null}

            {activeTab === "lineage" ? (
              <div className="governance-tab-panel">
                <div className="governance-panel-head">
                  <div>
                    <p className="eyebrow">Lineage &amp; Impact</p>
                    <h3>Simplified product lineage</h3>
                  </div>
                </div>
                <div className="governance-lineage-grid">
                  {activeUseCase.lineageEntryPoints.map((entryPoint) => (
                    <article className="governance-lineage-card" key={entryPoint.id}>
                      <div className="governance-card-topline">
                        <span className="governance-mini-pill">{activeUseCase.name}</span>
                        <span className={`governance-badge ${statusTone(entryPoint.status)}`}>{statusLabel(entryPoint.status)}</span>
                      </div>
                      <h4>{entryPoint.label}</h4>
                      <p>{entryPoint.summary}</p>
                      <div className="governance-lineage-path">
                        {entryPoint.path.map((step, index) => (
                          <div className="governance-lineage-node" key={`${entryPoint.id}-${step}`}>
                            <span>{step}</span>
                            {index < entryPoint.path.length - 1 ? <strong>-&gt;</strong> : null}
                          </div>
                        ))}
                      </div>
                      <p className="governance-impact-note">Impacts: {entryPoint.impactTargets.join(", ")}</p>
                    </article>
                  ))}
                  {activeUseCase.lineageEntryPoints.length === 0 ? renderUnknown("Detailed lineage not yet connected.") : null}
                </div>
              </div>
            ) : null}

            {activeTab === "quality" ? (
              <div className="governance-tab-panel">
                <div className="governance-panel-head">
                  <div>
                    <p className="eyebrow">Quality &amp; Freshness</p>
                    <h3>Trust signals by data product</h3>
                  </div>
                </div>
                <div className="governance-quality-grid">
                  {activeUseCase.governedDatasets.map((dataset) => (
                    <article className="governance-quality-card" key={dataset.id}>
                      <h4>{dataset.name}</h4>
                      <p>{dataset.schema}.{dataset.table}</p>
                      <div className="governance-quality-list">
                        <span className={`governance-status-pill ${statusTone(dataset.freshnessStatus)}`}>Freshness: {dataset.freshnessStatus === "not_connected" ? "Freshness not connected." : statusLabel(dataset.freshnessStatus)}</span>
                        <span className={`governance-status-pill ${statusTone(dataset.testStatus)}`}>Quality: {dataset.testStatus === "not_connected" ? "Quality evidence not connected." : statusLabel(dataset.testStatus)}</span>
                        <span className={`governance-status-pill ${statusTone(dataset.recordSpecStatus)}`}>Record spec: {statusLabel(dataset.recordSpecStatus)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "compliance" ? (
              <div className="governance-tab-panel">
                <div className="governance-panel-head">
                  <div>
                    <p className="eyebrow">Compliance Evidence</p>
                    <h3>Business-readable compliance context</h3>
                  </div>
                </div>
                <div className="governance-compliance-grid">
                  <article className="governance-compliance-card">
                    <p className="eyebrow">Evidence</p>
                    <ul className="governance-bullet-list">
                      {activeUseCase.complianceContext.evidence.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </article>
                  <article className="governance-compliance-card">
                    <p className="eyebrow">Gaps</p>
                    <ul className="governance-bullet-list">
                      {activeUseCase.complianceContext.gaps.length > 0
                        ? activeUseCase.complianceContext.gaps.map((item) => <li key={item}>{item}</li>)
                        : [<li key="no-gaps">Governance metadata not yet configured.</li>]}
                    </ul>
                  </article>
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : renderUnknown("Governance metadata not yet configured.")}
    </div>
  );
}
