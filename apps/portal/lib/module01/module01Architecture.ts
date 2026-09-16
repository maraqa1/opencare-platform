import type { ArchitectureNode, ArchitectureEdge } from "./module01Discovery";

// Ground every component and connection in a verbatim description excerpt.
// This is an extraction check, not proof of the relationship: confirmation remains mandatory.
export function validateArchitecture(value: unknown, description: string): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } {
  if (!value || typeof value !== "object") throw new Error("Architecture must be a JSON object.");
  const v = value as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(v.nodes) || !v.nodes.length || v.nodes.length > 20 || !Array.isArray(v.edges) || v.edges.length > 40) throw new Error("Invalid architecture shape or size.");
  const nodes: ArchitectureNode[] = v.nodes.map(n => {
    if (!n || typeof n.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(n.id) || typeof n.label !== "string" || !n.label.trim() || n.label.length > 100 || typeof n.sourceQuote !== "string" || !n.sourceQuote.trim() || n.sourceQuote.length > 500 || !description.includes(n.sourceQuote) || !n.sourceQuote.includes(n.label)) throw new Error("Ungrounded component rejected.");
    return { id: n.id, label: n.label, sourceQuote: n.sourceQuote };
  });
  if (new Set(nodes.map(n => n.id)).size !== nodes.length) throw new Error("Duplicate component IDs.");
  const edges: ArchitectureEdge[] = v.edges.map(e => {
    const source = nodes.find(n => n.id === e?.source), target = nodes.find(n => n.id === e?.target);
    if (!source || !target || typeof e.label !== "string" || !e.label.trim() || e.label.length > 100 || typeof e.sourceQuote !== "string" || !e.sourceQuote.trim() || e.sourceQuote.length > 500 || !description.includes(e.sourceQuote) || !e.sourceQuote.includes(source.label) || !e.sourceQuote.includes(target.label) || !e.sourceQuote.includes(e.label)) throw new Error("Ungrounded connection rejected.");
    return { source: source.id, target: target.id, label: e.label, sourceQuote: e.sourceQuote };
  });
  return { nodes, edges };
}
