import type { IndustryProfileId } from "./module01IndustryProfiles";

export const essentialQuestions = [
  ["platforms", "What data platforms do you use, and what does each one do?"],
  ["sources", "Which business systems supply your data?"],
  ["capture", "How does data move between systems, and how often?"],
  ["retention", "Where is data stored, and how long is it kept?"],
  ["reports", "What are your main reports, who uses them, and for which decisions?"],
  ["manual", "Which reports require manual preparation or spreadsheet work?"],
  ["model", "Is there a documented data model showing how records relate?"],
  ["history", "Can you reproduce past results when records or definitions change?"],
  ["semantic", "Do reports share agreed business definitions and calculations?"],
  ["owners", "Who owns the data, platforms, definitions and reports?"],
] as const;
export type EssentialId = typeof essentialQuestions[number][0];
export type DiscoveryAnswer = { status: "not_answered" | "known" | "no" | "not_sure"; details: string; evidence: string };
export type PainPoint = { id: string; issue: string; function: string; example: string; impact: string; priority: string; evidence: string; confirmed: boolean };
export type RegisteredUseCase = { id: string; name: string; horizon: "current" | "future"; purpose: string; function: string; status: string; owner: string; data: string; output: string; benefit: string; dependencies: string; priority: string; timing: string };
export type ArchitectureNode = { id: string; label: string; sourceQuote: string };
export type ArchitectureEdge = { source: string; target: string; label: string; sourceQuote: string };
export type Discovery = {
  version: 1;
  essentials: Record<EssentialId, DiscoveryAnswer>;
  painPoints: PainPoint[];
  useCases: RegisteredUseCase[];
  futureUseCases: "not_answered" | "none" | "identified";
  architecture: { description: string; unknowns: string; nodes: ArchitectureNode[]; edges: ArchitectureEdge[]; confirmed: boolean; origin: "manual" | "ai_draft"; model: string; generatedAt: string; image: string };
};
const text = (v: unknown, limit = 1500) => typeof v === "string" ? v.trim().slice(0, limit) : "";
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const items = (v: unknown, limit = 30) => Array.isArray(v) ? v.slice(0, limit).map(record) : [];
function stableId(value: unknown, fallback: string, seen: Set<string>) {
  let id = typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : fallback;
  let suffix = 0;
  while (seen.has(id)) id = `${fallback}-${++suffix}`;
  seen.add(id);
  return id;
}
export function emptyDiscovery(): Discovery {
  return { version: 1, essentials: Object.fromEntries(essentialQuestions.map(([id]) => [id, { status: "not_answered", details: "", evidence: "" }])) as Discovery["essentials"], painPoints: [], useCases: [], futureUseCases: "not_answered", architecture: { description: "", unknowns: "", nodes: [], edges: [], confirmed: false, origin: "manual", model: "", generatedAt: "", image: "" } };
}
export function normaliseDiscovery(value: unknown): Discovery {
  const raw = record(value), result = emptyDiscovery(), answers = record(raw.essentials);
  for (const [id] of essentialQuestions) {
    const a = record(answers[id]);
    result.essentials[id] = { status: ["known", "no", "not_sure"].includes(String(a.status)) ? a.status as DiscoveryAnswer["status"] : "not_answered", details: text(a.details), evidence: text(a.evidence, 500) };
  }
  const painIds = new Set<string>(), caseIds = new Set<string>(), nodeIds = new Set<string>();
  result.painPoints = items(raw.painPoints).map((p, i) => ({ id: stableId(p.id, `pain-${i + 1}`, painIds), issue: text(p.issue), function: text(p.function), example: text(p.example), impact: text(p.impact), priority: text(p.priority, 40), evidence: text(p.evidence, 500), confirmed: p.confirmed === true && Boolean(text(p.evidence)) }));
  result.useCases = items(raw.useCases).map((u, i) => ({ id: stableId(u.id, `case-${i + 1}`, caseIds), name: text(u.name), horizon: u.horizon === "future" ? "future" : "current", purpose: text(u.purpose), function: text(u.function), status: text(u.status), owner: text(u.owner), data: text(u.data), output: text(u.output), benefit: text(u.benefit), dependencies: text(u.dependencies), priority: text(u.priority, 40), timing: text(u.timing) }));
  result.futureUseCases = result.useCases.some(u => u.horizon === "future") ? "identified" : raw.futureUseCases === "none" ? "none" : "not_answered";
  const a = record(raw.architecture);
  const nodes = items(a.nodes, 20).map((n, i) => ({ id: stableId(n.id, `node-${i + 1}`, nodeIds), label: text(n.label, 100), sourceQuote: text(n.sourceQuote, 500) }));
  const oldNodes = items(a.nodes, 20);
  const edges = items(a.edges, 40).flatMap(e => {
    if (typeof e.source !== "string" || typeof e.target !== "string" || oldNodes.filter(n => n.id === e.source).length !== 1 || oldNodes.filter(n => n.id === e.target).length !== 1) return [];
    const source = oldNodes.findIndex(n => n.id === e.source), target = oldNodes.findIndex(n => n.id === e.target);
    return source < 0 || target < 0 ? [] : [{ source: nodes[source].id, target: nodes[target].id, label: text(e.label, 100), sourceQuote: text(e.sourceQuote, 500) }];
  });
  const image = typeof a.image === "string" && a.image.length <= 600000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(a.image) ? a.image : "";
  const complete = (nodes.length > 0 || Boolean(image)) && nodes.every(n => n.label) && edges.every(e => e.label) && edges.length === items(a.edges, 40).length;
  result.architecture = { description: text(a.description, 8000), unknowns: text(a.unknowns), nodes, edges, confirmed: a.confirmed === true && complete, origin: a.origin === "ai_draft" ? "ai_draft" : "manual", model: text(a.model, 100), generatedAt: text(a.generatedAt, 100), image };
  return result;
}

