"use client";

import { useEffect, useMemo, useState } from "react";

const NODE_COLOURS = {
  source: { bg: "#ffebee", border: "#e53935", text: "#b71c1c", label: "Source" },
  staging: { bg: "#fff3e0", border: "#fb8c00", text: "#e65100", label: "Staging" },
  analytics: { bg: "#e8f5e9", border: "#43a047", text: "#2e7d32", label: "Analytics" },
  output: { bg: "#e3f2fd", border: "#1e88e5", text: "#1565c0", label: "Output" },
  portal: { bg: "#f3e5f5", border: "#8e24aa", text: "#6a1b9a", label: "Portal" },
} as const;

type Stage = keyof typeof NODE_COLOURS;

type LineageColumn = {
  type?: string;
  description?: string;
  meta?: Record<string, unknown>;
};

type LineageTest = {
  name: string;
  test_type?: string;
  column?: string | null;
  severity?: string;
  status?: string;
};

type LineageNode = {
  id: string;
  name?: string;
  label: string;
  stage: Stage;
  schema?: string;
  qualified_name?: string;
  description?: string;
  columns?: Record<string, LineageColumn>;
  tests?: LineageTest[];
  meta?: Record<string, unknown>;
};

type LineageEdge = {
  from: string;
  to: string;
};

type LineagePayload = {
  model: string;
  description?: string;
  nodes?: LineageNode[];
  edges?: LineageEdge[];
  tests?: LineageTest[];
};

function LineageSkeleton() {
  return (
    <section className="governance-card lineage-card" aria-label="Loading lineage">
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">Traceability</p>
          <h3>Data Lineage</h3>
        </div>
      </div>
      <div className="lineage-skeleton">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="skeleton-line" style={{ height: 88 }} />
        ))}
      </div>
    </section>
  );
}

function niceLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function LineageDAG({ modelName }: { modelName: string }) {
  const [payload, setPayload] = useState<LineagePayload | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setSelectedNodeId(null);

    async function loadLineage() {
      const response = await fetch(`/api/portal/api/v1/lineage/models/${encodeURIComponent(modelName)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load lineage.");
      }
      const nextPayload = (await response.json()) as LineagePayload;
      if (!cancelled) {
        setPayload(nextPayload);
        setSelectedNodeId(nextPayload.nodes?.[0]?.id ?? null);
      }
    }

    loadLineage().catch(() => {
      if (!cancelled) {
        setPayload({ model: modelName, nodes: [], edges: [] });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [modelName]);

  const { nodes, edges, positions, width, height } = useMemo(() => {
    const graphNodes = payload?.nodes ?? [];
    const graphEdges = payload?.edges ?? [];
    const grouped = new Map<Stage, LineageNode[]>();
    (Object.keys(NODE_COLOURS) as Stage[]).forEach((stage) => grouped.set(stage, []));
    graphNodes.forEach((node) => grouped.get(node.stage)?.push(node));

    const maxRows = Math.max(...Array.from(grouped.values()).map((value) => value.length || 1), 1);
    const nextPositions = new Map<string, { x: number; y: number; width: number; height: number }>();
    const nodeWidth = 188;
    const nodeHeight = 78;
    const stageGap = 216;
    const rowGap = 108;
    const paddingX = 32;
    const paddingY = 30;
    const stages = Object.keys(NODE_COLOURS) as Stage[];

    stages.forEach((stage, stageIdx) => {
      const stageNodes = grouped.get(stage) ?? [];
      const offset = Math.max(0, (maxRows - stageNodes.length) * rowGap * 0.5);
      stageNodes.forEach((node, rowIdx) => {
        nextPositions.set(node.id, {
          x: paddingX + stageIdx * stageGap,
          y: paddingY + offset + rowIdx * rowGap,
          width: nodeWidth,
          height: nodeHeight,
        });
      });
    });

    return {
      nodes: graphNodes,
      edges: graphEdges,
      positions: nextPositions,
      width: paddingX * 2 + nodeWidth + stageGap * (stages.length - 1),
      height: paddingY * 2 + Math.max(maxRows * rowGap, nodeHeight),
    };
  }, [payload]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  if (!payload) {
    return <LineageSkeleton />;
  }

  return (
    <section className="governance-card lineage-card">
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">Traceability</p>
          <h3>Data Lineage: {niceLabel(payload.model)}</h3>
          <p className="section-subtitle">
            Complete data journey from hospital source tables to the live portal display.
          </p>
        </div>
        <div className="lineage-legend">
          {(Object.entries(NODE_COLOURS) as Array<[Stage, (typeof NODE_COLOURS)[Stage]]>).map(([key, value]) => (
            <span key={key} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: value.border }} />
              {value.label}
            </span>
          ))}
        </div>
      </div>

      <div className="lineage-layout">
        <div className="lineage-canvas-shell">
          {nodes.length > 0 ? (
            <svg
              className="lineage-canvas"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`Data lineage graph for ${payload.model}`}
            >
              {edges.map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                if (!from || !to) {
                  return null;
                }
                const startX = from.x + from.width;
                const startY = from.y + from.height / 2;
                const endX = to.x;
                const endY = to.y + to.height / 2;
                const curve = Math.max(48, (endX - startX) / 2);
                return (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`}
                    className="lineage-edge"
                  />
                );
              })}
              {nodes.map((node) => {
                const position = positions.get(node.id);
                if (!position) {
                  return null;
                }
                const colours = NODE_COLOURS[node.stage];
                const isSelected = node.id === selectedNodeId;
                return (
                  <g
                    key={node.id}
                    className={isSelected ? "lineage-node selected" : "lineage-node"}
                    onClick={() => setSelectedNodeId(node.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedNodeId(node.id);
                      }
                    }}
                  >
                    <rect
                      x={position.x}
                      y={position.y}
                      width={position.width}
                      height={position.height}
                      rx="18"
                      fill={colours.bg}
                      stroke={colours.border}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    <rect
                      x={position.x}
                      y={position.y}
                      width="6"
                      height={position.height}
                      rx="18"
                      fill={colours.border}
                    />
                    <text x={position.x + 18} y={position.y + 28} className="lineage-node-title" fill={colours.text}>
                      {node.label}
                    </text>
                    <text x={position.x + 18} y={position.y + 48} className="lineage-node-subtitle" fill="#5f6b7a">
                      {node.schema ?? colours.label}
                    </text>
                    <text x={position.x + 18} y={position.y + 64} className="lineage-node-meta" fill="#7d8793">
                      {(node.tests ?? []).length > 0 ? `${(node.tests ?? []).length} tests` : colours.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="empty-state">No lineage metadata is available for this model yet.</div>
          )}
        </div>

        {selectedNode ? <NodeDetailPanel node={selectedNode} /> : null}
      </div>
    </section>
  );
}

function NodeDetailPanel({ node }: { node: LineageNode }) {
  const colours = NODE_COLOURS[node.stage];
  const columns = Object.entries(node.columns ?? {});

  return (
    <aside className="node-detail-panel" style={{ borderTopColor: colours.border }}>
      <div className="node-detail-header">
        <div>
          <p className="eyebrow">Selected Node</p>
          <h4 style={{ color: colours.text }}>{node.label}</h4>
        </div>
        <span className="stage-chip" style={{ backgroundColor: colours.bg, color: colours.text }}>
          {colours.label}
        </span>
      </div>

      {node.description ? <p className="node-description">{node.description}</p> : null}

      <div className="node-detail-meta">
        <div>
          <dt>Qualified Name</dt>
          <dd className="mono">{node.qualified_name ?? node.label}</dd>
        </div>
        <div>
          <dt>Schema</dt>
          <dd>{node.schema ?? "n/a"}</dd>
        </div>
      </div>

      {columns.length > 0 ? (
        <div className="node-table-shell">
          <h5>Columns</h5>
          <table className="lineage-detail-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {columns.map(([name, column]) => (
                <tr key={name}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>{column.type || "derived"}</td>
                  <td>{column.description || "No column description provided."}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {(node.tests ?? []).length > 0 ? (
        <div className="test-coverage">
          <h5>Tests ({node.tests?.length ?? 0})</h5>
          {(node.tests ?? []).map((test) => (
            <div key={`${test.name}-${test.column ?? "model"}`} className="test-item">
              <span className="test-icon">{test.status === "pass" ? "PASS" : "WARN"}</span>
              <div>
                <strong>{test.name}</strong>
                <p>
                  {test.test_type ?? "generic"}
                  {test.column ? ` on ${test.column}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
