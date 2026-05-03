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

function buildStages(useCase: GovernanceUseCase, asset: GovernedDataset | null): JourneyStage[] {
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
          value: sourceNodes[0]?.owner ?? "Not yet instrumented",
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
          value: asset ? `${asset.schema}.${asset.table}` : "Not yet instrumented",
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
          value: asset?.freshnessStatus ?? "Not yet instrumented",
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
          value: asset?.testStatus ?? "Not yet instrumented",
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
          value: "Not yet instrumented",
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
          value: asset?.relatedDashboards?.[0] ?? "Not yet instrumented",
          tone: asset?.relatedDashboards?.length ? "neutral" : "warning",
        },
        {
          label: "Glossary",
          value: "View terms",
          tone: "neutral",
          href: "/dictionary",
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
          label: "Compliance",
          value: "Curated badge",
          tone: "neutral",
        },
        {
          label: "Action path",
          value: asset?.downstreamConsumers?.[0] ?? useCase.downstreamConsumers[0] ?? "Not yet instrumented",
          tone: "neutral",
        },
      ],
    },
  ];
}

function StageDetailPopover({
  stage,
  onClose,
}: {
  stage: JourneyStage;
  onClose: () => void;
}) {
  return (
    <div className="journey-popover-backdrop" role="presentation" onClick={onClose}>
      <aside
        aria-label={`${stage.label} details`}
        className="journey-popover"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="journey-popover-head">
          <div>
            <p className="eyebrow">Stage detail</p>
            <h3 className="section-heading">{stage.label}</h3>
            <p className="section-subtitle">{stage.summary}</p>
          </div>
          <button className="secondary-link" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <TrustBadge state={stage.trustState} />
        <div className="journey-popover-body">
          <div className="governance-inline-list">
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
          <div className="journey-node-list">
            {stage.nodes.map((node) => (
              <div className="journey-node-row" key={node.id}>
                <div className="journey-node-title">
                  <strong>{node.label}</strong>
                  <span className="journey-node-source">{node.curated ? "Curated" : "Discovered"}</span>
                </div>
                <p>{node.description ?? "Not yet instrumented"}</p>
              </div>
            ))}
            {stage.nodes.length === 0 ? (
              <p className="subtle">This stage is not yet instrumented for detailed node evidence.</p>
            ) : null}
          </div>
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
  const stages = useMemo(() => buildStages(useCase, asset), [asset, useCase]);
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
              className={`journey-stage ${stage.trustState}`}
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
          <Link className="secondary-link" href="/dictionary">
            Open glossary
          </Link>
          {asset ? (
            <Link className="secondary-link" href={`/governance/asset/${asset.id}`}>
              See full asset detail
            </Link>
          ) : null}
        </div>
      </section>
      {selectedStage ? <StageDetailPopover stage={selectedStage} onClose={() => setSelectedStageId(null)} /> : null}
    </>
  );
}
