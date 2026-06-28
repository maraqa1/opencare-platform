const sharedInstructions = [
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

const fieldTasks: Record<string, string> = {
  "executiveSummary.summaryText": "Summarise the diagnostic result, strongest management implication, and immediate advisory priority.",
  "boardScorecard.advisoryNarrative": "Interpret the board scorecard for steering committee action without changing any score.",
  "overallAdvisory.helicopterView": "Write the helicopter view that connects validated section narratives into one advisory conclusion.",
  "materialFindings.findingsNarrative": "Explain the material findings and why they matter for management decisions.",
  "domainActionPlan.managementNarrative": "Explain the management action plan across the highest-priority domains.",
  "capabilityDiagnosis.diagnosisNarrative": "Synthesize the material findings and domain action plan into the capability diagnosis narrative.",
  "aiReadinessGate.readinessNarrative": "Explain what can proceed, what needs controls, and what must be held.",
  "roadmap.roadmapNarrative": "Explain the 90-day roadmap priorities and dependencies.",
  "recommendedNextSteps.closingNarrative": "Close with the immediate next steps the board or steering committee should approve.",
};

export const module01NarrativeFieldNames = Object.keys(fieldTasks);

export function buildModule01NarrativePrompt({
  fieldName,
  facts,
  maxWords,
}: {
  fieldName: string;
  facts: Record<string, unknown> | string;
  maxWords: number;
}) {
  const factsText = typeof facts === "string" ? facts : JSON.stringify(facts, null, 2);
  return [
    ...sharedInstructions,
    `Maximum ${maxWords} words.`,
    "",
    `Field: ${fieldName}`,
    `Field task: ${fieldTasks[fieldName] ?? "Write the requested controlled advisory narrative field."}`,
    "",
    "Section-specific facts:",
    factsText,
    "",
    "Write the field text only.",
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
