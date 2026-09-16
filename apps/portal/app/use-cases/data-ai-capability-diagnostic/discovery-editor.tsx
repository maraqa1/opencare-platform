"use client";
import { useEffect, useRef, useState } from "react";
import { essentialQuestions, type Discovery, type PainPoint, type RegisteredUseCase } from "@/lib/module01/module01Discovery";
import "./discovery.css";

export function ArchitectureDiagram({ architecture: a }: { architecture: Discovery["architecture"] }) {
  if (!a.nodes.length && !a.image) return null;
  return <section className="discovery-diagram"><h3>Current-state architecture diagram</h3><p>{a.confirmed ? "Client-confirmed" : "Unconfirmed draft"} | {a.origin === "ai_draft" ? "AI-generated draft" : "Client-entered"}</p>
    {a.image && <img src={a.image} alt="Client supplied current-state architecture" style={{ maxWidth: "100%", maxHeight: 440, objectFit: "contain" }} />}
    <div className="discovery-components">{a.nodes.map(n => <span key={n.id}>{n.label}</span>)}</div>
    {a.edges.map((e, i) => <div className="discovery-flow" key={i}><strong>{a.nodes.find(n => n.id === e.source)?.label}</strong><span aria-label="flows to"> → <small>{e.label}</small> → </span><strong>{a.nodes.find(n => n.id === e.target)?.label}</strong></div>)}
  </section>;
}

