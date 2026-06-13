import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

class MemoryStorage {
  #store = new Map();

  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }

  setItem(key, value) {
    this.#store.set(key, String(value));
  }

  removeItem(key) {
    this.#store.delete(key);
  }
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

const handoffModule = await import(pathToFileURL(join(here, "data-ai-diagnostic-handoff.ts")).href);

const handoff = handoffModule.buildDiagnosticStrategyHandoff({
  generatedAt: "2026-06-13T10:00:00.000Z",
  customerContext: {
    customerName: "Example Organisation",
    businessDomain: "Public service operations",
    operatingScope: "National entities and regional teams",
    strategicPriorities: "Improve service quality; Strengthen governance",
    currentPainPoints: "Fragmented source ownership; Manual reporting",
    reportPurpose: "Prepare strategy module input",
    targetAudience: "Executive committee",
  },
  overallScore: 1.7,
  maturityLabel: "Ad hoc",
  readinessScorePct: 42,
  questionsScored: 84,
  totalQuestions: 84,
  domainsAssessed: 13,
  totalDomains: 13,
  evidenceBackedResponses: 79,
  evidenceCoveragePct: 94,
  domainSummaries: [
    {
      id: 1,
      nameEn: "Data Strategy & Business Value",
      score: 2,
      gap: 2,
      priority: "High",
      recommendedAction: "Confirm executive ownership",
    },
  ],
  gartnerSummaries: [
    {
      name: "Strategy and value",
      score: 2,
      gap: 2,
      priority: "High",
      decisionQuestion: "What value must the strategy unlock?",
      managementAction: "Approve strategy scope",
      mappedDomains: ["Data Strategy & Business Value"],
    },
  ],
  priorityGaps: [
    {
      question: "Who owns the strategy?",
      domain: "Data Strategy & Business Value",
      score: 1,
      gap: 3,
      evidence: "Interview notes",
      action: "Assign owner",
      severity: "Critical",
    },
  ],
  generatedReport: {
    readinessThesis: "Proceed with controlled strategy build.",
    recommendedDecisions: ["Approve baseline"],
    nextSteps: ["Assign owners"],
    ninetyDayPlan: ["Close critical governance gaps"],
    aiGateProceed: ["Evidence-backed reporting"],
    aiGatePilotWithControls: ["Forecasting with owner approval"],
    aiGateHold: ["Autonomous action without approval"],
  },
});

assert.equal(handoff.handoffVersion, "1.0");
assert.equal(handoff.sourceModule, "data-ai-capability-diagnostic");
assert.equal(handoff.customerContext.organisationName, "Example Organisation");
assert.equal(handoff.assessmentSummary.overallMaturity, 1.7);
assert.equal(handoff.domainSummaries[0].priority, "High");
assert.equal(handoff.gartnerSummaries[0].mappedDomains[0], "Data Strategy & Business Value");
assert.equal(handoff.priorityGaps[0].severity, "Critical");
assert.deepEqual(handoff.aiReadinessGate.proceed, ["Evidence-backed reporting"]);
assert(handoff.strategyInputs.strategicPrioritiesFromDiagnostic.includes("Improve service quality"));
assert(handoff.strategyInputs.operatingModelImplications.includes("Assign owners"));
assert(handoff.strategyInputs.operatingModelImplications.includes("Fragmented source ownership"));
assert(handoffModule.validateDiagnosticStrategyHandoff(handoff));

handoffModule.saveLatestDiagnosticStrategyHandoff(handoff);
assert.equal(
  globalThis.localStorage.getItem(handoffModule.diagnosticStrategyHandoffStorageKey),
  JSON.stringify(handoff),
);
const loadedHandoff = handoffModule.loadLatestDiagnosticStrategyHandoff();
assert(loadedHandoff);
assert.equal(loadedHandoff.customerContext.organisationName, handoff.customerContext.organisationName);
assert.equal(loadedHandoff.assessmentSummary.overallMaturity, handoff.assessmentSummary.overallMaturity);
assert.equal(loadedHandoff.priorityGaps[0].action, handoff.priorityGaps[0].action);
handoffModule.clearLatestDiagnosticStrategyHandoff();
assert.equal(handoffModule.loadLatestDiagnosticStrategyHandoff(), null);

const emptyHandoff = handoffModule.buildDiagnosticStrategyHandoff({});
assert.equal(emptyHandoff.assessmentSummary.overallMaturity, null);
assert.deepEqual(emptyHandoff.domainSummaries, []);
assert.deepEqual(emptyHandoff.strategyInputs.capabilityGapsToClose, []);

const adapterSource = readFileSync(join(here, "data-ai-diagnostic-handoff.ts"), "utf8").toLowerCase();
assert(!adapterSource.includes("pdf"));

const diagnosticClientSource = readFileSync(
  join(here, "..", "app", "use-cases", "data-ai-capability-diagnostic", "workspace-client.tsx"),
  "utf8",
);
assert(diagnosticClientSource.includes("saveLatestDiagnosticStrategyHandoff(handoff)"));
assert(diagnosticClientSource.includes("Diagnostic completed — available to Data Strategy Builder"));

const strategyPageSource = readFileSync(
  join(here, "..", "app", "use-cases", "data-strategy-builder", "page.tsx"),
  "utf8",
);
assert(!strategyPageSource.toLowerCase().includes("pdf"));
assert(strategyPageSource.includes("DiagnosticHandoffPanel"));

console.log("data-ai-diagnostic-handoff tests passed");
