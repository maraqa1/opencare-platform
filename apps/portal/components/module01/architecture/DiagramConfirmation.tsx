"use client";
import { isUnknown, type ArchitectureDiagramModel } from "@/lib/module01/diagram";

type Props = { model: ArchitectureDiagramModel; onChange: (model: ArchitectureDiagramModel) => void };
export function unknownDiagramFields(model: ArchitectureDiagramModel) {
  return [
    ...model.components.flatMap(item => (["product", "owner"] as const).filter(key => isUnknown(item[key])).map(key => ({ key: `component:${item.id}.${key}`, item: item.name, field: key }))),
    ...model.connections.flatMap(item => (["method", "frequency"] as const).filter(key => isUnknown(item[key])).map(key => ({ key: `connection:${item.id}.${key}`, item: item.label, field: key }))),
  ];
}

export function DiagramConfirmation({ model, onChange }: Props) {
  const unknowns = unknownDiagramFields(model), unresolved = unknowns.filter(item => !model.accepted_unknowns.includes(item.key));
  const update = (next: ArchitectureDiagramModel) => onChange({ ...next, status: "draft", confirmed_by: undefined, confirmed_at: undefined });
  return <section className="diagram-confirmation" aria-label="Diagram confirmation">
    <h4>Review missing architecture details</h4>
    {!model.components.length ? <p>Add at least one component before confirming the architecture.</p> : unknowns.length ? <div className="unknown-fields">{unknowns.map(item => <div key={item.key}><strong>{item.item}</strong><span>{item.field.replaceAll("_", " ")}</span>{model.accepted_unknowns.includes(item.key) ? <button type="button" onClick={() => update({ ...model, accepted_unknowns: model.accepted_unknowns.filter(key => key !== item.key) })}>Reopen</button> : <button type="button" onClick={() => update({ ...model, accepted_unknowns: [...model.accepted_unknowns, item.key].sort() })}>Accept as unknown</button>}</div>)}</div> : <p>All required component and connection details are supplied.</p>}
    {model.source === "ai_draft" && Boolean(model.assumptions?.length) && <div><h5>AI draft assumptions and open questions</h5><ul>{model.assumptions!.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></div>}
    <label>Confirmed by<input value={model.confirmed_by || ""} maxLength={120} disabled={model.status === "confirmed"} onChange={event => update({ ...model, confirmed_by: event.target.value })} /></label>
    <label><input type="checkbox" checked={model.status === "confirmed"} disabled={unresolved.length > 0 || !model.components.length || !model.confirmed_by?.trim()} onChange={event => onChange({ ...model, status: event.target.checked ? "confirmed" : "draft", confirmed_at: event.target.checked ? new Date().toISOString() : undefined })} />I confirm the depicted components and connections reflect the current state</label>
    {unresolved.length > 0 && <p className="diagram-note">Resolve or accept all {unresolved.length} unknown fields before confirmation.</p>}
  </section>;
}