const pains = ["Reports take too long to prepare", "Different reports show different numbers", "Data is missing or inaccurate", "Teams cannot find the data they need", "Too much manual spreadsheet work", "Data ownership is unclear", "Historical data cannot be reproduced", "Other"];
export default function DiscoveryEditor({ value: d, onChange }: { value: Discovery; onChange: (value: Discovery) => void }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const current = useRef(d); current.current = d;
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const changeArchitecture = (patch: Partial<Discovery["architecture"]>) => onChange({ ...d, architecture: { ...d.architecture, ...patch, confirmed: false } });
  const updatePain = (i: number, patch: Partial<PainPoint>) => onChange({ ...d, painPoints: d.painPoints.map((p, j) => i === j ? { ...p, ...patch } : p) });
  const updateUseCase = (i: number, patch: Partial<RegisteredUseCase>) => {
    const useCases = d.useCases.map((u, j) => i === j ? { ...u, ...patch } : u);
    onChange({ ...d, useCases, futureUseCases: useCases.some(u => u.horizon === "future") ? "identified" : d.futureUseCases === "none" ? "none" : "not_answered" });
  };
  async function generate() {
    const snapshot = d; const abort = new AbortController(); controller.current = abort;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/reports/module01/architecture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: d.architecture.description }), signal: abort.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Diagram generation failed.");
      if (current.current !== snapshot) { setMessage("Capture changed during generation. Generate a fresh draft."); return; }
      onChange({ ...d, architecture: { ...d.architecture, nodes: result.nodes, edges: result.edges, confirmed: false, origin: "ai_draft", model: result.model, generatedAt: result.generatedAt } });
      setMessage("Draft generated; confirmation outstanding.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Diagram generation failed."); }
    finally { setBusy(false); }
  }
  return <section className="discovery-capture" aria-label="Business and architecture discovery">
    <h2>Business and architecture discovery</h2>
    <details open><summary>Platform and data essentials</summary><div className="discovery-grid">{essentialQuestions.map(([id, question]) => <fieldset key={id}><legend>{question}</legend>
      <label>Status<select value={d.essentials[id].status} onChange={e => onChange({ ...d, essentials: { ...d.essentials, [id]: { ...d.essentials[id], status: e.target.value as Discovery["essentials"][typeof id]["status"] } } })}><option value="not_answered">Not answered</option><option value="known">Details available</option><option value="no">No / not in place</option><option value="not_sure">Not sure</option></select></label>
      <label>Details<textarea maxLength={1500} value={d.essentials[id].details} onChange={e => onChange({ ...d, essentials: { ...d.essentials, [id]: { ...d.essentials[id], details: e.target.value } } })} /></label>
      <label>Evidence reference (optional)<textarea maxLength={500} value={d.essentials[id].evidence} onChange={e => onChange({ ...d, essentials: { ...d.essentials, [id]: { ...d.essentials[id], evidence: e.target.value } } })} /></label>
    </fieldset>)}</div></details>
    <details><summary>Main pain points ({d.painPoints.length})</summary><div className="discovery-options">{pains.map(issue => <label key={issue}><input type="checkbox" checked={d.painPoints.some(p => p.issue === issue)} onChange={e => onChange({ ...d, painPoints: e.target.checked ? [...d.painPoints, { id: crypto.randomUUID(), issue, function: "", example: "", impact: "", priority: "Medium", evidence: "", confirmed: false }].slice(0, 30) : d.painPoints.filter(p => p.issue !== issue) })} />{issue}</label>)}</div>
      {d.painPoints.map((p, i) => <fieldset key={p.id}><legend>{p.issue}</legend><div className="discovery-grid">{(["function", "example", "impact", "evidence"] as const).map(key => <label key={key}>{({ function: "Affected function", example: "What happened?", impact: "Business impact", evidence: "Evidence reference" })[key]}<textarea maxLength={key === "evidence" ? 500 : 1500} value={p[key]} onChange={e => updatePain(i, { [key]: e.target.value, confirmed: false })} /></label>)}<label>Priority<select value={p.priority} onChange={e => updatePain(i, { priority: e.target.value })}>{["Not specified", "High", "Medium", "Low"].map(v => <option key={v}>{v}</option>)}</select></label><label><input type="checkbox" checked={p.confirmed} disabled={!p.evidence.trim()} onChange={e => updatePain(i, { confirmed: e.target.checked })} />Evidence checked by assessor</label></div><button type="button" onClick={() => onChange({ ...d, painPoints: d.painPoints.filter((_, j) => j !== i) })}>Remove pain point</button></fieldset>)}
    </details>
    <details><summary>Current and future use cases ({d.useCases.length})</summary>
      <label>Future opportunities<select value={d.futureUseCases} onChange={e => onChange({ ...d, futureUseCases: e.target.value as Discovery["futureUseCases"] })}><option value="not_answered">Not yet discussed</option><option value="none" disabled={d.useCases.some(u => u.horizon === "future")}>None identified</option><option value="identified">Identified</option></select></label>
      {d.useCases.map((u, i) => <fieldset key={u.id}><legend>{u.name || `Use case ${i + 1}`}</legend><div className="discovery-grid"><label>Current or future<select value={u.horizon} onChange={e => updateUseCase(i, { horizon: e.target.value as RegisteredUseCase["horizon"] })}><option value="current">Current</option><option value="future">Future</option></select></label>{(["name", "purpose", "function", "status", "owner", "data", "output", "benefit", "dependencies", "priority", "timing"] as const).map(key => <label key={key}>{({ name: "Name", purpose: "Decision or problem addressed", function: "Business function", status: "Current status", owner: "Owner and users", data: "Data and platforms", output: "Report, dashboard or AI output", benefit: "Business benefit", dependencies: "Gaps and dependencies", priority: "Priority (optional)", timing: "Timing (optional)" })[key]}<textarea maxLength={key === "priority" ? 40 : 1500} value={u[key]} onChange={e => updateUseCase(i, { [key]: e.target.value })} /></label>)}</div><button type="button" onClick={() => onChange({ ...d, useCases: d.useCases.filter((_, j) => i !== j) })}>Remove use case</button></fieldset>)}
      <button type="button" disabled={d.useCases.length >= 30} onClick={() => onChange({ ...d, useCases: [...d.useCases, { id: crypto.randomUUID(), name: "", horizon: "current", purpose: "", function: "", status: "", owner: "", data: "", output: "", benefit: "", dependencies: "", priority: "", timing: "" }] })}>Add use case</button>
    </details>
    <details><summary>Current-state architecture</summary><label>Systems, data flows, storage, models and reports<textarea maxLength={8000} rows={6} value={d.architecture.description} onChange={e => changeArchitecture({ description: e.target.value })} /></label><label>Unknowns and assumptions<textarea maxLength={1500} value={d.architecture.unknowns} onChange={e => changeArchitecture({ unknowns: e.target.value })} /></label>
      <button type="button" disabled={busy || d.architecture.description.trim().length < 20} onClick={generate}>{busy ? "Generating draft..." : "Generate AI diagram draft"}</button><p role="status">{message}</p>
      <label>Existing diagram (PNG/JPEG, up to 400 KB)<input type="file" accept="image/png,image/jpeg" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 400000 || !["image/png", "image/jpeg"].includes(file.type)) { setMessage("Choose a PNG or JPEG up to 400 KB."); return; } const snapshot = d; const reader = new FileReader(); reader.onload = () => { if (current.current === snapshot) changeArchitecture({ image: String(reader.result) }); }; reader.readAsDataURL(file); }} /></label>
      {d.architecture.image && <button type="button" onClick={() => changeArchitecture({ image: "" })}>Remove uploaded diagram</button>}
      {d.architecture.nodes.map((n, i) => <div key={n.id}><label>Component {i + 1}<input maxLength={100} value={n.label} onChange={e => changeArchitecture({ origin: "manual", nodes: d.architecture.nodes.map((v, j) => j === i ? { ...v, label: e.target.value, sourceQuote: "" } : v) })} /></label><button type="button" onClick={() => changeArchitecture({ origin: "manual", nodes: d.architecture.nodes.filter(v => v.id !== n.id), edges: d.architecture.edges.filter(e => e.source !== n.id && e.target !== n.id) })}>Remove component {i + 1}</button></div>)}
      <button type="button" disabled={d.architecture.nodes.length >= 20} onClick={() => changeArchitecture({ origin: "manual", nodes: [...d.architecture.nodes, { id: crypto.randomUUID(), label: "", sourceQuote: "" }] })}>Add component</button>
      {d.architecture.edges.map((edge, i) => <div className="discovery-grid" key={i}>{(["source", "target"] as const).map(key => <label key={key}>{key === "source" ? "From" : "To"}<select value={edge[key]} onChange={e => changeArchitecture({ origin: "manual", edges: d.architecture.edges.map((v, j) => j === i ? { ...v, [key]: e.target.value, sourceQuote: "" } : v) })}>{d.architecture.nodes.map(n => <option key={n.id} value={n.id}>{n.label || "Unnamed component"}</option>)}</select></label>)}<label>Transfer method and frequency<input maxLength={100} value={edge.label} onChange={e => changeArchitecture({ origin: "manual", edges: d.architecture.edges.map((v, j) => j === i ? { ...v, label: e.target.value, sourceQuote: "" } : v) })} /></label><button type="button" onClick={() => changeArchitecture({ edges: d.architecture.edges.filter((_, j) => j !== i) })}>Remove connection</button></div>)}
      <button type="button" disabled={d.architecture.nodes.length < 2 || d.architecture.edges.length >= 40} onClick={() => changeArchitecture({ origin: "manual", edges: [...d.architecture.edges, { source: d.architecture.nodes[0].id, target: d.architecture.nodes[1].id, label: "", sourceQuote: "" }] })}>Add connection</button>
      <label><input type="checkbox" checked={d.architecture.confirmed} disabled={(!d.architecture.nodes.length && !d.architecture.image) || d.architecture.nodes.some(n => !n.label.trim()) || d.architecture.edges.some(edge => !edge.label.trim())} onChange={e => onChange({ ...d, architecture: { ...d.architecture, confirmed: e.target.checked } })} />I confirm the depicted components and connections reflect the current state</label>
      <ArchitectureDiagram architecture={d.architecture} />
    </details>
  </section>;
}
