import { isUnknown, type ArchitectureDiagramModel } from "./model";

export const DIAGNOSTIC_DOMAINS = {
  quality: "Data Quality & Master Data",
  metadata: "Metadata, Catalogue & Data Lineage",
  sources: "Data Sources & Data Flows",
  architecture: "Data Architecture & Infrastructure",
  governance: "Data Governance & Operating Model",
} as const;

export type DiagramRiskType = "manual_process" | "unknown_frequency" | "single_path" | "known_issue" | "orphan" | "missing_owner";
export interface DiagramRiskFlag { type: DiagramRiskType; itemId: string; itemName: string; summary: string; domains: string[] }

export function calculateRiskFlags(model: ArchitectureDiagramModel): DiagramRiskFlag[] {
  const flags: DiagramRiskFlag[] = [];
  const component = (id: string) => model.components.find(item => item.id === id);
  for (const connection of model.connections) {
    const name = `${component(connection.from)?.name ?? connection.from} to ${component(connection.to)?.name ?? connection.to}`;
    if (connection.mode === "manual") flags.push({ type: "manual_process", itemId: connection.id, itemName: name, summary: `${name} relies on a manual process.`, domains: [DIAGNOSTIC_DOMAINS.quality, DIAGNOSTIC_DOMAINS.metadata] });
    if (connection.frequency === "unknown") flags.push({ type: "unknown_frequency", itemId: connection.id, itemName: name, summary: `${name} has no confirmed refresh frequency.`, domains: [DIAGNOSTIC_DOMAINS.sources] });
    if (connection.known_issue?.trim()) flags.push({ type: "known_issue", itemId: connection.id, itemName: name, summary: `${name} has a known issue: ${connection.known_issue.trim()}`, domains: [DIAGNOSTIC_DOMAINS.sources] });
  }
  for (const item of model.components) {
    const linked = model.connections.filter(edge => edge.from === item.id || edge.to === item.id);
    const automatedIncoming = model.connections.filter(edge => edge.to === item.id && edge.mode === "automated");
    if (item.type === "consumption_tool" && automatedIncoming.length === 1) flags.push({ type: "single_path", itemId: item.id, itemName: item.name, summary: `${item.name} depends on a single automated input path.`, domains: [DIAGNOSTIC_DOMAINS.architecture] });
    if (item.known_issue?.trim()) flags.push({ type: "known_issue", itemId: item.id, itemName: item.name, summary: `${item.name} has a known issue: ${item.known_issue.trim()}`, domains: [DIAGNOSTIC_DOMAINS.sources] });
    if (!linked.length) flags.push({ type: "orphan", itemId: item.id, itemName: item.name, summary: `${item.name} is not connected to the documented data flow.`, domains: [DIAGNOSTIC_DOMAINS.metadata] });
    if (isUnknown(item.owner)) flags.push({ type: "missing_owner", itemId: item.id, itemName: item.name, summary: `${item.name} has no confirmed accountable owner.`, domains: [DIAGNOSTIC_DOMAINS.governance] });
  }
  return flags.sort((a, b) => a.itemId.localeCompare(b.itemId) || a.type.localeCompare(b.type));
}