// All report formats use these same client-stated facts; none affect scoring.
export function discoveryMarkdown(value: unknown): string[] {
  const d = normaliseDiscovery(value);
  const safe = (s: string) => s.replace(/[\r\n]+/g, " ").replace(/[<>#*`|\[\]\\]/g, "").trim() || "Not supplied";
  const lines: string[] = ["## Platform and data essentials", "Client-stated context, not additional scored evidence.", ""];
  for (const [id, question] of essentialQuestions) {
    const a = d.essentials[id];
    lines.push(`### ${question}`, `Status: ${a.status.replace(/_/g, " ")}. ${safe(a.details)} Evidence reference: ${safe(a.evidence)}.`, "");
  }
  lines.push("## Main pain points", ...(d.painPoints.length ? d.painPoints.map(p => `- ${safe(p.issue)}. Function: ${safe(p.function)}. Example: ${safe(p.example)}. Business impact: ${safe(p.impact)}. Priority: ${safe(p.priority)}. Evidence status: ${p.confirmed ? "Client marked evidence-confirmed" : "Client-reported; not independently validated"}. Reference: ${safe(p.evidence)}.`) : ["No pain points recorded; this does not demonstrate their absence."]), "", "## Current and future use-case register");
  lines.push(`Future use cases: ${d.futureUseCases === "none" ? "None identified by the client" : d.futureUseCases.replace(/_/g, " ")}. Registration does not constitute AI readiness approval.`);
  for (const u of d.useCases) lines.push(`### ${safe(u.name)} (${u.horizon})`, `Purpose: ${safe(u.purpose)}. Function: ${safe(u.function)}. Status: ${safe(u.status)}. Owner and users: ${safe(u.owner)}. Data and platforms: ${safe(u.data)}. Output: ${safe(u.output)}. Expected benefit: ${safe(u.benefit)}. Gaps and dependencies: ${safe(u.dependencies)}. Priority: ${safe(u.priority)}. Timing: ${safe(u.timing)}.`, "");
  lines.push("## Current-state architecture", `Status: ${d.architecture.confirmed ? "Client-confirmed" : "Unconfirmed draft"}; origin: ${d.architecture.origin === "ai_draft" ? "AI-generated draft reviewed separately from report narratives" : "Client-entered"}.`, safe(d.architecture.description), `Unknowns: ${safe(d.architecture.unknowns)}.`, ...d.architecture.nodes.map(n => `- Component: ${safe(n.label)}.`), ...d.architecture.edges.map(e => `- Flow: ${safe(d.architecture.nodes.find(n => n.id === e.source)?.label ?? "")} -> ${safe(d.architecture.nodes.find(n => n.id === e.target)?.label ?? "")} (${safe(e.label)}).`), "");
  return lines;
}
export function discoveryNarrativeFacts(value: unknown): string[] {
  const d = normaliseDiscovery(value);
  return ["Discovery context is client-stated and unscored. Do not infer verified evidence, readiness, new systems or deployment approval. Unconfirmed architecture must not be described as established fact.", ...essentialQuestions.filter(([id]) => d.essentials[id].status !== "not_answered").map(([id]) => `Client-stated ${id}: ${d.essentials[id].status}; ${d.essentials[id].details.slice(0, 240)}`), ...d.painPoints.slice(0, 3).map(p => `Reported pain point: ${p.issue.slice(0, 120)}; impact: ${p.impact.slice(0, 120)}`), ...d.useCases.slice(0, 3).map(u => `Client-registered ${u.horizon} use case: ${u.name.slice(0, 100)}; dependency: ${u.dependencies.slice(0, 140)}`), ...(d.architecture.confirmed ? [`Client-confirmed architecture: ${d.architecture.description.slice(0, 400)}`] : [])];
}

export function buildDiscoverySeed(industry: IndustryProfileId, depth: string): Discovery {
  const sectors: Record<IndustryProfileId, [string, string, string, string]> = {
    healthcare: ["Clinical system", "Patient access", "Waiting-time reporting", "Demand forecasting"],
    manufacturing: ["Manufacturing execution system", "Production", "Production yield reporting", "Equipment failure prediction"],
    banking: ["Core banking system", "Payments", "Payment reconciliation", "Payment anomaly detection"],
    "real-estate": ["Property management system", "Leasing", "Occupancy reporting", "Lease renewal forecasting"],
    utilities: ["Metering system", "Network operations", "Outage reporting", "Demand forecasting"],
    "cross-industry": ["Service management system", "Service delivery", "Service performance reporting", "Demand forecasting"],
  };
  const [source, fn, current, future] = sectors[industry], d = emptyDiscovery();
  const details = ["Reporting database and dashboard tool; fictional demonstration inventory.", `${source} and finance system.`, "Nightly file transfer; a reporting analyst checks rejected records.", "Reporting database; retention period is not yet confirmed by the owner.", `${current} supports the ${fn} manager's weekly decisions.`, "An analyst reconciles source extracts in spreadsheets each week.", "A draft relationship model exists; identifiers are not fully reconciled.", "Monthly snapshots exist; changed definitions cannot yet be reproduced reliably.", "Key measures are documented separately; a shared semantic layer is not yet confirmed.", `${fn} owns definitions; IT supports platforms; reporting ownership needs sign-off.`];
  essentialQuestions.forEach(([id], i) => { d.essentials[id] = { status: i === 3 || i === 8 ? "not_sure" : "known", details: depth === "interview-light" && i > 5 ? "Interview follow-up required." : details[i], evidence: depth === "interview-light" ? "Synthetic interview note; no verified evidence" : `DEMO-${industry}-${i + 1}: illustrative record only, not independently verified` }; });
  d.painPoints = [{ id: "pain-1", issue: "Reports take too long to prepare", function: fn, example: "Weekly source files require spreadsheet reconciliation.", impact: "Managers receive delayed information and spend time resolving differences.", priority: "High", evidence: "Synthetic interview example", confirmed: false }, { id: "pain-2", issue: "Different reports show different numbers", function: fn, example: "Teams use different reporting cut-off times.", impact: "Decisions are delayed while teams reconcile measures.", priority: "High", evidence: "Synthetic example; validation outstanding", confirmed: false }];
  d.useCases = [{ id: "case-1", name: current, horizon: "current", purpose: "Monitor service and operational performance", function: fn, status: "In use", owner: `${fn} manager and reporting analyst`, data: `${source}, reporting database and dashboard tool`, output: "Weekly dashboard", benefit: "Shared visibility of performance", dependencies: "Reconcile identifiers and certify metric definitions", priority: "High", timing: "Current" }, { id: "case-2", name: future, horizon: "future", purpose: "Support planning with human-reviewed predictions", function: fn, status: "Idea; not approved for deployment", owner: "Business sponsor to confirm", data: `${source}; historical suitability not confirmed`, output: "Human-reviewed planning insight", benefit: "Earlier identification of operational risks; benefit not quantified", dependencies: "Historical data validation, privacy review, named owner and readiness gate", priority: "Medium", timing: "After foundation controls are validated" }];
  d.futureUseCases = "identified";
  d.architecture = { ...d.architecture, description: `${source} sends a nightly file to the Reporting database. The Reporting database feeds the Dashboard tool. An analyst manually reconciles source extracts.`, unknowns: "Retention period, failure alerts and historical model remain to be confirmed.", nodes: [{ id: "node-1", label: source, sourceQuote: source }, { id: "node-2", label: "Reporting database", sourceQuote: "Reporting database" }, { id: "node-3", label: "Dashboard tool", sourceQuote: "Dashboard tool" }], edges: [{ source: "node-1", target: "node-2", label: "nightly file", sourceQuote: `${source} sends a nightly file to the Reporting database.` }, { source: "node-2", target: "node-3", label: "feeds", sourceQuote: "The Reporting database feeds the Dashboard tool." }] };
  if (industry === "healthcare") {
    const nightly = "The Clinical system sends a nightly CSV file via SFTP to the Reporting database at 02:00.";
    const refresh = "The Reporting database feeds the Dashboard tool through a scheduled refresh every morning at 06:00.";
    const manual = "The Performance analyst exports extracts weekly from both the Clinical system and the Reporting database, and reconciles them in the Reconciliation workbook because appointment counts do not match.";
    const issue = "The nightly file fails about twice a month, and the dashboard then shows the previous day's data without warning.";
    d.architecture = {
      ...d.architecture,
      description: [
        "Scope: Outpatient activity reporting", "As of: September 2026", "", "Components", "",
        "- Clinical system: source system. Product: electronic health record. Owner: Clinical Informatics.",
        "- Reporting database: data store. Product: SQL Server. Owner: IT Data Services.",
        "- Dashboard tool: reporting tool. Product: Power BI. Owner: Business Intelligence team.",
        "- Performance analyst: person. Owner: Performance team.",
        "- Reconciliation workbook: spreadsheet. Owner: Performance team.",
        "", "Data flows", "", `- ${nightly}`, `- ${refresh}`,
        "", "Manual steps", "", `- ${manual}`, "", "Known issues", "", `- ${issue}`,
      ].join("\n"),
      unknowns: "Retention policy, documented data model, historical modeling and shared metric definitions were not supplied.",
      nodes: ["Clinical system", "Reporting database", "Dashboard tool", "Performance analyst", "Reconciliation workbook"].map((label, i) => ({ id: `node-${i + 1}`, label, sourceQuote: label })),
      edges: [
        { source: "node-1", target: "node-2", label: "nightly CSV file via SFTP", sourceQuote: nightly },
        { source: "node-2", target: "node-3", label: "scheduled refresh every morning at 06:00", sourceQuote: refresh },
        { source: "node-1", target: "node-4", label: "exports extracts weekly", sourceQuote: manual },
        { source: "node-2", target: "node-4", label: "exports extracts weekly", sourceQuote: manual },
        { source: "node-4", target: "node-5", label: "reconciles them", sourceQuote: manual },
      ],
    };
    const healthcareDetails: Record<EssentialId, string> = {
      platforms: "Clinical system: electronic health record. Reporting database: SQL Server. Dashboard tool: Power BI. Reconciliation workbook: spreadsheet.",
      sources: "Clinical system supplies outpatient activity reporting data. The Performance analyst also extracts from the Reporting database for reconciliation.",
      capture: `${nightly} ${refresh}`,
      retention: "SQL Server is the reporting data store. Retention policy was not supplied.",
      reports: "Outpatient activity reporting in Power BI, as of September 2026. Specific report consumers and decisions were not supplied.",
      manual,
      model: "A documented data model was not supplied.",
      history: "Historical modeling and the ability to reproduce past results were not supplied.",
      semantic: "Shared metric definitions and semantic-layer arrangements were not supplied. Appointment counts do not match between extracts.",
      owners: "Clinical Informatics owns the Clinical system; IT Data Services owns the Reporting database; the Business Intelligence team owns the Dashboard tool. The Performance team owns the Performance analyst role and Reconciliation workbook.",
    };
    for (const [id] of essentialQuestions) d.essentials[id] = {
      status: ["retention", "model", "history", "semantic"].includes(id) ? "not_sure" : "known",
      details: healthcareDetails[id],
      evidence: "User-supplied healthcare demo scenario, September 2026; not independently validated.",
    };
    d.painPoints = [
      { id: "pain-1", issue: "Different reports show different numbers", function: "Outpatient activity reporting", example: manual, impact: "Appointment counts cannot be reconciled without weekly manual work.", priority: "Not specified", evidence: "User-supplied demo scenario; supporting evidence not supplied", confirmed: false },
      { id: "pain-2", issue: "Dashboard shows outdated data without warning", function: "Outpatient activity reporting", example: issue, impact: "The dashboard shows the previous day's data after a nightly file failure, without warning users.", priority: "Not specified", evidence: "User-supplied demo scenario; failure logs not supplied", confirmed: false },
    ];
    d.useCases[0] = { ...d.useCases[0], name: "Outpatient activity reporting", purpose: "Report outpatient activity", function: "Outpatient activity reporting", owner: "Business Intelligence team owns the reporting tool; specific report consumers were not supplied", data: "Clinical system (electronic health record), Reporting database (SQL Server), Dashboard tool (Power BI)", output: "Dashboard with scheduled refresh at 06:00 every morning", benefit: "Not specified in the supplied scenario", dependencies: "Nightly CSV via SFTP at 02:00; appointment-count reconciliation and unflagged stale data remain known issues", priority: "Not specified", timing: "Current as of September 2026" };
  }
  return d;
}
