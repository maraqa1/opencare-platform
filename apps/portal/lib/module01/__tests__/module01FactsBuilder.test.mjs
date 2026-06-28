import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourcePath = new URL("../module01FactsBuilder.ts", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const tempDir = mkdtempSync(join(tmpdir(), "module01-facts-"));
const tempFile = join(tempDir, "module01FactsBuilder.cjs");
writeFileSync(tempFile, transpiled);

const { buildModule01Facts, module01MissingFact } = require(tempFile);
const crtvta = require("../__fixtures__/crtvta_module01_strategy_ready.json");
const generic = require("../__fixtures__/generic_private_sector_module01.json");

const facts = buildModule01Facts(crtvta);

assert.equal(facts.executiveSummaryFacts.clientName, "CRTVTA");
assert.equal(facts.executiveSummaryFacts.sector, "Technical and vocational training");
assert.equal(facts.executiveSummaryFacts.overallMaturity, 1.68);
assert.deepEqual(facts.executiveSummaryFacts.criticalDomains, [
  "Data Quality & Master Data",
  "Execution, Roadmap & Value Measurement",
  "Data Sources & Data Flows",
]);

assert.equal(facts.boardScorecardFacts.topPriorityDomains[0].domain, "Data Quality & Master Data");
assert.equal(facts.boardScorecardFacts.topPriorityDomains[1].domain, "Execution, Roadmap & Value Measurement");
assert.equal(facts.boardScorecardFacts.topPriorityDomains[2].domain, "Data Sources & Data Flows");

assert.ok(facts.materialFindingsFacts.evidenceItems["EVID-DQ-001"]);
assert.equal(facts.materialFindingsFacts.evidenceItems["EVID-DQ-001"].domain, "Data Quality & Master Data");
assert.deepEqual(facts.aiReadinessFacts.useCases, crtvta.candidate_use_cases);

const missingFacts = buildModule01Facts({});
assert.equal(missingFacts.executiveSummaryFacts.clientName, module01MissingFact);
assert.deepEqual(missingFacts.executiveSummaryFacts.criticalDomains, [module01MissingFact]);
assert.deepEqual(missingFacts.overallSynthesisFacts.topRootCauses, [module01MissingFact]);

assert.equal(buildModule01Facts(generic).executiveSummaryFacts.clientName, "Northstar Retail Group");

const dependencyFacts = buildModule01Facts({
  customer_context: { clientName: "Dependency Graph Client" },
  dependency_graph: {
    root_cause_ranking: ["Missing owner model", "Manual source handovers"],
  },
});
assert.deepEqual(dependencyFacts.overallSynthesisFacts.topRootCauses, ["Missing owner model", "Manual source handovers"]);

const serializedGeneric = JSON.stringify(buildModule01Facts(generic));
assert.ok(!serializedGeneric.includes("CRTVTA"));
assert.ok(!serializedGeneric.includes("LEDAR"));
assert.ok(!serializedGeneric.includes("Sample Client Organisation"));

console.log("module01 facts builder tests passed");
