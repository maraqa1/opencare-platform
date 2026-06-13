import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const policySource = readFileSync(join(here, "mistralNemoInteractionPolicy.ts"), "utf8");
const sanitizerSource = readFileSync(join(here, "textSanitizer.ts"), "utf8");
const routeSource = readFileSync(
  join(here, "..", "app", "api", "data-ai-diagnostic", "report", "route.ts"),
  "utf8",
);
const assemblerSource = readFileSync(join(here, "reportAssembler.ts"), "utf8");
const deterministicSource = readFileSync(join(here, "deterministicReportBuilders.ts"), "utf8");

assert(policySource.includes("forbidden_json_section"));
assert(policySource.includes("forbidden_full_report"));
assert(policySource.includes("allowed: false"));
assert(policySource.includes("narrative_field"));
assert(policySource.includes("grounded_qa"));

assert(sanitizerSource.includes("fallback_required"));
assert(sanitizerSource.includes("unsafe_json_syntax"));
assert(sanitizerSource.includes("markdown_report_structure"));
assert(sanitizerSource.includes("unsafe_preface"));

assert(routeSource.includes("LOCAL_LLM_REPORT_MODE"));
assert(routeSource.includes("json_section mode is disabled"));
assert(routeSource.includes("assembleDiagnosticReport"));
assert(!routeSource.includes("requiredShape"));
assert(!routeSource.includes("generateReportSection"));
assert(!routeSource.includes("sectionSchema"));

assert(assemblerSource.includes("executiveSummary.summaryText"));
assert(assemblerSource.includes("aiReadinessGate.readinessNarrative"));
assert(assemblerSource.includes("generateNarrativeField"));

assert(deterministicSource.includes("analyticsType"));
assert(deterministicSource.includes("\"descriptive\""));
assert(deterministicSource.includes("\"generative\""));
assert(deterministicSource.includes("dataSourceStatus"));

console.log("local LLM report policy tests passed");
