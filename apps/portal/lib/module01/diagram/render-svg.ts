import { calculateCompleteness } from "./completeness";
import { GEOMETRY, layoutDiagram, type BoxLayout } from "./layout";
import { HUMAN_COMPONENT_TYPES, isUnknown, type ArchitectureDiagramModel, type ComponentType } from "./model";
import { calculateRiskFlags } from "./risks";
import { routeDiagram } from "./routing";
import { validateDiagram, type DiagramValidation } from "./validate";

export interface SvgRenderOptions { expandedGroups?: string[]; themeClass?: string }
export interface SvgRenderResult { svg: string; validation: DiagramValidation; warnings: string[]; componentCount: number; connectionCount: number; expectedComponentCount: number; expectedConnectionCount: number; complete: boolean }
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const truncate = (value: string, length: number) => value.length > length ? `${value.slice(0, length - 1)}…` : value;
const path = (points: Array<{ x: number; y: number }>) => points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");

function icon(type: ComponentType, x: number, y: number) {
  const common = `fill="none" stroke="currentColor" stroke-width="1.5"`;
  if (type === "data_store") return `<ellipse cx="${x + 8}" cy="${y + 4}" rx="7" ry="3" ${common}/><path d="M${x + 1},${y + 4}v10c0 4 14 4 14 0V${y + 4}" ${common}/>`;
  if (type === "person") return `<circle cx="${x + 8}" cy="${y + 5}" r="4" ${common}/><path d="M${x + 1},${y + 17}c1-6 13-6 14 0" ${common}/>`;
  if (type === "manual_artifact") return `<rect x="${x + 1}" y="${y + 1}" width="14" height="16" rx="1" ${common}/><path d="M${x + 5},${y + 1}v16M${x + 10},${y + 1}v16M${x + 1},${y + 6}h14M${x + 1},${y + 11}h14" ${common}/>`;
  if (type === "consumption_tool") return `<rect x="${x + 1}" y="${y + 1}" width="15" height="12" rx="1" ${common}/><path d="M${x + 4},${y + 10}V${y + 7}M${x + 8},${y + 10}V${y + 4}M${x + 12},${y + 10}V${y + 6}M${x + 6},${y + 16}h6" ${common}/>`;
  if (type === "integration" || type === "processing") return `<path d="M${x + 1},${y + 5}h10l-3-3m3 3-3 3M${x + 15},${y + 13}H${x + 5}l3-3m-3 3 3 3" ${common}/>`;
  if (type === "external_party") return `<circle cx="${x + 8}" cy="${y + 9}" r="7" ${common}/><path d="M${x + 1},${y + 9}h14M${x + 8},${y + 2}c4 4 4 10 0 14M${x + 8},${y + 2}c-4 4-4 10 0 14" ${common}/>`;
  return `<rect x="${x + 1}" y="${y + 2}" width="14" height="14" rx="2" ${common}/><path d="M${x + 4},${y + 6}h8M${x + 4},${y + 10}h8M${x + 4},${y + 14}h5" ${common}/>`;
}

function description(model: ArchitectureDiagramModel) {
  const flows = model.connections.slice(0, 12).map(edge => { const from = model.components.find(item => item.id === edge.from)?.name ?? edge.from, to = model.components.find(item => item.id === edge.to)?.name ?? edge.to; return `${from} sends ${edge.label} to ${to}.`; });
  return `${model.components.length} components and ${model.connections.length} connections. ${flows.join(" ")}`;
}

function statusLabel(model: ArchitectureDiagramModel) {
  if (model.status === "confirmed") return `Confirmed by ${model.confirmed_by || "assessor"} on ${model.confirmed_at ? model.confirmed_at.slice(0, 10) : "date not recorded"}`;
  return model.source === "ai_draft" ? "AI-generated draft, unconfirmed" : "Drawn from assessment data, awaiting confirmation";
}

