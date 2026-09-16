import { LANES, laneForType } from "./lanes";
import type { ArchitectureDiagramModel, DiagramComponent, DiagramConnection } from "./model";

export const GEOMETRY = { boxWidth: 188, boxHeight: 64, laneGap: 96, rowGap: 36, bottomGap: 88, padding: 40, radius: 6, inflate: 8 } as const;
export interface BoxLayout { id: string; x: number; y: number; width: number; height: number; lane: string; bottom: boolean; componentIds: string[]; label: string; component: DiagramComponent }
export interface LayoutConnection extends DiagramConnection { originalIds: string[]; count: number }
export interface DiagramLayout { boxes: BoxLayout[]; connections: LayoutConnection[]; width: number; height: number; topCorridorY: number; bottomCorridorY: number; grouped: boolean; warnings: string[] }

function rankComponents(components: DiagramComponent[], connections: DiagramConnection[]): Map<string, number> {
  const ids = new Set(components.map(item => item.id));
  const outgoing = new Map<string, string[]>();
  for (const id of ids) outgoing.set(id, []);
  for (const edge of connections.filter(edge => edge.mode === "automated" && ids.has(edge.from) && ids.has(edge.to))) outgoing.get(edge.from)!.push(edge.to);
  for (const values of outgoing.values()) values.sort();
  const state = new Map<string, number>(), kept = new Map<string, string[]>();
  for (const id of ids) kept.set(id, []);
  const visit = (id: string) => {
    state.set(id, 1);
    for (const next of outgoing.get(id) ?? []) {
      if (state.get(next) === 1) continue;
      kept.get(id)!.push(next);
      if (!state.get(next)) visit(next);
    }
    state.set(id, 2);
  };
  [...ids].sort().forEach(id => { if (!state.get(id)) visit(id); });
  const incoming = new Map<string, string[]>(); for (const id of ids) incoming.set(id, []);
  for (const [from, tos] of kept) for (const to of tos) incoming.get(to)!.push(from);
  const memo = new Map<string, number>();
  const depth = (id: string): number => { if (memo.has(id)) return memo.get(id)!; const value = Math.max(0, ...(incoming.get(id) ?? []).map(parent => depth(parent) + 1)); memo.set(id, value); return value; };
  for (const id of ids) depth(id);
  return memo;
}

