export type Module01NarrativeValidation = {
  valid: boolean;
  reason?: string;
};

const bannedPhrases = [
  "As a senior",
  "As llama",
  "As an AI",
  "I am here",
  "I'm here",
  "What would you like",
  "Please provide",
  "Please go ahead",
  "Let's get started",
  "my responses will be",
  "based on publicly available information",
  "How may I assist",
  "AI2 Specialized Knowledge Packs",
  "Advisory And Technical Packs",
];

const modelSelfDescription = /\b(as|i am|i'm)\s+(llama|mistral|gpt|claude|ollama)\b/i;
const modelSelfReference = /\b(my|this)\s+(llama|mistral|gpt|claude|ollama)\s+(response|model|answer|output)\b/i;
const questionToReader = /\b(what would you like|how may i assist|would you like me to|do you want me to|can you provide|please provide)\b/i;
const complianceClaim = /\b(officially compliant|certified compliant|regulatory compliance is achieved|fully compliant with|compliant with all)\b/i;
const genericDataGovernance = /\b(data governance is important|organizations should improve data governance|a robust data governance framework|effective data management requires)\b/i;
const weakVariableStitching = /\b(score|gap|domain|priority domains|largest gaps)\s+is\b/i;
const unfinishedIsPhrase = /\bis\.\s*$/i;
const rawHeadlineStitching = /\bCurrent priorities are\s+.+|operating pain points\s+-|with\s+\d+%\s+weighted evidence confidence,\s+with|targetAudience.+\.\s+should|\b[A-Z][A-Za-z,& ]+\.\s+should\b|IT\.\.|score\s+(?:0\.8|1)\s+gap|score\s+\d+(?:\.\d+)?\s*\/\s*4,\s*gap\s+\d+(?:\.\d+)?|approve evidence(?! exceptions)|evidence is approved|supporting evidence is captured and approved|approve AI-ready use cases|covers Privately held|advance improve|gartnerPillarAssessment|Remediate and approve/i;

function containsUnknownCapitalizedClient(text: string, allowedClientNames: string[]) {
  const normalizedAllowed = allowedClientNames.map((name) => name.toLowerCase()).filter(Boolean);
  if (/\b(sample|example|demo)\s+(client|customer|organisation|organization)\b/i.test(text)) {
    return true;
  }
  const clientMatches = text.match(/\b[A-Z][A-Za-z0-9&.\- ]{2,60}\s+(Organisation|Organization|Company|Authority|Investment|Group)\b/g) ?? [];
  return clientMatches.some((match) => {
    const normalizedMatch = match.toLowerCase();
    return !normalizedAllowed.some((allowed) => normalizedMatch.includes(allowed) || allowed.includes(normalizedMatch));
  });
}

function containsDisallowedNamedItem(text: string, allowedValues: string[], suffixPattern: string) {
  const allowed = allowedValues.map((value) => value.toLowerCase()).filter(Boolean);
  const matches = text.match(new RegExp(`\\b[A-Z][A-Za-z0-9&.\\- ]{2,60}\\s+(${suffixPattern})\\b`, "g")) ?? [];
  return matches.some((match) => !allowed.some((value) => match.toLowerCase().includes(value)));
}

function containsRepeatedDomainList(text: string) {
  if (/\bpriority domains?\b/i.test(text) && /\b(?:largest|critical|priority)\s+gaps?\b/i.test(text)) {
    const listMarkers = text.match(/;\s*[A-Z]/g) ?? [];
    if (listMarkers.length >= 2) return true;
  }
  const priorityMatch = text.match(/\bpriority domains?\b\s*(?:is|are|include|:)\s*([^.;]+(?:;[^.;]+){1,})/i);
  const gapMatch = text.match(/\b(?:largest|critical|priority)\s+gaps?\b\s*(?:is|are|include|:)\s*([^.;]+(?:;[^.;]+){1,})/i);
  if (!priorityMatch || !gapMatch) return false;
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\b(score|gap)\s+\d+(?:\.\d+)?\b/g, "")
      .replace(/[^a-z&; ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return normalize(priorityMatch[1]) === normalize(gapMatch[1]);
}

function includesAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function hasDuplicateDecisionText(text: string) {
  const decisions = [...text.matchAll(/\bDecision:\s*(.+?)(?=\s+(?:Owner|Next 30 days|Evidence required|Success measure|Decision:)|$)/gi)]
    .map((match) => match[1].toLowerCase().replace(/\s+/g, " ").trim())
    .filter((decision) => decision.length > 20);
  return new Set(decisions).size < decisions.length;
}

function validateBoardScorecardNarrative(text: string): Module01NarrativeValidation {
  if (!includesAny(text, ["score means", "score indicates", "readiness signal", "maturity baseline", "maturity score"])) {
    return { valid: false, reason: "missing_score_meaning" };
  }
  if (!includesAny(text, ["evidence posture", "evidence coverage", "weighted confidence", "evidence-backed", "evidence confidence"])) {
    return { valid: false, reason: "missing_evidence_posture" };
  }
  if (!includesAny(text, ["management", "executive", "leadership", "board"])) {
    return { valid: false, reason: "missing_management_implication" };
  }
  if (!includesAny(text, ["approve", "assign", "confirm", "decide", "decision", "fund"])) {
    return { valid: false, reason: "missing_decision_required" };
  }
  return { valid: true };
}

function validateRoadmapNarrative(text: string): Module01NarrativeValidation {
  if (containsRepeatedDomainList(text)) return { valid: false, reason: "repeated_domain_lists" };
  if (!includesAny(text, ["sequence", "sequenced", "sequencing", "first", "then", "before scaling"])) {
    return { valid: false, reason: "missing_sequencing_logic" };
  }
  if (!includesAny(text, ["owner", "owners", "sponsor"])) return { valid: false, reason: "missing_owners" };
  if (!includesAny(text, ["evidence", "certify", "certification", "certified", "sign-off", "approval", "approve evidence"])) {
    return { valid: false, reason: "missing_evidence_certification" };
  }
  if (!includesAny(text, ["priority domain", "critical domain", "largest gap", "highest gap"])) {
    return { valid: false, reason: "missing_priority_domains" };
  }
  if (!includesAny(text, ["control gate", "readiness gate", "controls", "gated"])) {
    return { valid: false, reason: "missing_control_gate" };
  }
  return { valid: true };
}

function validateOverallAdvisoryNarrative(text: string, allowedClientNames: string[]): Module01NarrativeValidation {
  if (containsUnknownCapitalizedClient(text, allowedClientNames)) return { valid: false, reason: "invented_client_name" };
  if (!includesAny(text, ["conclusion", "helicopter view", "overall", "management"])) {
    return { valid: false, reason: "missing_overall_conclusion" };
  }
  return { valid: true };
}

export function validateModule01Narrative(
  output: string,
  context: {
    fieldName: string;
    minWords?: number;
    maxWords: number;
    requiredFactsSupplied?: boolean;
    allowedClientNames?: string[];
    allowedEvidenceIds?: string[];
    allowedSystems?: string[];
    allowedUseCases?: string[];
    officialRegulatoryEvidenceUsed?: boolean;
    allowFallbackText?: boolean;
  },
): Module01NarrativeValidation {
  const text = output.trim();
  if (!text) return { valid: false, reason: "empty_output" };
  if (text === "SECTION_CONTEXT_MISSING") {
    return { valid: !context.requiredFactsSupplied, reason: context.requiredFactsSupplied ? "context_missing_despite_facts" : undefined };
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (bannedPhrases.some((phrase) => text.toLowerCase().includes(phrase.toLowerCase()))) return { valid: false, reason: "persona_leakage" };
  if (modelSelfDescription.test(text) || modelSelfReference.test(text)) return { valid: false, reason: "model_self_reference" };
  if (/[?]\s*$/.test(text) || questionToReader.test(text)) return { valid: false, reason: "asks_reader_question" };
  if (/^\s*[{[]/.test(text) || /[}\]]\s*$/.test(text) || /"[^"]+"\s*:/.test(text)) return { valid: false, reason: "json_like_output" };
  if (/^\s{0,3}#{1,6}\s+/m.test(text)) return { valid: false, reason: "markdown_heading" };
  if (/not provided in diagnostic input/i.test(text)) return { valid: false, reason: "missing_fact_echo" };
  if (/owner types is/i.test(text)) return { valid: false, reason: "unfinished_owner_types" };
  if (unfinishedIsPhrase.test(text)) return { valid: false, reason: "unfinished_phrase" };
  if (weakVariableStitching.test(text)) return { valid: false, reason: "weak_variable_stitching" };
  if (rawHeadlineStitching.test(text)) return { valid: false, reason: "raw_variable_stitching" };
  if (hasDuplicateDecisionText(text)) return { valid: false, reason: "duplicate_decision_text" };
  if (complianceClaim.test(text) && !context.officialRegulatoryEvidenceUsed) {
    return { valid: false, reason: "unsupported_compliance_claim" };
  }

  const evidenceIds = text.match(/\bEVID(?:[-_ ][A-Z0-9-]+|[0-9][A-Z0-9-]*)\b/gi) ?? [];
  const allowedEvidence = new Set((context.allowedEvidenceIds ?? []).map((id) => id.toLowerCase()));
  if (evidenceIds.some((id) => !allowedEvidence.has(id.toLowerCase()))) return { valid: false, reason: "invented_evidence_id" };

  if (context.fieldName === "overallAdvisory.helicopterView") {
    const fieldValidation = validateOverallAdvisoryNarrative(text, context.allowedClientNames ?? []);
    if (!fieldValidation.valid) return fieldValidation;
  } else if (containsUnknownCapitalizedClient(text, context.allowedClientNames ?? [])) {
    return { valid: false, reason: "invented_client_name" };
  }

  if (containsDisallowedNamedItem(text, context.allowedSystems ?? [], "System|Platform|CRM|ERP|PMS|EAM|SCADA|Warehouse|Lakehouse")) {
    return { valid: false, reason: "invented_system_name" };
  }

  if (containsDisallowedNamedItem(text, context.allowedUseCases ?? [], "Use Case|Forecasting|Prediction|Classification|Automation|Assistant|Copilot")) {
    return { valid: false, reason: "invented_use_case" };
  }

  if (!context.allowFallbackText && genericDataGovernance.test(text) && !(context.allowedClientNames ?? []).some((name) => text.includes(name))) {
    return { valid: false, reason: "generic_data_governance_text" };
  }

  if (!context.allowFallbackText && context.fieldName === "boardScorecard.advisoryNarrative") {
    const fieldValidation = validateBoardScorecardNarrative(text);
    if (!fieldValidation.valid) return fieldValidation;
  }

  if (!context.allowFallbackText && context.fieldName === "roadmap.roadmapNarrative") {
    const fieldValidation = validateRoadmapNarrative(text);
    if (!fieldValidation.valid) return fieldValidation;
  }

  if (!context.allowFallbackText && words.length < (context.minWords ?? 18)) return { valid: false, reason: "too_short" };
  if (words.length > context.maxWords) return { valid: false, reason: "too_long" };

  return { valid: true };
}
