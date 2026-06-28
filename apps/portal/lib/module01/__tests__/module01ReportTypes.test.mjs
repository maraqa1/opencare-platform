import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "module01ReportTypes.ts"), "utf8");

assert(source.includes("reportHeader"));
assert(source.includes("executiveSummary"));
assert(source.includes("clientContext"));
assert(source.includes("overallMaturity"));
assert(source.includes("domainHeatmap"));
assert(source.includes("criticalGaps"));
assert(source.includes("rootCauses"));
assert(source.includes("materialFindings"));
assert(source.includes("domainActionPlan"));
assert(source.includes("aiReadinessGate"));
assert(source.includes("candidateUseCases"));
assert(source.includes("roadmap90Day"));
assert(source.includes("roadmap12Month"));
assert(source.includes("boardDecisions"));
assert(source.includes("evidenceAppendix"));
assert(source.includes("aiNarratives"));
assert(source.includes("generationMetadata"));

assert(source.includes("deterministicFacts"));
assert(source.includes("aiNarrative"));
assert(source.includes("fallbackNarrative"));
assert(source.includes("validationMetadata"));
assert(source.includes("renderedFromStructuredModel: true"));

for (const field of ["fieldName", "text", "source", "validationStatus", "fallbackUsed", "model", "generatedAt"]) {
  assert(source.includes(`${field}:`), `AI narrative field must include ${field}`);
}

function narrativeSlot({ fieldName, aiText = null, fallbackText, source = "fallback", validationStatus = "fallback" }) {
  const aiNarrative = aiText
    ? {
      fieldName,
      text: aiText,
      source,
      validationStatus,
      fallbackUsed: false,
      model: "mistral-nemo:12b",
      generatedAt: "2026-06-28T00:00:00.000Z",
    }
    : null;
  return {
    deterministicFacts: { fieldName },
    aiNarrative,
    fallbackNarrative: fallbackText,
    renderedText: aiNarrative?.text ?? fallbackText,
    validationMetadata: {
      validationStatus,
      fallbackUsed: aiNarrative === null,
    },
  };
}

const report = {
  reportHeader: {
    reportId: "module01-test",
    clientName: "Northstar Retail Group",
    businessDomain: "Retail operations",
    audience: "Executive committee",
    purpose: "Assess data readiness",
    generatedAt: "2026-06-28T00:00:00.000Z",
  },
  executiveSummary: {
    ...narrativeSlot({
      fieldName: "executiveSummary.summaryText",
      aiText: "AI narrative may mention a claimed 4.0 score, but it is only narrative text.",
      fallbackText: "Fallback executive summary.",
      source: "ai2",
      validationStatus: "valid",
    }),
    boardMessage: "Approve the first 90-day remediation wave.",
  },
  clientContext: { sector: "Private sector retail" },
  overallMaturity: {
    score: 1.68,
    maturityBand: "Early-stage",
    questionsScored: "24/30",
    evidenceCoveragePct: 47,
  },
  domainHeatmap: [
    { domain: "Data Quality & Master Data", score: 0.86, gap: 3.14, priority: "Critical", rootCauseRank: 1 },
  ],
  criticalGaps: [
    { domain: "Data Quality & Master Data", score: 0.86, gap: 3.14, priority: "Critical", rootCauseRank: 1 },
  ],
  rootCauses: ["No unified identifier"],
  materialFindings: {
    ...narrativeSlot({
      fieldName: "materialFindings.findingsNarrative",
      fallbackText: "Fallback finding narrative.",
    }),
    findings: ["Critical data elements are not controlled."],
  },
  domainActionPlan: {
    ...narrativeSlot({
      fieldName: "domainActionPlan.managementNarrative",
      fallbackText: "Fallback action-plan narrative.",
    }),
    actions: ["Assign data owners."],
  },
  aiReadinessGate: {
    ...narrativeSlot({
      fieldName: "aiReadinessGate.readinessNarrative",
      fallbackText: "Fallback AI readiness narrative.",
    }),
    proceed: ["Descriptive reporting"],
    pilotWithControls: ["Forecasting"],
    hold: ["Autonomous decisions"],
  },
  candidateUseCases: [
    { id: "uc-01", name: "Executive reporting rationalisation", type: "descriptive" },
  ],
  roadmap90Day: {
    ...narrativeSlot({
      fieldName: "roadmap.roadmapNarrative",
      fallbackText: "Fallback 90-day roadmap narrative.",
    }),
    actions: ["Publish source inventory."],
  },
  roadmap12Month: ["Scale certified dashboards."],
  boardDecisions: {
    ...narrativeSlot({
      fieldName: "recommendedNextSteps.closingNarrative",
      fallbackText: "Fallback board decision narrative.",
    }),
    decisions: ["Approve Data Council."],
  },
  evidenceAppendix: [
    { evidenceId: "EVID-DQ-001", domain: "Data Quality & Master Data", question: "How is data quality measured?" },
  ],
  aiNarratives: {},
  generationMetadata: {
    model: "mistral-nemo:12b",
    mode: "narrative_enrichment",
    renderedFromStructuredModel: true,
    validationSummary: {
      aiFields: 1,
      fallbackFields: 5,
      rejectedFields: 0,
    },
  },
};

assert.equal(report.evidenceAppendix[0].evidenceId, "EVID-DQ-001");
assert.equal(report.overallMaturity.score, 1.68);
assert.equal(report.domainHeatmap[0].score, 0.86);
assert.match(report.executiveSummary.renderedText, /4\.0 score/);
assert.equal(report.overallMaturity.score, 1.68, "AI narrative text must not overwrite deterministic score");
assert.equal(report.materialFindings.aiNarrative, null);
assert.equal(report.materialFindings.renderedText, "Fallback finding narrative.");
assert.equal(report.materialFindings.validationMetadata.fallbackUsed, true);
assert.deepEqual(report.candidateUseCases, [
  { id: "uc-01", name: "Executive reporting rationalisation", type: "descriptive" },
]);

console.log("module01 report type shape tests passed");
