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
const markdownSource = readFileSync(join(here, "markdownReportGenerator.ts"), "utf8");
const workspaceSource = readFileSync(
  join(here, "..", "app", "use-cases", "data-ai-capability-diagnostic", "workspace-client.tsx"),
  "utf8",
);
const globalCssSource = readFileSync(join(here, "..", "app", "globals.css"), "utf8");

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
assert(routeSource.includes("generateMarkdownReport"));
assert(routeSource.includes("markdownReport"));
assert(routeSource.includes("json_section mode is disabled"));
assert(routeSource.includes("assembleDiagnosticReport"));
assert(routeSource.includes("normaliseReportPayload"));
assert(routeSource.includes("domain.avgScore ?? domain.score"));
assert(routeSource.includes("gap.evidenceStrength"));
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

assert(markdownSource.includes("Return Markdown only."));
assert(markdownSource.includes("Do not return JSON."));
assert(markdownSource.includes("Do not use Markdown tables."));
assert(markdownSource.includes("Synthesize the implications."));
assert(markdownSource.includes("For the Domain action plan, do not write generic recommendations."));
assert(markdownSource.includes("response_format: \"markdown\""));
assert(markdownSource.includes("strict_json: false"));
assert(markdownSource.includes("readMarkdownResponse"));
assert(markdownSource.includes("removeInventedCustomerAcronym"));
assert(markdownSource.includes("containsPlaceholderClient"));
assert(markdownSource.includes("hasIncompleteMarkdown"));
assert(markdownSource.includes("convertMarkdownTables"));
assert(markdownSource.includes("buildDeterministicMarkdown"));
assert(markdownSource.includes("enableLlmMarkdown?: boolean"));
assert(markdownSource.includes("!args.modelConfig.enableLlmMarkdown"));
assert(markdownSource.includes("https://ai2.opendatalake.com/api/chat"));
assert(markdownSource.includes("nativeChatUrlFromGateway"));
assert(markdownSource.includes("nativeChatRequest"));
assert(markdownSource.includes("/api/chat"));
assert(markdownSource.includes("source: \"llm\""));
assert(markdownSource.includes("source: \"fallback\""));
assert(routeSource.includes("LOCAL_LLM_ENABLE_MARKDOWN_GENERATION"));
assert(routeSource.includes("Full AI Markdown generation is disabled by LOCAL_LLM_ENABLE_MARKDOWN_GENERATION"));
assert(deterministicSource.includes("domainRemediationFocus"));
assert(deterministicSource.includes("Evidence required:"));
assert(workspaceSource.includes("seededActionByDomain"));
assert(workspaceSource.includes("domainActionForSummary"));
assert(!workspaceSource.includes("Demo action:"));
assert(globalCssSource.includes(".data-ai-markdown-report"));
assert(globalCssSource.includes("display: none !important;"));

console.log("local LLM report policy tests passed");
