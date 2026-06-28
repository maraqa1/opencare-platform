import assert from "node:assert/strict";
import { buildModule01NarrativePrompt, module01NarrativeFieldNames } from "../module01NarrativePrompts";

for (const fieldName of module01NarrativeFieldNames) {
  const prompt = buildModule01NarrativePrompt({
    fieldName,
    facts: { clientName: "Fixture Client", overallMaturity: 1.5 },
    maxWords: 120,
  });
  assert.ok(prompt.includes("You are not chatting with the user."));
  assert.ok(prompt.includes("Do not introduce yourself."));
  assert.ok(prompt.includes(`Field: ${fieldName}`));
  assert.ok(prompt.includes("Maximum 120 words."));
  assert.ok(prompt.includes("Return plain text only."));
  assert.ok(!prompt.includes("CRTVTA"));
  assert.ok(!prompt.includes("LEDAR"));
  assert.ok(!prompt.includes("Power BI"));
  assert.ok(!prompt.includes("PDPL"));
  assert.ok(!prompt.includes("NDMO"));
}

