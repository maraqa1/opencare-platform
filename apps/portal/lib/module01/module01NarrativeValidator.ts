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

function containsUnknownCapitalizedClient(text: string, allowedClientNames: string[]) {
  const normalizedAllowed = allowedClientNames.map((name) => name.toLowerCase()).filter(Boolean);
  if (/\b(sample|example|demo)\s+(client|customer|organisation|organization)\b/i.test(text)) {
    return true;
  }
  const clientMatches = text.match(/\b[A-Z][A-Za-z0-9&.\- ]{2,60}\s+(Organisation|Organization|Company|Authority|Investment|Group)\b/g) ?? [];
  return clientMatches.some((match) => !normalizedAllowed.some((allowed) => match.toLowerCase().includes(allowed)));
}

function containsDisallowedNamedItem(text: string, allowedValues: string[], suffixPattern: string) {
  const allowed = allowedValues.map((value) => value.toLowerCase()).filter(Boolean);
  const matches = text.match(new RegExp(`\\b[A-Z][A-Za-z0-9&.\\- ]{2,60}\\s+(${suffixPattern})\\b`, "g")) ?? [];
  return matches.some((match) => !allowed.some((value) => match.toLowerCase().includes(value)));
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
  if (complianceClaim.test(text) && !context.officialRegulatoryEvidenceUsed) {
    return { valid: false, reason: "unsupported_compliance_claim" };
  }

  const evidenceIds = text.match(/\bEVID(?:[-_ ][A-Z0-9-]+|[0-9][A-Z0-9-]*)\b/gi) ?? [];
  const allowedEvidence = new Set((context.allowedEvidenceIds ?? []).map((id) => id.toLowerCase()));
  if (evidenceIds.some((id) => !allowedEvidence.has(id.toLowerCase()))) return { valid: false, reason: "invented_evidence_id" };

  if (containsUnknownCapitalizedClient(text, context.allowedClientNames ?? [])) return { valid: false, reason: "invented_client_name" };

  if (containsDisallowedNamedItem(text, context.allowedSystems ?? [], "System|Platform|CRM|ERP|PMS|EAM|SCADA|Warehouse|Lakehouse")) {
    return { valid: false, reason: "invented_system_name" };
  }

  if (containsDisallowedNamedItem(text, context.allowedUseCases ?? [], "Use Case|Forecasting|Prediction|Classification|Automation|Assistant|Copilot")) {
    return { valid: false, reason: "invented_use_case" };
  }

  if (!context.allowFallbackText && genericDataGovernance.test(text) && !(context.allowedClientNames ?? []).some((name) => text.includes(name))) {
    return { valid: false, reason: "generic_data_governance_text" };
  }

  if (!context.allowFallbackText && words.length < (context.minWords ?? 18)) return { valid: false, reason: "too_short" };
  if (words.length > context.maxWords) return { valid: false, reason: "too_long" };

  return { valid: true };
}
