export const DIAGRAM_TYPES = ["current_state_data_flow"] as const;
export type DiagramType = typeof DIAGRAM_TYPES[number];

export const COMPONENT_TYPES = [
  "source_system", "integration", "processing", "data_store",
  "consumption_tool", "external_party", "person", "manual_artifact",
] as const;
export type ComponentType = typeof COMPONENT_TYPES[number];

export const CONNECTION_MODES = ["automated", "manual"] as const;
export type ConnectionMode = typeof CONNECTION_MODES[number];

export const CONNECTION_METHODS = [
  "file_transfer", "api", "database_link", "scheduled_refresh",
  "streaming", "manual_export", "email", "unknown",
] as const;
export type ConnectionMethod = typeof CONNECTION_METHODS[number];

export const FREQUENCIES = ["real_time", "hourly", "daily", "weekly", "monthly", "ad_hoc", "unknown"] as const;
export type Frequency = typeof FREQUENCIES[number];

export interface DiagramComponent {
  id: string;
  name: string;
  type: ComponentType;
  product: string;
  owner: string;
  group?: string;
  notes?: string;
  known_issue?: string;
}

export interface DiagramConnection {
  id: string;
  from: string;
  to: string;
  label: string;
  mode: ConnectionMode;
  method: ConnectionMethod;
  frequency: Frequency;
  known_issue?: string;
}

export interface ArchitectureDiagramModel {
  id: string;
  assessment_id: string;
  diagram_type: DiagramType;
  title: string;
  scope: string;
  as_of: string;
  status: "draft" | "confirmed";
  source: "structured" | "ai_draft";
  confirmed_by?: string;
  confirmed_at?: string;
  accepted_unknowns: string[];
  components: DiagramComponent[];
  connections: DiagramConnection[];
  migration_review?: string[];
  assumptions?: string[];
}

export const HUMAN_COMPONENT_TYPES: Record<ComponentType, string> = {
  source_system: "Source system", integration: "Integration", processing: "Processing",
  data_store: "Data store", consumption_tool: "Consumption tool", external_party: "External party",
  person: "Person", manual_artifact: "Manual artefact",
};

export function emptyArchitectureDiagram(overrides: Partial<ArchitectureDiagramModel> = {}): ArchitectureDiagramModel {
  return {
    id: "architecture-current-state",
    assessment_id: "unknown",
    diagram_type: "current_state_data_flow",
    title: "Current-state architecture",
    scope: "unknown",
    as_of: "unknown",
    status: "draft",
    source: "structured",
    accepted_unknowns: [],
    components: [],
    connections: [],
    ...overrides,
  };
}

export const isUnknown = (value: unknown) => typeof value !== "string" || !value.trim() || value.trim().toLowerCase() === "unknown";