function renderBox(box: BoxLayout, model: ArchitectureDiagramModel, riskCount: number) {
  const item = box.component, dashed = isUnknown(item.product) || isUnknown(item.owner), bottom = box.bottom;
  const subtitle = isUnknown(item.product) ? HUMAN_COMPONENT_TYPES[item.type] : item.product;
  const name = truncate(box.label, 28), title = `${item.name}\nProduct: ${item.product}\nOwner: ${item.owner}`;
  return `<g class="architecture-node ${bottom ? "is-bottom" : "is-system"}" data-component-id="${esc(item.id)}" role="button" tabindex="0" aria-label="${esc(title)}">
    <title>${esc(title)}</title><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${GEOMETRY.radius}" class="node-box${dashed ? " is-missing" : ""}"/>
    <g class="node-icon">${icon(item.type, box.x + 12, box.y + 13)}</g><text x="${box.x + 38}" y="${box.y + 27}" class="node-name">${esc(name)}</text><text x="${box.x + 38}" y="${box.y + 47}" class="node-subtitle">${esc(truncate(subtitle, 31))}</text>
    ${riskCount ? `<g class="risk-badge"><circle cx="${box.x + box.width - 10}" cy="${box.y + 10}" r="10"/><text x="${box.x + box.width - 10}" y="${box.y + 14}">${riskCount}</text></g>` : ""}
    ${item.known_issue ? `<g class="issue-marker"><title>${esc(item.known_issue)}</title><circle cx="${box.x + 14}" cy="${box.y + box.height - 12}" r="8"/><text x="${box.x + 14}" y="${box.y + box.height - 8}">!</text></g>` : ""}
  </g>`;
}

