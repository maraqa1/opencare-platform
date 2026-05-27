"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getGovernanceUseCases, type GovernanceUseCase } from "@/lib/governance-registry";
import type { UseCaseModule } from "@/lib/use-cases";

const stageLabels: Record<string, string> = {
  source: "Source System",
  landing: "Raw Landing",
  staging: "Standardization",
  mart: "Analytics Mart",
  runtime: "Runtime Model",
  workspace: "Operational Workspace",
  dashboard: "Dashboard",
  kpi: "KPI",
  decision: "Decision Action",
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function matchGovernanceUseCase(module: UseCaseModule, governedUseCases: GovernanceUseCase[]) {
  return governedUseCases.find((useCase) => useCase.id === module.id) ?? null;
}

function qualityLabel(useCase: GovernanceUseCase | null) {
  if (!useCase) return "Not yet governed";
  return `${statusLabel(useCase.qualitySummary.freshness)} freshness, ${statusLabel(useCase.qualitySummary.quality)} quality`;
}

function columnCount(useCase: GovernanceUseCase | null) {
  if (!useCase) return 0;
  return useCase.governedDatasets.reduce((count, asset) => count + (asset.columns?.length ?? 0), 0);
}

function lineageNodes(useCase: GovernanceUseCase | null) {
  if (!useCase) return [];
  return useCase.trustMap.nodes.map((node) => ({
    label: stageLabels[node.type] ?? statusLabel(node.type),
    detail: node.description ?? node.label,
  }));
}

export function UseCaseBriefing({ useCases }: { useCases: UseCaseModule[] }) {
  const governedUseCases = useMemo(() => getGovernanceUseCases(), []);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState(useCases[0]?.id ?? "");
  const selectedModule = useCases.find((useCase) => useCase.id === selectedUseCaseId) ?? useCases[0];
  const governedUseCase = selectedModule ? matchGovernanceUseCase(selectedModule, governedUseCases) : null;
  const sourceInputs = governedUseCase?.sourceTables ?? [];
  const outcomeTargets = governedUseCase?.downstreamConsumers ?? selectedModule?.kpis.map((kpi) => kpi.label) ?? [];
  const workspaceLinks = governedUseCase?.workspaceCoverage ?? [];
  const lineage = lineageNodes(governedUseCase);

  if (!selectedModule) {
    return (
      <section className="use-case-briefing">
        <article className="use-case-briefing-panel">
          <p className="eyebrow">Use Cases</p>
          <h3>No enabled use cases</h3>
          <p className="section-subtitle">
            This project is running as an OpenCare foundation shell. Define and enable the Jazan use case when the
            source systems, outcomes, and governance contract are ready.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="use-case-briefing">
      <nav className="use-case-tabs" aria-label="Use case briefing tabs">
        {useCases.map((useCase) => (
          <button
            className={useCase.id === selectedModule.id ? "active" : ""}
            key={useCase.id}
            type="button"
            onClick={() => setSelectedUseCaseId(useCase.id)}
          >
            <span>{useCase.name}</span>
            <em>{useCase.status === "active" ? "Active" : "Planned"}</em>
          </button>
        ))}
      </nav>

      <article className="use-case-briefing-hero">
        <div>
          <span className="use-case-icon">{selectedModule.icon}</span>
          <h2>{selectedModule.name}</h2>
          <p>{governedUseCase?.businessPurpose ?? selectedModule.description}</p>
        </div>
        <div className="use-case-briefing-actions">
          <span className={`summary-badge ${selectedModule.status === "active" ? "normal" : "warning"}`}>
            {selectedModule.status === "active" ? "Active use case" : "Planned use case"}
          </span>
          {selectedModule.status === "active" ? (
            <Link className="button primary" href={selectedModule.defaultHref ?? `/use-cases/${selectedModule.slug}`}>
              {selectedModule.ctaLabel ?? "Open Workspace"}
            </Link>
          ) : (
            <Link className="button secondary" href="/admin/configuration">
              View Configuration
            </Link>
          )}
        </div>
      </article>

      <div className="use-case-briefing-grid">
        <section className="use-case-briefing-panel objective">
          <p className="eyebrow">Business Objective</p>
          <h3>What this use case is designed to change</h3>
          <p>{governedUseCase?.description ?? selectedModule.summary}</p>
          <div className="metric-grid compact">
            {selectedModule.kpis.map((kpi) => (
              <div className="forecast-stat" key={kpi.label}>
                <p className="eyebrow">{kpi.label}</p>
                <strong>{kpi.value}</strong>
                <p className="section-subtitle">{kpi.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="use-case-briefing-panel">
          <p className="eyebrow">Data Inputs</p>
          <h3>Source data needed</h3>
          {sourceInputs.length > 0 ? (
            <div className="use-case-input-list">
              {sourceInputs.map((source) => (
                <span key={source}>{source}</span>
              ))}
            </div>
          ) : (
            <p className="section-subtitle">Source tables will be confirmed during enablement.</p>
          )}
          <p className="section-subtitle">
            Ingestion pattern: MySQL source to Airbyte to Postgres raw landing, then dbt staging and analytics.
          </p>
        </section>

        <section className="use-case-briefing-panel">
          <p className="eyebrow">Business Outcomes</p>
          <h3>Operational outputs</h3>
          <div className="use-case-outcome-list">
            {outcomeTargets.map((target) => (
              <span key={target}>{target}</span>
            ))}
          </div>
        </section>

        <section className="use-case-briefing-panel">
          <p className="eyebrow">Governance Evidence</p>
          <h3>Why customers can trust it</h3>
          <dl className="use-case-evidence-list">
            <div>
              <dt>Owner</dt>
              <dd>{governedUseCase?.owner ?? "To be assigned"}</dd>
            </div>
            <div>
              <dt>Steward</dt>
              <dd>{governedUseCase?.steward ?? "To be assigned"}</dd>
            </div>
            <div>
              <dt>Quality posture</dt>
              <dd>{qualityLabel(governedUseCase)}</dd>
            </div>
            <div>
              <dt>Classified columns</dt>
              <dd>{columnCount(governedUseCase)}</dd>
            </div>
            <div>
              <dt>Policy coverage</dt>
              <dd>{governedUseCase ? `${governedUseCase.complianceContext.policies.length} controls mapped` : "Not mapped"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="use-case-briefing-panel use-case-lineage-brief">
        <div className="governance-panel-head">
          <div>
            <p className="eyebrow">Source-To-Decision Story</p>
            <h3>How data becomes an operational decision</h3>
          </div>
          <Link className="secondary-link" href="/admin/governance">
            Open Governance Trust Map
          </Link>
        </div>
        {lineage.length > 0 ? (
          <div className="use-case-lineage-strip">
            {lineage.map((node, index) => (
              <div className="use-case-lineage-step" key={`${node.label}-${index}`}>
                <strong>{node.label}</strong>
                <p>{node.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="section-subtitle">Lineage will be mapped when the use case moves from planned to active.</p>
        )}
      </section>

      {workspaceLinks.length > 0 ? (
        <section className="use-case-briefing-panel">
          <p className="eyebrow">Workspace Navigation</p>
          <div className="button-row">
            {workspaceLinks.map((link) => (
              <Link className="button secondary" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
