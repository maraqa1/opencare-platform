export const module01SharedPromptInstructions = [
  "You are writing one narrative field for a board-ready AI and data diagnostic report.",
  "",
  "You are not chatting with the user.",
  "Do not introduce yourself.",
  "Do not mention the model.",
  "Do not describe your capabilities.",
  "Do not ask the user what they want.",
  "Do not write generic advisory text.",
  "Use only the supplied facts.",
  "Do not invent client facts, systems, evidence IDs, scores, dates, owners, use cases, or regulatory claims.",
  "Do not claim official regulatory compliance unless official source evidence is supplied.",
  "",
  "Return plain text only.",
  "No Markdown headings.",
  "No bullets unless explicitly requested.",
  "If the facts are insufficient, return exactly SECTION_CONTEXT_MISSING.",
];

type Module01NarrativePromptContract = {
  fieldName: string;
  fieldTask: string;
  expectedFacts: string;
};

export const module01NarrativePromptContracts: Record<string, Module01NarrativePromptContract> = {
  "executiveSummary.summaryText": {
    fieldName: "executiveSummary.summaryText",
    fieldTask: "Summarise the diagnostic result, strongest management implication, and immediate advisory priority.",
    expectedFacts: "client context, business domain, report purpose, overall maturity, maturity band, critical domains, and evidence coverage",
  },
  "boardScorecard.advisoryNarrative": {
    fieldName: "boardScorecard.advisoryNarrative",
    fieldTask: "Interpret the board scorecard for steering committee action without changing any score.",
    expectedFacts: "client name, audience, overall maturity, questions scored, evidence-backed count, evidence coverage, and top priority domains",
  },
  "overallAdvisory.helicopterView": {
    fieldName: "overallAdvisory.helicopterView",
    fieldTask: "Write the helicopter view that connects validated section narratives into one advisory conclusion.",
    expectedFacts: "business domain, critical domains, top root causes, pain points, and executive expectations",
  },
  "materialFindings.findingsNarrative": {
    fieldName: "materialFindings.findingsNarrative",
    fieldTask: "Explain the material findings and why they matter for management decisions.",
    expectedFacts: "top priority domains and evidence items relevant to material findings",
  },
  "domainActionPlan.managementNarrative": {
    fieldName: "domainActionPlan.managementNarrative",
    fieldTask: "Explain the management action plan across the highest-priority domains.",
    expectedFacts: "top priority domains, root causes, owners, actions, and evidence needed for remediation",
  },
  "capabilityDiagnosis.diagnosisNarrative": {
    fieldName: "capabilityDiagnosis.diagnosisNarrative",
    fieldTask: "Synthesize the material findings and domain action plan into the capability diagnosis narrative.",
    expectedFacts: "material findings facts and domain action plan facts only",
  },
  "aiReadinessGate.readinessNarrative": {
    fieldName: "aiReadinessGate.readinessNarrative",
    fieldTask: "Explain what can proceed, what needs controls, and what must be held.",
    expectedFacts: "overall maturity, evidence coverage, candidate use cases, and regulatory context supplied in the diagnostic",
  },
  "roadmap.roadmapNarrative": {
    fieldName: "roadmap.roadmapNarrative",
    fieldTask: "Explain the 90-day roadmap priorities and dependencies.",
    expectedFacts: "top priority domains, candidate use cases, technology landscape, dependencies, and sequencing facts",
  },
  "recommendedNextSteps.closingNarrative": {
    fieldName: "recommendedNextSteps.closingNarrative",
    fieldTask: "Close with the immediate next steps the board or steering committee should approve.",
    expectedFacts: "audience, purpose, top priority domains, candidate use cases, and board decision facts",
  },
};

export const module01NarrativeFieldNames = Object.keys(module01NarrativePromptContracts);

function promptContractFor(fieldName: string) {
  const contract = module01NarrativePromptContracts[fieldName as keyof typeof module01NarrativePromptContracts];
  if (!contract) {
    throw new Error(`Unsupported Module 01 narrative field: ${fieldName}`);
  }
  return contract;
}

export function buildModule01NarrativePrompt({
  fieldName,
  facts,
  maxWords,
}: {
  fieldName: string;
  facts: Record<string, unknown> | string;
  maxWords: number;
}) {
  const contract = promptContractFor(fieldName);
  const factsText = typeof facts === "string" ? facts : JSON.stringify(facts, null, 2);
  return [
    ...module01SharedPromptInstructions,
    `Maximum ${maxWords} words.`,
    "",
    `Field: ${fieldName}`,
    `Field task: ${contract.fieldTask}`,
    `Expected facts for this field: ${contract.expectedFacts}.`,
    "",
    "Section-specific facts:",
    factsText,
    "",
    "Use only the section-specific facts above. Write the field text only.",
  ].join("\n");
}

export function buildModule01RetryPrompt({
  fieldName,
  facts,
  maxWords,
  reason,
}: {
  fieldName: string;
  facts: Record<string, unknown> | string;
  maxWords: number;
  reason: string;
}) {
  return [
    "The previous output was rejected.",
    "",
    "Rejection reason:",
    reason,
    "",
    "Rewrite only the requested report narrative field.",
    "",
    "Hard rules:",
    "Do not introduce yourself.",
    "Do not mention the model.",
    "Do not ask the reader a question.",
    "Do not describe your capabilities.",
    "Do not write generic advisory text.",
    "Use only the supplied facts.",
    "Do not invent facts, evidence IDs, systems, use cases, dates, owners, scores or regulatory claims.",
    "Return plain text only.",
    "",
    buildModule01NarrativePrompt({ fieldName, facts, maxWords }),
  ].join("\n");
}