export function renderArchitectureSvg(model: ArchitectureDiagramModel, _options: SvgRenderOptions = {}): SvgRenderResult {
  const validation = validateDiagram(model);
  if (!validation.valid) return { svg: "", validation, warnings: validation.warnings, componentCount: 0, connectionCount: 0, expectedComponentCount: model.components.length, expectedConnectionCount: model.connections.length, complete: false };
  const layout = layoutDiagram(model, { expandedGroups: _options.expandedGroups }), routes = routeDiagram(layout), risks = calculateRiskFlags(model), completeness = calculateCompleteness(model);
  const allPoints = routes.flatMap(route => route.points);
  const minX = Math.min(0, ...allPoints.map(point => point.x), ...routes.map(route => route.label.x)) - GEOMETRY.padding;
  const maxX = Math.max(layout.width, ...allPoints.map(point => point.x), ...routes.map(route => route.label.x + route.label.width)) + GEOMETRY.padding;
  const minY = Math.min(0, ...allPoints.map(point => point.y), ...routes.map(route => route.label.y)) - GEOMETRY.padding;
  const legendY = layout.height - 54, maxY = Math.max(layout.height, ...routes.map(route => route.label.y + route.label.height)) + GEOMETRY.padding;
  const riskCounts = new Map<string, number>(); for (const risk of risks) riskCounts.set(risk.itemId, (riskCounts.get(risk.itemId) ?? 0) + 1);
  const edges = routes.map(route => {
    const manual = route.connection.mode === "manual", issue = route.connection.known_issue;
    return `<g class="architecture-edge${manual ? " is-manual" : ""}" data-connection-id="${esc(route.connection.id)}" role="button" tabindex="0"><title>${esc(route.connection.label)}; ${esc(route.connection.method)}; ${esc(route.connection.frequency)}${issue ? `; issue: ${esc(issue)}` : ""}</title><path d="${path(route.points)}" marker-end="url(#architecture-arrow)"/><g class="edge-label">${route.label.keyed ? `<circle cx="${route.label.x + 9}" cy="${route.label.y + 9}" r="9"/><text x="${route.label.x + 9}" y="${route.label.y + 13}">${route.label.key}</text>` : `<rect x="${route.label.x}" y="${route.label.y}" width="${route.label.width}" height="${route.label.height}" rx="3"/><text x="${route.label.x + route.label.width / 2}" y="${route.label.y + 13}">${esc(route.label.text)}</text>`}${issue ? `<text class="edge-warning" x="${route.label.x + route.label.width + 5}" y="${route.label.y + 13}">!</text>` : ""}</g></g>`;
  }).join("");
  const expectedComponents = layout.grouped ? layout.boxes.length : model.components.length, expectedConnections = layout.grouped ? layout.connections.length : model.connections.length;
  const complete = layout.boxes.length === expectedComponents && routes.length === expectedConnections;
  const integrity = complete ? "" : `<g class="integrity-warning"><rect x="40" y="${minY + 8}" width="${layout.width - 80}" height="28"/><text x="52" y="${minY + 27}">Diagram incomplete: ${layout.boxes.length} of ${expectedComponents} components and ${routes.length} of ${expectedConnections} connections drawn</text></g>`;
  const keyed = routes.filter(route => route.label.keyed).map(route => `${route.label.key}. ${route.label.text}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="architecture-svg" role="img" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" preserveAspectRatio="xMidYMid meet" data-components="${layout.boxes.length}" data-connections="${routes.length}">
  <title>${esc(model.title)}</title><desc>${esc(description(model))}</desc><style>
  .architecture-svg{--diagram-system:#e8f1f4;--diagram-system-border:#527582;--diagram-manual:#fff1d6;--diagram-manual-border:#ad7016;--diagram-text:#172233;--diagram-muted:#576574;--diagram-edge:#4d5964;--diagram-risk:#b42318;--diagram-issue:#c9342f;width:100%;height:auto;font-family:Arial,sans-serif;color:var(--diagram-text)}
  .node-box{fill:var(--diagram-system);stroke:var(--diagram-system-border);stroke-width:1.5}.is-bottom .node-box{fill:var(--diagram-manual);stroke:var(--diagram-manual-border)}.node-box.is-missing{stroke-dasharray:6 4}.node-name{font-size:13px;font-weight:600;fill:var(--diagram-text)}.node-subtitle{font-size:12px;fill:var(--diagram-muted)}.node-icon{color:var(--diagram-system-border)}.is-bottom .node-icon{color:var(--diagram-manual-border)}
  .architecture-edge>path{fill:none;stroke:var(--diagram-edge);stroke-width:1.5}.architecture-edge.is-manual>path{stroke:var(--diagram-manual-border);stroke-dasharray:7 5}.edge-label rect{fill:white;stroke:#d8dde3}.edge-label text{font-size:12px;text-anchor:middle;fill:var(--diagram-muted)}.risk-badge circle,.issue-marker circle{fill:var(--diagram-risk)}.risk-badge text,.issue-marker text{fill:white;font-size:11px;font-weight:700;text-anchor:middle}.edge-warning{fill:var(--diagram-issue);font-weight:700}.integrity-warning rect{fill:#fee4e2;stroke:#d92d20}.integrity-warning text{fill:#912018;font-size:12px}.diagram-meta{font-size:12px;fill:var(--diagram-muted)}.legend-line{font-size:12px;fill:var(--diagram-text)}
  .architecture-node:focus .node-box,.architecture-edge:focus>path{stroke:#1976d2;stroke-width:3}
  </style><defs><marker id="architecture-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>
  ${integrity}<text x="40" y="${minY + 54}" class="diagram-meta">${esc(statusLabel(model))} · Detail completeness: ${completeness.label}</text>${edges}${layout.boxes.map(box => renderBox(box, model, box.componentIds.reduce((sum, id) => sum + (riskCounts.get(id) ?? 0), 0))).join("")}
  <g class="diagram-legend"><text x="40" y="${legendY}" class="legend-line">━━ Automated flow    ┄┄ Manual process    ╌ Detail missing    ● Risk flag    ! Known issue</text>${keyed.map((line, i) => `<text x="40" y="${legendY + 18 + i * 16}" class="diagram-meta">${esc(line)}</text>`).join("")}</g></svg>`;
  const warnings = [...validation.warnings, ...layout.warnings, ...routes.flatMap(route => route.warning ? [route.warning] : [])];
  return { svg, validation, warnings, componentCount: layout.boxes.length, connectionCount: routes.length, expectedComponentCount: expectedComponents, expectedConnectionCount: expectedConnections, complete };
}

export const architectureStatusLabel = statusLabel;
