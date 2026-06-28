import assert from "node:assert/strict";
import { validateModule01Narrative } from "../module01NarrativeValidator";

const context = {
  fieldName: "boardScorecard.advisoryNarrative",
  maxWords: 120,
  requiredFactsSupplied: true,
  allowedClientNames: ["CRTVTA"],
  allowedEvidenceIds: ["EVID-DQ-001"],
};

assert.equal(validateModule01Narrative("As an AI, I can help.", context).valid, false);
assert.equal(validateModule01Narrative("As mistral, I will write this.", context).valid, false);
assert.equal(validateModule01Narrative("CRTVTA should use EVID-NEW-999 for assurance.", context).valid, false);
assert.equal(validateModule01Narrative("Sample Client Organisation should improve controls.", context).valid, false);
assert.equal(validateModule01Narrative("What would you like me to write?", context).valid, false);
assert.equal(validateModule01Narrative("CRTVTA is officially compliant with all controls.", context).valid, false);
assert.equal(validateModule01Narrative("CRTVTA has a 1.68 maturity baseline, so the board should approve owner assignment, evidence certification and a sequenced remediation backlog before scaling AI use cases.", context).valid, true);

