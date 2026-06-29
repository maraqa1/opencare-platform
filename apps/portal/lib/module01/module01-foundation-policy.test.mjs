import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(join(here, "..", "..", "app", "api", "data-ai-diagnostic", "report", "route.ts"), "utf8");
const deploySource = readFileSync(join(here, "..", "..", "..", "..", "scripts", "jazan", "deploy_portal_vm.sh"), "utf8");
const assemblerSource = readFileSync(join(here, "..", "reportAssembler.ts"), "utf8");
const factsSource = readFileSync(join(here, "module01FactsBuilder.ts"), "utf8");
const promptsSource = readFileSync(join(here, "module01NarrativePrompts.ts"), "utf8");
const validatorSource = readFileSync(join(here, "module01NarrativeValidator.ts"), "utf8");
const generatorSource = readFileSync(join(here, "module01NarrativeGenerator.ts"), "utf8");
const typesSource = readFileSync(join(here, "module01ReportTypes.ts"), "utf8");

assert(routeSource.includes('booleanEnv("LOCAL_LLM_ENABLE_MARKDOWN_GENERATION", false)'));
assert(routeSource.includes('booleanEnv("LOCAL_LLM_ENABLE_FIELD_ENRICHMENT", true)'));
assert(deploySource.includes('LOCAL_LLM_ENABLE_MARKDOWN_GENERATION="${LOCAL_LLM_ENABLE_MARKDOWN_GENERATION:-false}"'));
assert(deploySource.includes('LOCAL_LLM_ENABLE_FIELD_ENRICHMENT="${LOCAL_LLM_ENABLE_FIELD_ENRICHMENT:-true}"'));
assert(assemblerSource.includes("generateModule01FieldNarrative"));
assert(!assemblerSource.includes("generateModule01NarrativeField({"));
assert(factsSource.includes("Not provided in diagnostic input."));
assert(factsSource.includes("topPriorityDomains"));
assert(promptsSource.includes("You are not chatting with the user."));
assert(promptsSource.includes("SECTION_CONTEXT_MISSING"));
assert(validatorSource.includes("persona_leakage"));
assert(validatorSource.includes("invented_evidence_id"));
assert(generatorSource.includes("retryAttempted"));
assert(generatorSource.includes("module01_ai_narrative"));
assert(typesSource.includes("deterministicFacts"));
assert(typesSource.includes("Module01AiNarrativeField"));

console.log("module01 foundation policy tests passed");
