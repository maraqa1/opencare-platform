import assert from "node:assert/strict";
import crtvta from "../__fixtures__/crtvta_module01_strategy_ready.json";
import generic from "../__fixtures__/generic_private_sector_module01.json";
import { buildModule01Facts, module01MissingFact } from "../module01FactsBuilder";

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
assert.ok(facts.materialFindingsFacts.evidenceItems["EVID-DQ-001"]);
assert.deepEqual(facts.aiReadinessFacts.useCases, crtvta.candidate_use_cases);
assert.equal(buildModule01Facts({}).executiveSummaryFacts.clientName, module01MissingFact);
assert.equal(buildModule01Facts(generic).executiveSummaryFacts.clientName, "Northstar Retail Group");

