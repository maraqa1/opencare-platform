import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourcePath = new URL("../module01NarrativeValidator.ts", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const tempDir = mkdtempSync(join(tmpdir(), "module01-validator-"));
const tempFile = join(tempDir, "module01NarrativeValidator.cjs");
writeFileSync(tempFile, transpiled);

const { validateModule01Narrative } = require(tempFile);

const context = {
  fieldName: "boardScorecard.advisoryNarrative",
  maxWords: 120,
  requiredFactsSupplied: true,
  allowedClientNames: ["CRTVTA"],
  allowedEvidenceIds: ["EVID-DQ-001"],
  allowedSystems: ["Training Management System"],
  allowedUseCases: ["Executive reporting rationalisation"],
};

assert.deepEqual(validateModule01Narrative("As an AI, I can help.", context), { valid: false, reason: "persona_leakage" });
assert.deepEqual(validateModule01Narrative("As mistral, I will write this.", context), { valid: false, reason: "model_self_reference" });
assert.deepEqual(validateModule01Narrative("This GPT response recommends a roadmap.", context), { valid: false, reason: "model_self_reference" });
assert.deepEqual(validateModule01Narrative("CRTVTA should use EVID-NEW-999 for assurance.", context), { valid: false, reason: "invented_evidence_id" });
assert.deepEqual(validateModule01Narrative("Sample Client Organisation should improve controls.", context), { valid: false, reason: "invented_client_name" });
assert.deepEqual(validateModule01Narrative("CRTVTA should connect Phoenix ERP before board reporting.", context), { valid: false, reason: "invented_system_name" });
assert.deepEqual(validateModule01Narrative("CRTVTA should launch Churn Prediction before governance is ready.", context), { valid: false, reason: "invented_use_case" });
assert.deepEqual(validateModule01Narrative("What would you like me to write?", context), { valid: false, reason: "persona_leakage" });
assert.deepEqual(validateModule01Narrative("CRTVTA is officially compliant with all controls.", context), { valid: false, reason: "unsupported_compliance_claim" });
assert.deepEqual(validateModule01Narrative('{"summary":"CRTVTA should improve governance."}', context), { valid: false, reason: "json_like_output" });
assert.deepEqual(validateModule01Narrative("## CRTVTA readiness\nThe board should approve action.", context), { valid: false, reason: "markdown_heading" });
assert.deepEqual(validateModule01Narrative("SECTION_CONTEXT_MISSING", context), { valid: false, reason: "context_missing_despite_facts" });
assert.deepEqual(validateModule01Narrative("Data governance is important for every organisation and should be improved through a robust framework.", context), { valid: false, reason: "generic_data_governance_text" });
assert.deepEqual(validateModule01Narrative("CRTVTA has an overall score is 1.6 and priority domains is Data Quality.", context), { valid: false, reason: "weak_variable_stitching" });
assert.deepEqual(validateModule01Narrative("CRTVTA maturity band is Not provided in diagnostic input.", context), { valid: false, reason: "missing_fact_echo" });
assert.deepEqual(validateModule01Narrative("CRTVTA should confirm ownership because owner types is.", context), { valid: false, reason: "unfinished_owner_types" });
assert.deepEqual(validateModule01Narrative("CRTVTA should confirm ownership and the largest gap is.", context), { valid: false, reason: "unfinished_phrase" });
assert.deepEqual(validateModule01Narrative("The assessment covers IT.. The board should act.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("Current priorities are Improve dashboards, strengthen reports, and use AI.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("The operating pain points - manual reporting - require action.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("Evidence posture is 89% evidence-backed, with 51% weighted evidence confidence, with material gaps.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("Board, CEO, CFO. should approve the baseline.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("CRTVTA should focus on Tools & Platforms score 0.8 gap 3.2.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("CRTVTA should approve evidence before scaling.", context), { valid: false, reason: "raw_variable_stitching" });
assert.equal(validateModule01Narrative("CRTVTA should approve evidence exceptions before scaling.", { ...context, allowFallbackText: true }).valid, true);
assert.deepEqual(validateModule01Narrative("The assessed operating scope covers Privately held real estate investor and developer.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("Management is seeking to advance improve investment visibility.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("This section includes gartnerPillarAssessment as a report field.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("Remediate and approve: close critical evidence gaps.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("The report says evidence is approved for AI scaling.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("Evidence risk remains unless supporting evidence is captured and approved.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("Days 61-90: approve AI-ready use cases and scale dashboards.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(validateModule01Narrative("Tools & Platforms: score 0.8 / 4, gap 3.2. Decision: act.", context), { valid: false, reason: "raw_variable_stitching" });
assert.deepEqual(
  validateModule01Narrative(
    "Tools & Platforms: Decision: Define the target data platform path and stop tool decisions from outrunning governance readiness. Owner: Architect. Data Architecture: Decision: Define the target data platform path and stop tool decisions from outrunning governance readiness. Owner: Architect.",
    { ...context, allowFallbackText: true, maxWords: 80 },
  ),
  { valid: false, reason: "duplicate_decision_text" },
);

assert.equal(
  validateModule01Narrative(
    "CRTVTA has a 1.68 maturity baseline, so the board should treat the score as a readiness signal. The evidence posture supports a provisional baseline, and management should approve owner assignment, evidence certification and a sequenced remediation backlog before scaling AI use cases.",
    context,
  ).valid,
  true,
);

assert.equal(
  validateModule01Narrative(
    "CRTVTA should sequence Data Quality; Architecture first because priority domains are Data Quality score 1 gap 3; Architecture score 1 gap 3. The largest gaps are Data Quality score 1 gap 3; Architecture score 1 gap 3, with owners and evidence certification before controls.",
    { ...context, fieldName: "roadmap.roadmapNarrative" },
  ).valid,
  false,
);

assert.equal(
  validateModule01Narrative(
    "CRTVTA should sequence the 90-day roadmap by confirming owners and evidence certification first, then remediating the priority domains with the highest gaps, and finally moving analytics and AI candidates through a control gate before scaling.",
    { ...context, fieldName: "roadmap.roadmapNarrative" },
  ).valid,
  true,
);

assert.equal(
  validateModule01Narrative(
    "The helicopter view is that Nawah Real Estate Investment Company should connect its maturity baseline, evidence posture and priority domains into one management conclusion before scaling analytics.",
    {
      ...context,
      fieldName: "overallAdvisory.helicopterView",
      allowedClientNames: ["Nawah Real Estate Investment Company"],
    },
  ).valid,
  true,
);

assert.equal(
  validateModule01Narrative(
    "Fallback deterministic text.",
    { ...context, allowFallbackText: true },
  ).valid,
  true,
);

console.log("module01 narrative validator tests passed");
