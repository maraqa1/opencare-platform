export type LocalLlmTaskMode =
  | "narrative_field"
  | "short_summary"
  | "reasoning_notes"
  | "classification_small"
  | "grounded_qa"
  | "forbidden_json_section"
  | "forbidden_full_report";

export type OutputContract =
  | "plain_text_only"
  | "plain_text_or_short_bullets_internal_only"
  | "controlled_label_only"
  | "answer_with_citations_if_context_available"
  | "forbidden";

export type MistralNemoPolicy = {
  allowed: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  timeoutMs: number;
  temperature: number;
  topP: number;
  numCtx: number;
  repeatPenalty: number;
  outputContract: OutputContract;
};

export const mistralNemoInteractionPolicy: Record<LocalLlmTaskMode, MistralNemoPolicy> = {
  narrative_field: {
    allowed: true,
    maxInputTokens: 1800,
    maxOutputTokens: 180,
    timeoutMs: 30000,
    temperature: 0.1,
    topP: 0.6,
    numCtx: 4096,
    repeatPenalty: 1.15,
    outputContract: "plain_text_only",
  },
  short_summary: {
    allowed: true,
    maxInputTokens: 2500,
    maxOutputTokens: 220,
    timeoutMs: 40000,
    temperature: 0.1,
    topP: 0.6,
    numCtx: 4096,
    repeatPenalty: 1.15,
    outputContract: "plain_text_only",
  },
  reasoning_notes: {
    allowed: true,
    maxInputTokens: 2500,
    maxOutputTokens: 250,
    timeoutMs: 45000,
    temperature: 0.2,
    topP: 0.7,
    numCtx: 4096,
    repeatPenalty: 1.1,
    outputContract: "plain_text_or_short_bullets_internal_only",
  },
  classification_small: {
    allowed: true,
    maxInputTokens: 1200,
    maxOutputTokens: 80,
    timeoutMs: 30000,
    temperature: 0,
    topP: 0.5,
    numCtx: 2048,
    repeatPenalty: 1.1,
    outputContract: "controlled_label_only",
  },
  grounded_qa: {
    allowed: true,
    maxInputTokens: 3500,
    maxOutputTokens: 300,
    timeoutMs: 45000,
    temperature: 0.1,
    topP: 0.6,
    numCtx: 4096,
    repeatPenalty: 1.15,
    outputContract: "answer_with_citations_if_context_available",
  },
  forbidden_json_section: {
    allowed: false,
    maxInputTokens: 0,
    maxOutputTokens: 0,
    timeoutMs: 0,
    temperature: 0,
    topP: 0,
    numCtx: 0,
    repeatPenalty: 0,
    outputContract: "forbidden",
  },
  forbidden_full_report: {
    allowed: false,
    maxInputTokens: 0,
    maxOutputTokens: 0,
    timeoutMs: 0,
    temperature: 0,
    topP: 0,
    numCtx: 0,
    repeatPenalty: 0,
    outputContract: "forbidden",
  },
};

export function assertMistralNemoTaskAllowed(taskMode: LocalLlmTaskMode) {
  const policy = mistralNemoInteractionPolicy[taskMode];
  if (!policy?.allowed) {
    throw new Error(`mistral-nemo:12b is not allowed for task mode ${taskMode}. Code must own report structure.`);
  }
  return policy;
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
