import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(here, "..", "app", "use-cases", "data-strategy-builder", "page.tsx"), "utf8");
const clientSource = readFileSync(
  join(here, "..", "app", "use-cases", "data-strategy-builder", "strategy-builder-client.tsx"),
  "utf8",
);
const dmoPageSource = readFileSync(
  join(here, "..", "app", "use-cases", "data-management-office-establishment", "page.tsx"),
  "utf8",
);
const registrySource = readFileSync(join(here, "use-cases.ts"), "utf8");
const handoffSeedSource = readFileSync(join(here, "fixtures", "data-ai-diagnostic-handoff.seed.ts"), "utf8");
const contextSeedSource = readFileSync(join(here, "fixtures", "data-strategy-context.seed.ts"), "utf8");

assert(pageSource.includes("DataStrategyBuilderClient"));
assert(registrySource.includes('slug: "data-strategy-builder"'));
assert(registrySource.includes('defaultHref: "/use-cases/data-strategy-builder"'));
assert(dmoPageSource.includes("STEP 2 — STRATEGISE"));
assert(dmoPageSource.includes("Data Strategy Builder"));
assert(dmoPageSource.includes("Where are we going, what matters most, and in what order?"));
assert(dmoPageSource.includes('href: "/use-cases/data-strategy-builder"'));

assert(clientSource.includes("loadLatestDiagnosticStrategyHandoff"));
assert(clientSource.includes("No diagnostic evidence loaded"));
assert(clientSource.includes("Run Module 01 first"));
assert(clientSource.includes("Strategy can be drafted manually but cannot be evidence-backed yet"));
assert(clientSource.includes("seedLatestDiagnosticStrategyHandoff"));
assert(clientSource.includes("seedOrganisationContext"));
assert(clientSource.includes("demoHandoffNoticeFrom"));
assert(clientSource.includes("Load demo diagnostic handoff"));
assert(clientSource.includes("Demo diagnostic handoff loaded"));
assert(clientSource.includes("not production evidence"));
assert(clientSource.includes("Load demo context"));
assert(clientSource.includes("Demo organisation context loaded"));
assert(clientSource.includes("user-provided context, not diagnostic evidence"));
assert(clientSource.includes("Gartner pillars"));
assert(clientSource.includes("Module 02 — Data Strategy Builder"));
assert(clientSource.includes("User-provided context"));
assert(clientSource.includes("Organisation overview"));
assert(clientSource.includes("dmo:data-strategy-builder:organisation-context"));
assert(clientSource.includes("dmo:data-strategy-builder:agent-settings"));
assert(clientSource.includes("Agent Settings"));
assert(clientSource.includes("Survey Gap Agent"));
assert(clientSource.indexOf("Survey Gap Agent") < clientSource.indexOf("Strategic Direction Agent"));
assert(clientSource.includes("Proceed with assumptions"));
assert(clientSource.includes("Do not proceed"));
assert(clientSource.includes('completed < 8 || demoSeedLoaded ? "Proceed with assumptions" : "Proceed"'));
assert(clientSource.includes("Runtime generation is not enabled"));
assert(clientSource.includes("Evidence & Assumptions Register"));
assert(clientSource.includes("Module 03 Handoff Pack"));
assert(clientSource.includes("Target DMO mandate"));
assert(!clientSource.toLowerCase().includes("pdf"));
assert(!clientSource.includes("Approved unless"));

assert(handoffSeedSource.includes("seedDiagnosticStrategyHandoff"));
assert(handoffSeedSource.includes("seedLatestDiagnosticStrategyHandoff"));
assert(handoffSeedSource.includes("overallMaturity: 1.7"));
assert(handoffSeedSource.includes("readinessScorePct: 42"));
assert(handoffSeedSource.includes("domainsAssessed: 13"));
assert(handoffSeedSource.includes("gartnerSummaries"));
assert(handoffSeedSource.includes("Demo diagnostic handoff loaded"));
assert(handoffSeedSource.includes("not production evidence"));

assert(contextSeedSource.includes("seedOrganisationContext"));
assert(contextSeedSource.includes("Organisation seeking to improve data governance"));
assert(contextSeedSource.includes("Improve decision quality, strengthen data ownership"));
assert(contextSeedSource.includes("Demo context only. Replace with client-specific notes during delivery."));

for (const forbidden of [
  "Power BI",
  "powerbi",
  "Tableau",
  "Qlik",
  "Superset",
  "Fabric",
  "Databricks",
  "Excel",
  "Claude",
  "Anthropic",
  "OpenAI",
  "api.anthropic.com",
  "claude-sonnet",
  "healthcare",
  "hospital",
  "hotel",
  "guest",
  "real estate",
  "OpenCare sample",
]) {
  assert(!clientSource.includes(forbidden), `Forbidden generic Module 02 term found: ${forbidden}`);
  assert(!handoffSeedSource.includes(forbidden), `Forbidden diagnostic seed term found: ${forbidden}`);
  assert(!contextSeedSource.includes(forbidden), `Forbidden context seed term found: ${forbidden}`);
}

console.log("data-strategy-builder source tests passed");
