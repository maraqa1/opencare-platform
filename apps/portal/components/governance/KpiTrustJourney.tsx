"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  BusinessTrustNode,
  GovernanceKpi,
  GovernanceUseCase,
  GovernedDataset,
  TrustState,
} from "@/lib/governance-registry";
import { TrustBadge } from "@/components/governance/TrustBadge";
import { SignalChip } from "@/components/governance/SignalChip";

type JourneyStage = {
  id: string;
  label: string;
  trustState: TrustState;
  summary: string;
  nodes: BusinessTrustNode[];
  chips: Array<{
    label: string;
    value: string;
    tone: "positive" | "warning" | "critical" | "neutral";
    href?: string;
  }>;
};

type EvidenceRow = {
  label: string;
  value: string;
};

type LineageRow = {
  label: string;
  value: string;
  source: "Curated" | "Discovered";
};

type StageSignal = {
  label: string;
  value: string;
  positiveWhen?: string[];
  warningWhen?: string[];
};

function signalValue(value?: string | null) {
  if (!value) return "Not instrumented";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function toneForState(state: TrustState) {
  if (state === "trusted") return "positive";
  if (state === "degraded") return "warning";
  if (state === "untrusted") return "critical";
  return "neutral";
}

function trustStateForNode(node?: BusinessTrustNode): TrustState {
  if (!node) return "unmapped";
  if (
    node.freshnessStatus === "stale" ||
    node.qualityStatus === "failing" ||
    node.certificationStatus === "deprecated"
  ) {
    return "untrusted";
  }
  if (
    node.freshnessStatus === "warning" ||
    node.qualityStatus === "warning" ||
    node.certificationStatus === "draft" ||
    node.certificationStatus === "reviewed"
  ) {
    return "degraded";
  }
  if (
    node.freshnessStatus === "fresh" ||
    node.qualityStatus === "passing" ||
    node.certificationStatus === "certified"
  ) {
    return "trusted";
  }
  return "unmapped";
}

function combineStates(states: TrustState[]): TrustState {
  if (states.includes("untrusted")) return "untrusted";
  if (states.includes("degraded")) return "degraded";
  if (states.includes("trusted")) return "trusted";
  return "unmapped";
}

function stageSummary(nodes: BusinessTrustNode[], fallback: string) {
  return nodes[0]?.description ?? fallback;
}

function firstNodeValue(node?: BusinessTrustNode, fallback = "Not instrumented") {
  return node?.label ?? fallback;
}

function isInstrumented(value?: string | null) {
  return Boolean(value) && value !== "Not instrumented";
}

function compactSignalReason(signal: StageSignal) {
  if (!isInstrumented(signal.value)) {
    return `${signal.label.toLowerCase()} not instrumented`;
  }
  const normalized = signal.value.toLowerCase();
  if (signal.positiveWhen?.includes(normalized) || signal.warningWhen?.includes(normalized)) {
    return `${signal.label.toLowerCase()} ${normalized}`;
  }
  return `${signal.label.toLowerCase()} available`;
}

function stageReason(
  stage: JourneyStage,
  asset: GovernedDataset | null,
  useCase: GovernanceUseCase,
) {
  const node = stage.nodes[0];
  const signals: StageSignal[] =
    stage.id === "source"
      ? [
          { label: "Owner", value: node?.owner ?? "Not instrumented" },
          { label: "Freshness", value: signalValue(node?.freshnessStatus), positiveWhen: ["fresh"], warningWhen: ["warning"] },
          { label: "Certification", value: signalValue(node?.certificationStatus), positiveWhen: ["certified", "reviewed"], warningWhen: ["draft"] },
        ]
      : stage.id === "transform"
        ? [
            { label: "Owner", value: asset?.owner ?? "Not instrumented" },
            { label: "Freshness", value: signalValue(asset?.freshnessStatus), positiveWhen: ["fresh"], warningWhen: ["warning"] },
            { label: "Quality", value: signalValue(asset?.testStatus), positiveWhen: ["passing"], warningWhen: ["warning"] },
          ]
        : stage.id === "quality"
          ? [
              { label: "Freshness", value: signalValue(asset?.freshnessStatus), positiveWhen: ["fresh"], warningWhen: ["warning"] },
              { label: "Tests", value: signalValue(asset?.testStatus), positiveWhen: ["passing"], warningWhen: ["warning"] },
              { label: "SLA", value: "Not instrumented" },
            ]
          : stage.id === "analytics"
            ? [
                { label: "Dashboard", value: asset?.relatedDashboards?.[0] ?? "Not instrumented" },
                { label: "Owner", value: node?.owner ?? asset?.owner ?? "Not instrumented" },
                { label: "Certification", value: signalValue(node?.certificationStatus ?? asset?.certification?.status), positiveWhen: ["certified", "reviewed"], warningWhen: ["draft"] },
              ]
            : [
                { label: "Action path", value: asset?.downstreamConsumers?.[0] ?? useCase.downstreamConsumers[0] ?? "Not instrumented" },
                { label: "Policy", value: useCase.complianceContext.policies.length > 0 ? "Policy mapped" : "Not instrumented" },
                { label: "Risk", value: asset?.openRisks?.[0] ?? "No active decision-path risk." },
              ];

  const topReasons = signals.slice(0, 3).map(compactSignalReason).join(", ");
  if (stage.trustState === "trusted") {
    return `Trusted because ${topReasons}.`;
  }
  if (stage.trustState === "degraded") {
    return `Degraded because ${topReasons}.`;
  }
  if (stage.trustState === "untrusted") {
    return `Untrusted because ${topReasons}.`;
  }
  return `Not instrumented because ${topReasons}.`;
}

function stageEvidence(
  stage: JourneyStage,
  asset: GovernedDataset | null,
  useCase: GovernanceUseCase,
): EvidenceRow[] {
  const node = stage.nodes[0];

  if (stage.id === "source") {
    return [
      { label: "Owner", value: node?.owner ?? "Not instrumented" },
      { label: "Certification", value: signalValue(node?.certificationStatus) },
      { label: "Freshness", value: signalValue(node?.freshnessStatus) },
      { label: "Sensitivity", value: signalValue(node?.sensitivityClass) },
      { label: "Quality posture", value: signalValue(node?.qualityStatus) },
    ];
  }

  if (stage.id === "transform") {
    return [
      { label: "dbt asset", value: asset ? `${asset.schema}.${asset.table}` : "Not instrumented" },
      { label: "Owner", value: asset?.owner ?? "Not instrumented" },
      { label: "Certification", value: signalValue(asset?.certification?.status) },
      { label: "Freshness", value: signalValue(asset?.freshnessStatus) },
      { label: "Quality posture", value: signalValue(asset?.testStatus) },
    ];
  }

  if (stage.id === "quality") {
    return [
      { label: "Freshness", value: signalValue(asset?.freshnessStatus) },
      { label: "Tests", value: signalValue(asset?.testStatus) },
      { label: "SLA", value: "Not instrumented" },
      { label: "Certification", value: signalValue(asset?.certification?.status) },
      { label: "Risk", value: asset?.openRisks?.[0] ?? "No active source risk." },
    ];
  }

  if (stage.id === "analytics") {
    return [
      { label: "Primary KPI", value: firstNodeValue(stage.nodes.find((nodeItem) => nodeItem.type === "kpi"), "Not instrumented") },
      { label: "Dashboard", value: asset?.relatedDashboards?.[0] ?? "Not instrumented" },
      { label: "Workspace", value: firstNodeValue(stage.nodes.find((nodeItem) => nodeItem.type === "workspace"), "Not instrumented") },
      { label: "Owner", value: node?.owner ?? asset?.owner ?? "Not instrumented" },
      { label: "Certification", value: signalValue(node?.certificationStatus ?? asset?.certification?.status) },
    ];
  }

  return [
    { label: "Action path", value: asset?.downstreamConsumers?.[0] ?? useCase.downstreamConsumers[0] ?? "Not instrumented" },
    { label: "Runtime output", value: firstNodeValue(stage.nodes.find((nodeItem) => nodeItem.type === "decision"), "Not instrumented") },
    { label: "Policy coverage", value: useCase.complianceContext.policies.length > 0 ? "Policy mapped" : "Not instrumented" },
    { label: "Owner", value: stage.nodes[0]?.owner ?? asset?.owner ?? "Not instrumented" },
    { label: "Risk", value: asset?.openRisks?.[0] ?? "No active decision-path risk." },
  ];
}

function stageLineage(
  stage: JourneyStage,
  useCase: GovernanceUseCase,
  asset: GovernedDataset | null,
): LineageRow[] {
  const sourceNodes = useCase.trustMap.nodes.filter((node) => node.type === "source" || node.type === "landing");
  const transformNodes = useCase.trustMap.nodes.filter((node) => node.type === "staging" || node.type === "mart");
  const analyticsNodes = useCase.trustMap.nodes.filter(
    (node) => node.type === "runtime" || node.type === "workspace" || node.type === "dashboard" || node.type === "kpi",
  );
  const decisionNodes = useCase.trustMap.nodes.filter((node) => node.type === "decision");

  if (stage.id === "source") {
    return [
      { label: "Input", value: firstNodeValue(sourceNodes[0]), source: sourceNodes[0]?.curated ? "Curated" : "Discovered" },
      { label: "Landing", value: firstNodeValue(sourceNodes[1]), source: sourceNodes[1]?.curated ? "Curated" : "Discovered" },
      { label: "Next", value: firstNodeValue(transformNodes[0], asset ? `${asset.schema}.${asset.table}` : "Not instrumented"), source: transformNodes[0]?.curated ? "Curated" : "Discovered" },
    ];
  }

  if (stage.id === "transform") {
    return [
      { label: "Upstream", value: firstNodeValue(sourceNodes[sourceNodes.length - 1]), source: sourceNodes[sourceNodes.length - 1]?.curated ? "Curated" : "Discovered" },
      { label: "Current", value: asset ? `${asset.schema}.${asset.table}` : firstNodeValue(transformNodes[0]), source: transformNodes[0]?.curated ? "Curated" : "Discovered" },
      { label: "Next", value: firstNodeValue(analyticsNodes[0]), source: analyticsNodes[0]?.curated ? "Curated" : "Discovered" },
    ];
  }

  if (stage.id === "quality") {
    return [
      { label: "Asset under test", value: asset ? `${asset.schema}.${asset.table}` : "Not instrumented", source: "Discovered" },
      { label: "Current stage", value: firstNodeValue(transformNodes[0]), source: transformNodes[0]?.curated ? "Curated" : "Discovered" },
      { label: "Next", value: firstNodeValue(analyticsNodes[0]), source: analyticsNodes[0]?.curated ? "Curated" : "Discovered" },
    ];
  }

  if (stage.id === "analytics") {
    return [
      { label: "Input", value: asset ? `${asset.schema}.${asset.table}` : firstNodeValue(transformNodes[0]), source: "Discovered" },
      { label: "Current stage", value: firstNodeValue(analyticsNodes[0]), source: analyticsNodes[0]?.curated ? "Curated" : "Discovered" },
      { label: "Downstream", value: firstNodeValue(decisionNodes[0]), source: decisionNodes[0]?.curated ? "Curated" : "Discovered" },
    ];
  }

  return [
    { label: "Input", value: firstNodeValue(analyticsNodes[analyticsNodes.length - 1]), source: analyticsNodes[analyticsNodes.length - 1]?.curated ? "Curated" : "Discovered" },
    { label: "Current stage", value: firstNodeValue(decisionNodes[0]), source: decisionNodes[0]?.curated ? "Curated" : "Discovered" },
    { label: "Downstream", value: asset?.downstreamConsumers?.[0] ?? useCase.downstreamConsumers[0] ?? "Not instrumented", source: "Curated" },
  ];
}

function buildStages(useCase: GovernanceUseCase, kpi: GovernanceKpi, asset: GovernedDataset | null): JourneyStage[] {
  const sourceNodes = useCase.trustMap.nodes.filter((node) => node.type === "source" || node.type === "landing");
  const transformNodes = useCase.trustMap.nodes.filter((node) => node.type === "staging" || node.type === "mart");
  const qualityNode = transformNodes.find((node) => node.assetId === asset?.id) ?? transformNodes[0];
  const analyticsNodes = useCase.trustMap.nodes.filter(
    (node) => node.type === "runtime" || node.type === "workspace" || node.type === "dashboard" || node.type === "kpi",
  );
  const decisionNodes = useCase.trustMap.nodes.filter((node) => node.type === "decision");

  return [
    {
      id: "source",
      label: "Source",
      trustState: combineStates(sourceNodes.map(trustStateForNode)),
      summary: stageSummary(sourceNodes, "Source system intake for the selected KPI."),
      nodes: sourceNodes,
      chips: [
        {
          label: "Owner",
          value: sourceNodes[0]?.owner ?? "Not instrumented",
          tone: sourceNodes[0]?.owner ? "neutral" : "warning",
        },
      ],
    },
    {
      id: "transform",
      label: "Transform",
      trustState: combineStates(transformNodes.map(trustStateForNode)),
      summary: stageSummary(transformNodes, "Transformations shaping this KPI into governed analytics."),
      nodes: transformNodes,
      chips: [
        {
          label: "Mart",
          value: asset ? `${asset.schema}.${asset.table}` : "Not instrumented",
          tone: asset ? "neutral" : "warning",
          href: asset ? `/governance/asset/${asset.id}` : undefined,
        },
      ],
    },
    {
      id: "quality",
      label: "Quality",
      trustState:
        asset?.testStatus === "failing" || asset?.freshnessStatus === "stale"
          ? "untrusted"
          : asset?.testStatus === "warning" || asset?.freshnessStatus === "warning"
            ? "degraded"
            : asset
              ? "trusted"
              : "unmapped",
      summary:
        asset?.openRisks?.[0] ??
        "Freshness, tests, and governance signals combine here into the trust decision.",
      nodes: qualityNode ? [qualityNode] : [],
      chips: [
        {
          label: "Freshness",
          value: signalValue(asset?.freshnessStatus),
          tone: toneForState(
            asset?.freshnessStatus === "stale"
              ? "untrusted"
              : asset?.freshnessStatus === "warning"
                ? "degraded"
                : asset
                  ? "trusted"
                  : "unmapped",
          ),
        },
        {
          label: "Tests",
          value: signalValue(asset?.testStatus),
          tone: toneForState(
            asset?.testStatus === "failing"
              ? "untrusted"
              : asset?.testStatus === "warning"
                ? "degraded"
                : asset
                  ? "trusted"
                  : "unmapped",
          ),
        },
        {
          label: "SLA",
          value: "Not instrumented",
          tone: "warning",
        },
      ],
    },
    {
      id: "analytics",
      label: "Analytics",
      trustState: combineStates(analyticsNodes.map(trustStateForNode)),
      summary: stageSummary(analyticsNodes, "Analytics outputs, dashboards, and workspace KPIs that expose this number."),
      nodes: analyticsNodes,
      chips: [
        {
          label: "Dashboard",
          value: asset?.relatedDashboards?.[0] ?? "Not instrumented",
          tone: asset?.relatedDashboards?.length ? "neutral" : "warning",
        },
        {
          label: "KPI",
          value: kpi.label,
          tone: "neutral",
        },
      ],
    },
    {
      id: "decision",
      label: "Decision",
      trustState: combineStates(decisionNodes.map(trustStateForNode)),
      summary: stageSummary(decisionNodes, "Operational decision support and action surfaces downstream of this KPI."),
      nodes: decisionNodes,
      chips: [
        {
          label: "Evidence",
          value: useCase.complianceContext.policies.length > 0 ? "Policy mapped" : "Not instrumented",
          tone: useCase.complianceContext.policies.length > 0 ? "neutral" : "warning",
        },
        {
          label: "Action path",
          value: asset?.downstreamConsumers?.[0] ?? useCase.downstreamConsumers[0] ?? "Not instrumented",
          tone: "neutral",
        },
      ],
    },
  ];
}

function StageDetailPopover({
  stage,
  useCase,
  kpi,
  asset,
  onClose,
}: {
  stage: JourneyStage;
  useCase: GovernanceUseCase;
  kpi: GovernanceKpi;
  asset: GovernedDataset | null;
  onClose: () => void;
}) {
  const evidence = stageEvidence(stage, asset, useCase);
  const lineage = stageLineage(stage, useCase, asset);
  const reason = stageReason(stage, asset, useCase);

  return (
    <div className="journey-popover-backdrop" role="presentation" onClick={onClose}>
      <aside
        aria-label={`${stage.label} details`}
        className="journey-popover"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="journey-popover-head">
          <div className="journey-popover-head-copy">
            <p className="eyebrow">Stage detail</p>
            <h3 className="section-heading">{stage.label}</h3>
            <p className="section-subtitle">{stage.summary}</p>
          </div>
          <button aria-label="Close stage detail" className="journey-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="journey-popover-status">
          <TrustBadge state={stage.trustState} />
          <p className="subtle">{reason}</p>
        </div>
        <div className="journey-popover-body">
          <section className="journey-evidence-section">
            <h4>Trust evidence</h4>
            <div className="journey-evidence-grid">
              {evidence.map((item) => (
                <div className="journey-evidence-row" key={`${stage.id}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong title={item.value}>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="journey-evidence-section">
            <h4>Lineage evidence</h4>
            <div className="journey-node-list">
              {lineage.map((item) => (
                <div className="journey-node-row" key={`${stage.id}-${item.label}`}>
                  <div className="journey-node-title">
                    <strong>{item.label}</strong>
                    <span className="journey-node-source">{item.source}</span>
                  </div>
                  <p title={item.value}>{item.value}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="journey-evidence-section">
            <h4>Actions</h4>
            <div className="journey-actions">
              <Link className="secondary-link" href={`/governance/kpi/${kpi.slug}/trace`}>
                See technical trace
              </Link>
              {asset ? (
                <Link className="secondary-link" href={`/governance/asset/${asset.id}`}>
                  See full asset detail
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export function KpiTrustJourney({
  useCase,
  kpi,
  asset,
}: {
  useCase: GovernanceUseCase;
  kpi: GovernanceKpi;
  asset: GovernedDataset | null;
}) {
  const stages = useMemo(() => buildStages(useCase, kpi, asset), [asset, kpi, useCase]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? null;

  return (
    <>
      <section className="panel governance-journey-panel">
        <div className="governance-journey-head">
          <div>
            <p className="eyebrow">Trust journey</p>
            <h3 className="section-heading">{kpi.label}</h3>
            <p className="section-subtitle">Select a stage to inspect trust evidence and instrumentation status.</p>
          </div>
        </div>
        <div className="governance-journey">
          {stages.map((stage, index) => (
            <button
              aria-label={`Stage ${index + 1} of ${stages.length}, ${stage.label}, ${stage.trustState}`}
              className={`journey-stage ${stage.trustState}${selectedStageId === stage.id ? " selected" : ""}`}
              key={stage.id}
              type="button"
              onClick={() => setSelectedStageId(stage.id)}
            >
              <div className="journey-stage-top">
                <span className="journey-stage-index">Stage {index + 1}</span>
                <TrustBadge state={stage.trustState} />
              </div>
              <strong>{stage.label}</strong>
              <p>{stage.summary}</p>
              <div className="journey-chip-row">
                {stage.chips.map((chip) => (
                  <SignalChip
                    key={`${stage.id}-${chip.label}`}
                    label={chip.label}
                    value={chip.value}
                    tone={chip.tone}
                    href={chip.href}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="journey-links">
          <button className="secondary-link" type="button" onClick={() => setSelectedStageId("source")}>
            Inspect stage
          </button>
          {asset ? (
            <Link className="secondary-link" href={`/governance/asset/${asset.id}`}>
              See full asset detail
            </Link>
          ) : null}
        </div>
      </section>
      {selectedStage ? (
        <StageDetailPopover
          stage={selectedStage}
          useCase={useCase}
          kpi={kpi}
          asset={asset}
          onClose={() => setSelectedStageId(null)}
        />
      ) : null}
    </>
  );
}
