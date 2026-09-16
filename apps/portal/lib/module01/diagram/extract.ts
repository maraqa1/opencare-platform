import { emptyArchitectureDiagram, type ArchitectureDiagramModel, type ComponentType, type ConnectionMethod, type Frequency } from "./model";

const clean = (value: string) => value.trim().replace(/^(?:the|an)\s+/i, "").replace(/[.,;:]$/, "").trim();
const slug = (value: string, fallback: string) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || fallback;
const typeFor = (name: string, declared = ""): ComponentType => {
  const value = `${name} ${declared}`.toLowerCase();
  if (/spreadsheet|workbook|excel/.test(value)) return "manual_artifact";
  if (/analyst|person|officer|manager/.test(value)) return "person";
  if (/dashboard|reporting tool|power bi|tableau/.test(value)) return "consumption_tool";
  if (/database|warehouse|data store|sql/.test(value)) return "data_store";
  if (/integration|gateway|middleware|pipeline/.test(value)) return "integration";
  return "source_system";
};
const methodFor = (value: string): ConnectionMethod => /sftp|csv|file/i.test(value) ? "file_transfer" : /refresh/i.test(value) ? "scheduled_refresh" : /api/i.test(value) ? "api" : /export|extract|reconcil/i.test(value) ? "manual_export" : "unknown";
const frequencyFor = (value: string): Frequency => /real.?time/i.test(value) ? "real_time" : /hour/i.test(value) ? "hourly" : /nightly|daily|morning|each day/i.test(value) ? "daily" : /week/i.test(value) ? "weekly" : /month/i.test(value) ? "monthly" : /ad.?hoc|on demand/i.test(value) ? "ad_hoc" : "unknown";

export function extractArchitectureDiagram(description: string): ArchitectureDiagramModel {
  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const scope = lines.find(line => /^scope\s*:/i.test(line))?.replace(/^scope\s*:\s*/i, "") || "unknown";
  const asOf = lines.find(line => /^as of\s*:/i.test(line))?.replace(/^as of\s*:\s*/i, "") || "unknown";
  const componentMap = new Map<string, ArchitectureDiagramModel["components"][number]>();
  const addComponent = (nameValue: string, declared = "", product = "unknown", owner = "unknown", notes = "") => {
    const name = clean(nameValue); if (!name || name.length > 100) return;
    const key = name.toLowerCase(); if (componentMap.has(key)) return;
    let id = slug(name, `component-${componentMap.size + 1}`), suffix = 1;
    while ([...componentMap.values()].some(item => item.id === id)) id = `${slug(name, "component")}-${++suffix}`;
    componentMap.set(key, { id, name, type: typeFor(name, declared), product: clean(product) || "unknown", owner: clean(owner) || "unknown", ...(notes ? { notes } : {}) });
  };

  for (const line of lines) {
    const match = line.match(/^-\s*([^:]+):\s*([^.]*)\.?(?:\s*Product:\s*([^.]*)\.)?(?:\s*Owner:\s*([^.]*)\.)?$/i);
    if (match && /system|store|database|tool|person|spreadsheet|workbook|platform/i.test(match[2])) addComponent(match[1], match[2], match[3], match[4], line.replace(/^[-\s]+/, ""));
  }
  if (!componentMap.size) {
    const candidates = description.match(/\b(?:[A-Z][A-Za-z0-9&/-]*(?:\s+[A-Za-z0-9&/-]+){0,4}\s+(?:system|database|tool|platform|workbook|spreadsheet)|(?:[Aa]n|[Tt]he)\s+(?:[Pp]erformance\s+)?analyst)\b/g) ?? [];
    for (const candidate of candidates) addComponent(candidate, "", "unknown", "unknown", candidate);
  }

  const components = [...componentMap.values()];
  const mentioned = (text: string) => components.filter(item => text.toLowerCase().includes(item.name.toLowerCase())).sort((a, b) => text.toLowerCase().indexOf(a.name.toLowerCase()) - text.toLowerCase().indexOf(b.name.toLowerCase()));
  const connections: ArchitectureDiagramModel["connections"] = [];
  const seen = new Set<string>();
  const addConnection = (from: string, to: string, source: string, label: string) => {
    if (from === to) return; const key = `${from}|${to}|${label.toLowerCase()}`; if (seen.has(key)) return; seen.add(key);
    const method = methodFor(source), frequency = frequencyFor(source), mode = method === "manual_export" || /manual|reconcil/i.test(source) ? "manual" : "automated";
    connections.push({ id: `connection-${connections.length + 1}`, from, to, label, mode, method, frequency });
  };
  const statements = description.split(/(?<=[.!?])\s+|\r?\n/).map(value => value.trim().replace(/^[-\s]+/, "")).filter(Boolean);
  for (const statement of statements) {
    const found = mentioned(statement); if (found.length < 2) continue;
    const analyst = found.find(item => item.type === "person");
    const workbook = found.find(item => item.type === "manual_artifact");
    if (/extract/i.test(statement) && /\bfrom\b/i.test(statement) && analyst) for (const item of found.filter(value => value.id !== analyst.id && value.id !== workbook?.id)) addConnection(item.id, analyst.id, statement, "Manual extract");
    if (/reconcil/i.test(statement) && analyst && workbook) addConnection(analyst.id, workbook.id, statement, "Manual reconciliation");
    if (/\bsends?\b|\bfeeds?\b|\brefresh/i.test(statement)) addConnection(found[0].id, found[1].id, statement, /refresh/i.test(statement) ? "Scheduled refresh" : /feeds?/i.test(statement) ? "Data feed" : "Data transfer");
  }
  const issue = statements.find(statement => /fail|without warning|do not match|does not match/i.test(statement));
  if (issue && connections.length) connections[0] = { ...connections[0], known_issue: issue };
  return emptyArchitectureDiagram({ scope, as_of: asOf, source: "structured", components, connections, assumptions: ["Generated literally from the supplied description; owner confirmation remains required."] });
}