function collapse(model: ArchitectureDiagramModel, expandedGroups: Set<string>) {
  if (model.components.length <= 25 || !model.components.some(item => item.group?.trim())) return { components: model.components, connections: model.connections.map(edge => ({ ...edge, originalIds: [edge.id], count: 1 })), grouped: false };
  const groupMembers = new Map<string, DiagramComponent[]>(), map = new Map<string, string>(); const components: DiagramComponent[] = [];
  for (const item of model.components) {
    if (!item.group?.trim()) { components.push(item); map.set(item.id, item.id); continue; }
    const key = item.group.trim(); if (!groupMembers.has(key)) groupMembers.set(key, []); groupMembers.get(key)!.push(item);
  }
  for (const [group, members] of [...groupMembers].sort(([a], [b]) => a.localeCompare(b))) {
    const id = `group-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    if (expandedGroups.has(group)) { members.forEach(item => { components.push(item); map.set(item.id, item.id); }); continue; }
    components.push({ id, name: `${group} (${members.length})`, type: members[0].type, product: "Grouped view", owner: members.every(item => item.owner === members[0].owner) ? members[0].owner : "unknown", group });
    members.forEach(item => map.set(item.id, id));
  }
  const aggregated = new Map<string, LayoutConnection>();
  for (const edge of model.connections) {
    const from = map.get(edge.from)!, to = map.get(edge.to)!, key = `${from}|${to}|${edge.mode}`;
    if (aggregated.has(key)) { const current = aggregated.get(key)!; current.count++; current.originalIds.push(edge.id); continue; }
    aggregated.set(key, { ...edge, id: `aggregate-${aggregated.size + 1}`, from, to, label: edge.label, originalIds: [edge.id], count: 1 });
  }
  return { components, connections: [...aggregated.values()], grouped: components.length < model.components.length };
}

export function layoutDiagram(model: ArchitectureDiagramModel, options: { expandedGroups?: string[] } = {}): DiagramLayout {
  const warnings: string[] = [], view = collapse(model, new Set(options.expandedGroups ?? [])), rank = rankComponents(view.components, view.connections);
  const config = LANES[model.diagram_type], byLane = new Map<string, DiagramComponent[]>();
  for (const item of view.components) { const lane = laneForType(model.diagram_type, item.type); if (!byLane.has(lane.key)) byLane.set(lane.key, []); byLane.get(lane.key)!.push(item); }
  const activeColumns = config.columns.filter(lane => (byLane.get(lane.key)?.length ?? 0) > 0);
  for (const lane of activeColumns) byLane.get(lane.key)!.sort((a, b) => (rank.get(a.id)! - rank.get(b.id)!) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const neighbours = (id: string, adjacent: Set<string>) => view.connections.flatMap(edge => edge.from === id && adjacent.has(edge.to) ? [edge.to] : edge.to === id && adjacent.has(edge.from) ? [edge.from] : []);
  for (const direction of [1, -1]) {
    const lanes = direction === 1 ? activeColumns : [...activeColumns].reverse();
    for (let i = 1; i < lanes.length; i++) {
      const previous = byLane.get(lanes[i - 1].key)!, current = byLane.get(lanes[i].key)!, positions = new Map(previous.map((item, index) => [item.id, index]));
      const adjacent = new Set(previous.map(item => item.id));
      current.sort((a, b) => { const mean = (item: DiagramComponent) => { const ns = neighbours(item.id, adjacent); return ns.length ? ns.reduce((sum, n) => sum + positions.get(n)!, 0) / ns.length : Number.MAX_SAFE_INTEGER; }; return mean(a) - mean(b); });
    }
  }
  const tallest = Math.max(1, ...activeColumns.map(lane => byLane.get(lane.key)!.length));
  const boxes: BoxLayout[] = [];
  activeColumns.forEach((lane, column) => {
    const items = byLane.get(lane.key)!, contentHeight = items.length * GEOMETRY.boxHeight + Math.max(0, items.length - 1) * GEOMETRY.rowGap;
    const maxHeight = tallest * GEOMETRY.boxHeight + Math.max(0, tallest - 1) * GEOMETRY.rowGap;
    const startY = GEOMETRY.padding + 36 + (maxHeight - contentHeight) / 2;
    items.forEach((component, row) => boxes.push({ id: component.id, x: GEOMETRY.padding + column * (GEOMETRY.boxWidth + GEOMETRY.laneGap), y: startY + row * (GEOMETRY.boxHeight + GEOMETRY.rowGap), width: GEOMETRY.boxWidth, height: GEOMETRY.boxHeight, lane: lane.key, bottom: false, componentIds: component.id.startsWith("group-") && component.group ? model.components.filter(item => item.group === component.group).map(item => item.id) : [component.id], label: component.name, component }));
  });
  const columnHeight = tallest * GEOMETRY.boxHeight + Math.max(0, tallest - 1) * GEOMETRY.rowGap;
  const bottomY = GEOMETRY.padding + 36 + columnHeight + GEOMETRY.bottomGap;
  const bottom = byLane.get(config.bottom_row.key) ?? [], connectedMean = (item: DiagramComponent) => {
    const linked = view.connections.flatMap(edge => edge.from === item.id ? [edge.to] : edge.to === item.id ? [edge.from] : []), xs = linked.map(id => boxes.find(box => box.id === id)).filter(Boolean).map(box => box!.x + box!.width / 2);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.MAX_SAFE_INTEGER;
  };
  bottom.sort((a, b) => connectedMean(a) - connectedMean(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  let nextX = GEOMETRY.padding;
  for (const component of bottom) { const desired = connectedMean(component); const x = Math.max(nextX, Number.isFinite(desired) ? desired - GEOMETRY.boxWidth / 2 : nextX); boxes.push({ id: component.id, x, y: bottomY, width: GEOMETRY.boxWidth, height: GEOMETRY.boxHeight, lane: config.bottom_row.key, bottom: true, componentIds: [component.id], label: component.name, component }); nextX = x + GEOMETRY.boxWidth + 36; }
  const right = Math.max(GEOMETRY.padding + GEOMETRY.boxWidth, ...boxes.map(box => box.x + box.width));
  const bottomBound = Math.max(GEOMETRY.padding + GEOMETRY.boxHeight, ...boxes.map(box => box.y + box.height));
  return { boxes, connections: view.connections, width: right + GEOMETRY.padding, height: bottomBound + GEOMETRY.padding + 80, topCorridorY: 24, bottomCorridorY: bottomY - 28, grouped: view.grouped, warnings };
}
