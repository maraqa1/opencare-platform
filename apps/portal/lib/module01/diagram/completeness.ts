import { isUnknown, type ArchitectureDiagramModel } from "./model";

export interface DiagramCompleteness { known: number; total: number; percentage: number | null; label: string }

export function calculateCompleteness(model: ArchitectureDiagramModel): DiagramCompleteness {
  const values: string[] = [];
  for (const component of model.components) values.push(component.product, component.owner);
  for (const connection of model.connections) values.push(connection.method, connection.frequency);
  const known = values.filter(value => !isUnknown(value)).length;
  const percentage = values.length ? Math.round((known / values.length) * 100) : null;
  return { known, total: values.length, percentage, label: percentage === null ? "n/a" : `${percentage}%` };
}

