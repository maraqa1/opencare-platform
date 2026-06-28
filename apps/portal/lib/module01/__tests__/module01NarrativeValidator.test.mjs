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

assert.equal(
  validateModule01Narrative(
    "CRTVTA has a 1.68 maturity baseline, so the board should approve owner assignment, evidence certification and a sequenced remediation backlog before scaling AI use cases.",
    context,
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
