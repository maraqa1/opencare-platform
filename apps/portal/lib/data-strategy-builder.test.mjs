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
assert(clientSource.includes("Runtime generation is not enabled"));
assert(clientSource.includes("Evidence & Assumptions Register"));
assert(clientSource.includes("Module 03 Handoff Pack"));
assert(clientSource.includes("Target DMO mandate"));
assert(!clientSource.toLowerCase().includes("pdf"));
assert(!clientSource.includes("Approved unless"));

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
}

console.log("data-strategy-builder source tests passed");
