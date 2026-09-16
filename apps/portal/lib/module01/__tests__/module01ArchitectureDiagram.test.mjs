import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const portal = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const cache = new Map();
function resolveModule(from, name) {
  const base = name.startsWith("@/") ? resolve(portal, name.slice(2)) : resolve(dirname(from), name);
  for (const path of [`${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")]) {
    try { readFileSync(path); return path; } catch {}
  }
  return "";
}
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "module", "exports", code)((name) => { const local = name.startsWith(".") || name.startsWith("@/") ? resolveModule(path, name) : ""; return local ? load(local) : require(name); }, module, module.exports);
  return module.exports;
}
const diagram = load(resolve(portal, "lib/module01/diagram/index.ts"));
const fixtures = resolve(portal, "lib/module01/diagram/fixtures");
const read = name => JSON.parse(readFileSync(resolve(fixtures, name), "utf8"));
const names = ["f01-healthcare-seed.json", "f02-large-estate.json", "f03-empty-lanes.json", "f04-two-way-parallel.json", "f05-cycle.json", "f06-orphan-missing.json", "f07-broken-reference.json", "f08-long-names.json", "f09-many-people.json", "f10-single-component.json", "f11-grouping.json"];

assert.deepEqual(diagram.unmappedComponentTypes("current_state_data_flow"), []);
const broken = read(names[6]);
assert.equal(diagram.validateDiagram(broken).valid, false);
assert.match(diagram.validateDiagram(broken).errors.join(" "), /e1.*does_not_exist/);
assert.equal(diagram.renderArchitectureSvg(broken).svg, "");
const duplicate = { ...read(names[9]), components: [...read(names[9]).components, { ...read(names[9]).components[0] }] };
assert.match(diagram.validateDiagram(duplicate).errors.join(" "), /Duplicate component id/);
const invalid = { ...read(names[9]), components: [{ ...read(names[9]).components[0], type: "invalid" }] };
assert.match(diagram.validateDiagram(invalid).errors.join(" "), /invalid type/);
const self = read(names[9]); self.connections = [{ id: "self", from: "a", to: "a", label: "Self", mode: "automated", method: "api", frequency: "daily" }];
assert.match(diagram.validateDiagram(self).warnings.join(" "), /self-referencing/);

const f1 = read(names[0]), f1Completeness = diagram.calculateCompleteness(f1), f1Risks = diagram.calculateRiskFlags(f1);
assert.equal(f1Completeness.percentage, 20); assert.equal(f1Completeness.known, 4); assert.equal(f1Completeness.total, 20);
assert.equal(f1Risks.length, 13); assert.equal(f1Risks.filter(r => r.type === "manual_process").length, 3); assert.equal(f1Risks.filter(r => r.type === "unknown_frequency").length, 4); assert.equal(f1Risks.filter(r => r.type === "single_path").length, 1); assert.equal(f1Risks.filter(r => r.type === "missing_owner").length, 5);
assert.equal(diagram.calculateCompleteness(diagram.emptyArchitectureDiagram()).label, "n/a");
const f6Risks = diagram.calculateRiskFlags(read(names[5])); assert.equal(f6Risks.filter(r => r.type === "orphan").length, 1); assert.equal(f6Risks.filter(r => r.type === "missing_owner").length, 3);
const f10Risks = diagram.calculateRiskFlags(read(names[9])); assert.equal(f10Risks.filter(r => r.type === "orphan").length, 1); assert.equal(f10Risks.filter(r => r.type === "missing_owner").length, 1);

const legacy = { confirmed: false, origin: "manual", nodes: [{ id: "db", label: "Reporting database", sourceQuote: "Reporting database" }, { id: "analyst", label: "Analyst", sourceQuote: "Analyst" }, { id: "sheet", label: "Reconciliation workbook", sourceQuote: "Reconciliation workbook" }], edges: [{ source: "analyst", target: "sheet", label: "weekly manual export", sourceQuote: "weekly manual export" }] };
const migrated = diagram.migrateArchitectureDiagram(legacy), migratedAgain = diagram.migrateArchitectureDiagram(migrated);
assert.deepEqual(migratedAgain, migrated); assert.equal(migrated.components.length, 3); assert.equal(migrated.connections.length, 1); assert.equal(migrated.components.find(c => c.id === "analyst").type, "person"); assert.equal(migrated.components.find(c => c.id === "sheet").type, "manual_artifact");
assert.ok(migrated.components.some(c => c.type === "person")); assert.ok(migrated.components.some(c => c.type === "manual_artifact"));

const overlaps = (a, b, inflate = 8) => a.x - inflate < b.x + b.width + inflate && a.x + a.width + inflate > b.x - inflate && a.y - inflate < b.y + b.height + inflate && a.y + a.height + inflate > b.y - inflate;
for (const name of names.filter(name => name !== names[6])) {
  const model = read(name), validation = diagram.validateDiagram(model); assert.equal(validation.valid, true, `${name}: ${validation.errors.join(" ")}`);
  const layout = diagram.layoutDiagram(model), routes = diagram.routeDiagram(layout), rendered = diagram.renderArchitectureSvg(model), repeated = diagram.renderArchitectureSvg(model);
  assert.equal(rendered.svg, repeated.svg, `${name} is not deterministic`); assert.equal(rendered.complete, true, `${name} render incomplete`);
  assert.ok(layout.width < 10000 && layout.height < 10000, `${name}: canvas dimensions must remain bounded`);
  assert.ok(layout.boxes.every(box => [box.x, box.y, box.width, box.height].every(Number.isFinite)), `${name}: box geometry must be finite`);
  for (let i = 0; i < layout.boxes.length; i++) for (let j = i + 1; j < layout.boxes.length; j++) assert.equal(overlaps(layout.boxes[i], layout.boxes[j]), false, `${name}: boxes overlap ${layout.boxes[i].id}/${layout.boxes[j].id}`);
  for (const route of routes) assert.equal(route.warning, undefined, `${name}: ${route.warning}`);
  assert.ok(rendered.svg.includes('role="img"')); assert.ok(rendered.svg.includes("<title>")); assert.ok(rendered.svg.includes("<desc>"));
  if (name === names[0]) { assert.equal(layout.boxes.length, 5); assert.equal(routes.length, 5); assert.equal(layout.boxes.some(b => b.lane === "integration"), false); }
  if (name === names[2]) assert.equal(new Set(layout.boxes.filter(b => !b.bottom).map(b => b.lane)).size, 2);
  if (name === names[3]) assert.equal(new Set(routes.map(r => JSON.stringify(r.points))).size, 3);
  if (name === names[7]) assert.ok(rendered.svg.includes("…"));
  if (name === names[8]) { assert.equal(layout.boxes.filter(b => b.bottom).length, 6); assert.equal(model.components.filter(c => ["person", "manual_artifact"].includes(c.type)).length, 6); }
  if (name === names[10]) { assert.equal(layout.grouped, true); assert.equal(layout.boxes.length, 3); assert.equal(model.components.length, 30); const expanded = diagram.layoutDiagram(model, { expandedGroups: ["Clinical"] }); assert.equal(expanded.boxes.length, 12); assert.equal(expanded.boxes.filter(box => box.componentIds.some(id => id.startsWith("c"))).length, 10); }
  const exported = diagram.exportArchitectureHtml(model, { assessmentSlug: "demo", date: "2026-09-16" });
  assert.ok(exported.html.includes('id="architecture-model"')); assert.ok(!/https?:\/\//.test(exported.html));
  const embedded = exported.html.match(/<script type="application\/json" id="architecture-model">([\s\S]*?)<\/script>/)[1]; assert.deepEqual(JSON.parse(embedded), model);
}
console.log("PASS: 11 architecture fixtures, migration, validation, completeness, risks, deterministic SVG, layout, and offline export.");
