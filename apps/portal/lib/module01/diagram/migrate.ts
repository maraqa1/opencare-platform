import {
  COMPONENT_TYPES, CONNECTION_METHODS, CONNECTION_MODES, DIAGRAM_TYPES, FREQUENCIES,
  emptyArchitectureDiagram, type ArchitectureDiagramModel, type ComponentType,
  type ConnectionMethod, type Frequency,
} from "./model";

const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const text = (value: unknown, fallback = "unknown") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const id = (value: unknown, fallback: string) => typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : fallback;

function inferType(name: string): { type: ComponentType; review: boolean } {
  const value = name.toLowerCase();
  if (/database|warehouse|data lake|store|sql/.test(value)) return { type: "data_store", review: false };
  if (/dashboard|report|power bi|tableau|analytics/.test(value)) return { type: "consumption_tool", review: false };
  if (/analyst|user|manager|team|officer|person/.test(value)) return { type: "person", review: false };
  if (/workbook|spreadsheet|excel|csv/.test(value)) return { type: "manual_artifact", review: false };
  if (/integration|api|etl|pipeline|gateway|middleware/.test(value)) return { type: "integration", review: false };
  if (/external|partner|vendor|regulator/.test(value)) return { type: "external_party", review: false };
  if (/system|application|platform|erp|crm|ehr|pms/.test(value)) return { type: "source_system", review: false };
  return { type: "source_system", review: true };
}

function inferMethod(label: string): ConnectionMethod {
  const value = label.toLowerCase();
  if (/sftp|ftp|csv|file/.test(value)) return "file_transfer";
  if (/api/.test(value)) return "api";
  if (/database|db link|sql/.test(value)) return "database_link";
  if (/refresh/.test(value)) return "scheduled_refresh";
  if (/stream/.test(value)) return "streaming";
  if (/export|extract|reconcil/.test(value)) return "manual_export";
  if (/email/.test(value)) return "email";
  return "unknown";
}
function inferFrequency(label: string): Frequency {
  const value = label.toLowerCase();
  if (/real.?time/.test(value)) return "real_time";
  if (/hour/.test(value)) return "hourly";
  if (/daily|nightly|morning|each day/.test(value)) return "daily";
  if (/weekly|week/.test(value)) return "weekly";
  if (/monthly|month/.test(value)) return "monthly";
  if (/ad.?hoc|on demand/.test(value)) return "ad_hoc";
  return "unknown";
}

export function migrateArchitectureDiagram(value: unknown, context: Partial<ArchitectureDiagramModel> = {}): ArchitectureDiagramModel {
  const raw = object(value), nested = object(raw.diagram);
  const source = Object.keys(nested).length ? nested : raw;
  const rawComponents = Array.isArray(source.components) ? source.components : Array.isArray(source.nodes) ? source.nodes : [];
  const review: string[] = [];
  const seenComponents = new Set<string>();
  const components = rawComponents.map((item, index) => {
    const component = object(item), componentId = id(component.id, `component-${index + 1}`);
    const name = text(component.name ?? component.label, `Component ${index + 1}`);
    const inferred = inferType(name);
    const type = COMPONENT_TYPES.includes(component.type) ? component.type as ComponentType : inferred.type;
    if (!COMPONENT_TYPES.includes(component.type) && inferred.review) review.push(componentId);
    let unique = componentId, suffix = 1; while (seenComponents.has(unique)) unique = `${componentId}-${++suffix}`; seenComponents.add(unique);
    return { id: unique, name, type, product: text(component.product), owner: text(component.owner), ...(text(component.group, "") ? { group: text(component.group, "") } : {}), ...(text(component.notes ?? component.sourceQuote, "") ? { notes: text(component.notes ?? component.sourceQuote, "") } : {}), ...(text(component.known_issue, "") ? { known_issue: text(component.known_issue, "") } : {}) };
  });
  const legacyIdMap = new Map(rawComponents.map((item, i) => [text(object(item).id, `component-${i + 1}`), components[i]?.id]));
  const rawConnections = Array.isArray(source.connections) ? source.connections : Array.isArray(source.edges) ? source.edges : [];
  const seenConnections = new Set<string>();
  const connections = rawConnections.map((item, index) => {
    const connection = object(item), baseId = id(connection.id, `connection-${index + 1}`); let unique = baseId, suffix = 1;
    while (seenConnections.has(unique)) unique = `${baseId}-${++suffix}`; seenConnections.add(unique);
    const label = text(connection.label, "Data flow");
    const method = CONNECTION_METHODS.includes(connection.method) ? connection.method as ConnectionMethod : inferMethod(label);
    const frequency = FREQUENCIES.includes(connection.frequency) ? connection.frequency as Frequency : inferFrequency(label);
    const mode = CONNECTION_MODES.includes(connection.mode) ? connection.mode : ["manual_export", "email"].includes(method) || /manual|reconcil/.test(label.toLowerCase()) ? "manual" : "automated";
    return { id: unique, from: legacyIdMap.get(text(connection.from ?? connection.source)) ?? text(connection.from ?? connection.source), to: legacyIdMap.get(text(connection.to ?? connection.target)) ?? text(connection.to ?? connection.target), label, mode, method, frequency, ...(text(connection.known_issue, "") ? { known_issue: text(connection.known_issue, "") } : {}) };
  });
  const migrationReview = [...new Set([...(Array.isArray(source.migration_review) ? source.migration_review : []), ...review])].filter(v => typeof v === "string").sort();
  const assumptions = Array.isArray(source.assumptions) ? source.assumptions.filter((v: unknown) => typeof v === "string") : [];
  const model = emptyArchitectureDiagram({
    id: id(source.id, context.id ?? "architecture-current-state"),
    assessment_id: text(source.assessment_id ?? context.assessment_id),
    diagram_type: DIAGRAM_TYPES.includes(source.diagram_type) ? source.diagram_type : "current_state_data_flow",
    title: text(source.title, "Current-state architecture"),
    scope: text(source.scope ?? context.scope), as_of: text(source.as_of ?? context.as_of),
    status: source.status === "confirmed" || source.confirmed === true ? "confirmed" : "draft",
    source: source.source === "structured" || source.origin === "manual"
      ? "structured"
      : source.source === "ai_draft" || source.origin === "ai_draft" || context.source === "ai_draft"
        ? "ai_draft"
        : "structured",
    ...(text(source.confirmed_by, "") ? { confirmed_by: text(source.confirmed_by, "") } : {}),
    ...(text(source.confirmed_at, "") ? { confirmed_at: text(source.confirmed_at, "") } : {}),
    accepted_unknowns: Array.isArray(source.accepted_unknowns) ? [...new Set(source.accepted_unknowns.filter((v: unknown) => typeof v === "string"))].sort() : [],
    components, connections,
    ...(migrationReview.length ? { migration_review: migrationReview } : {}),
    ...(assumptions.length ? { assumptions } : {}),
  });
  return model;
}
