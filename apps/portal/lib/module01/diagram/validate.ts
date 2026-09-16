import {
  COMPONENT_TYPES, CONNECTION_METHODS, CONNECTION_MODES, DIAGRAM_TYPES, FREQUENCIES,
  type ArchitectureDiagramModel,
} from "./model";
import { unmappedComponentTypes } from "./lanes";

export interface DiagramValidation { valid: boolean; errors: string[]; warnings: string[] }

export function validateDiagram(model: ArchitectureDiagramModel): DiagramValidation {
  const errors: string[] = [], warnings: string[] = [];
  if (!DIAGRAM_TYPES.includes(model.diagram_type)) errors.push(`Invalid diagram_type: ${String(model.diagram_type)}`);
  if (!["draft", "confirmed"].includes(model.status)) errors.push(`Invalid diagram status: ${String(model.status)}`);
  if (!["structured", "ai_draft"].includes(model.source)) errors.push(`Invalid diagram source: ${String(model.source)}`);
  const componentIds = new Set<string>(), connectionIds = new Set<string>(), names = new Map<string, number>();
  for (const component of model.components) {
    if (!component.id || componentIds.has(component.id)) errors.push(`Duplicate component id: ${component.id || "(empty)"}`);
    componentIds.add(component.id);
    if (!component.name.trim()) errors.push(`Component ${component.id} has no name.`);
    if (!component.product?.trim()) errors.push(`Component ${component.id} has no product value; use unknown when not known.`);
    if (!component.owner?.trim()) errors.push(`Component ${component.id} has no owner value; use unknown when not known.`);
    if (!COMPONENT_TYPES.includes(component.type)) errors.push(`Component ${component.id} has invalid type: ${String(component.type)}`);
    const key = component.name.trim().toLowerCase(); names.set(key, (names.get(key) ?? 0) + 1);
  }
  for (const [name, count] of names) if (count > 1) warnings.push(`Duplicate component name: ${name}`);
  for (const connection of model.connections) {
    if (!connection.id || connectionIds.has(connection.id)) errors.push(`Duplicate connection id: ${connection.id || "(empty)"}`);
    connectionIds.add(connection.id);
    if (!componentIds.has(connection.from)) errors.push(`Connection ${connection.id} references missing source component ${connection.from}.`);
    if (!componentIds.has(connection.to)) errors.push(`Connection ${connection.id} references missing target component ${connection.to}.`);
    if (!connection.label?.trim()) errors.push(`Connection ${connection.id} has no label.`);
    if (!CONNECTION_MODES.includes(connection.mode)) errors.push(`Connection ${connection.id} has invalid mode: ${String(connection.mode)}`);
    if (!CONNECTION_METHODS.includes(connection.method)) errors.push(`Connection ${connection.id} has invalid method: ${String(connection.method)}`);
    if (!FREQUENCIES.includes(connection.frequency)) errors.push(`Connection ${connection.id} has invalid frequency: ${String(connection.frequency)}`);
    if (connection.from === connection.to) warnings.push(`Connection ${connection.id} is self-referencing.`);
  }
  if (DIAGRAM_TYPES.includes(model.diagram_type)) {
    const unmapped = unmappedComponentTypes(model.diagram_type);
    if (unmapped.length) errors.push(`Unmapped component types: ${unmapped.join(", ")}`);
  }
  return { valid: errors.length === 0, errors, warnings };
}
