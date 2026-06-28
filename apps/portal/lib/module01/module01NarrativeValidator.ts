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
];

const modelSelfDescription = /\b(as|i am|i'm)\s+(llama|mistral|gpt|claude|ollama)\b/i;

function containsUnknownCapitalizedClient(text: string, allowedClientNames: string[]) {
  const normalizedAllowed = allowedClientNames.map((name) => name.toLowerCase()).filter(Boolean);
  if (/\b(sample|example|demo)\s+(client|customer|organisation|organization)\b/i.test(text)) {
    return true;
  }
  const clientMatches = text.match(/\b[A-Z][A-Za-z0-9&.\- ]{2,60}\s+(Organisation|Organization|Company|Authority|Investment|Group)\b/g) ?? [];
  return clientMatches.some((match) => !normalizedAllowed.some((allowed) => match.toLowerCase().includes(allowed)));
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
  if (!context.allowFallbackText && words.length < (context.minWords ?? 18)) return { valid: false, reason: "too_short" };
  if (words.length > context.maxWords) return { valid: false, reason: "too_long" };
  if (bannedPhrases.some((phrase) => text.toLowerCase().includes(phrase.toLowerCase()))) return { valid: false, reason: "persona_leakage" };
  if (modelSelfDescription.test(text)) return { valid: false, reason: "model_self_reference" };
  if (/[?]\s*$/.test(text) || /\bwhat would you like\b/i.test(text)) return { valid: false, reason: "asks_reader_question" };
  if (/^\s*[{[]/.test(text) || /[}\]]\s*$/.test(text)) return { valid: false, reason: "json_like_output" };
  if (/^\s{0,3}#{1,6}\s+/m.test(text)) return { valid: false, reason: "markdown_heading" };
  if (/\bofficially compliant\b|\bcertified compliant\b|\bregulatory compliance is achieved\b/i.test(text) && !context.officialRegulatoryEvidenceUsed) {
    return { valid: false, reason: "unsupported_compliance_claim" };
  }

  const evidenceIds = text.match(/\bEVID[-_ ]?[A-Z0-9-]+\b/gi) ?? [];
  const allowedEvidence = new Set((context.allowedEvidenceIds ?? []).map((id) => id.toLowerCase()));
  if (evidenceIds.some((id) => !allowedEvidence.has(id.toLowerCase()))) return { valid: false, reason: "invented_evidence_id" };

  if (containsUnknownCapitalizedClient(text, context.allowedClientNames ?? [])) return { valid: false, reason: "invented_client_name" };

  if (!context.allowFallbackText && /\bdata governance is important\b/i.test(text) && !(context.allowedClientNames ?? []).some((name) => text.includes(name))) {
    return { valid: false, reason: "generic_data_governance_text" };
  }

  return { valid: true };
}

