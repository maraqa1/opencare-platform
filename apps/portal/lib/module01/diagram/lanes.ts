import { COMPONENT_TYPES, type ComponentType, type DiagramType } from "./model";

export interface LaneDefinition { key: string; types: readonly ComponentType[] }
export interface LaneConfiguration { columns: readonly LaneDefinition[]; bottom_row: LaneDefinition }

export const LANES: Record<DiagramType, LaneConfiguration> = {
  current_state_data_flow: {
    columns: [
      { key: "sources", types: ["source_system", "external_party"] },
      { key: "integration", types: ["integration", "processing"] },
      { key: "stores", types: ["data_store"] },
      { key: "consumption", types: ["consumption_tool"] },
    ],
    bottom_row: { key: "people", types: ["person", "manual_artifact"] },
  },
};

export function laneForType(diagramType: DiagramType, type: ComponentType): { key: string; bottom: boolean } {
  const config = LANES[diagramType];
  const column = config.columns.find(lane => lane.types.includes(type));
  if (column) return { key: column.key, bottom: false };
  if (config.bottom_row.types.includes(type)) return { key: config.bottom_row.key, bottom: true };
  throw new Error(`Component type ${type} is not mapped for ${diagramType}.`);
}

export function unmappedComponentTypes(diagramType: DiagramType): ComponentType[] {
  return COMPONENT_TYPES.filter(type => {
    try { laneForType(diagramType, type); return false; } catch { return true; }
  });
}

