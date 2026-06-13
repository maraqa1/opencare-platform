import type { LocalLlmTaskMode } from "@/lib/mistralNemoInteractionPolicy";

type NarrativePromptArgs = {
  fieldPath: string;
  facts: string;
  maxWords: number;
};

type ReasoningPromptArgs = {
  task: string;
  facts: string;
  maxWords: number;
};

type GroundedQaPromptArgs = {
  question: string;
  retrievedContext: string;
};

export function buildNarrativeFieldPrompt({ fieldPath, facts, maxWords }: NarrativePromptArgs) {
  return [
    "You are writing one plain-text field inside a structured report.",
    "",
    "Return plain text only.",
    "",
    "Rules:",
    "- No Markdown.",
    "- No bullets.",
    "- No numbering.",
    "- No heading.",
    "- No JSON.",
    "- No code fence.",
    "- No table.",
    "- No label.",
    `- Maximum ${maxWords} words.`,
    "- Use only the supplied facts.",
    "- Do not invent data sources, scores, claims, regulations, or obligations.",
    "- If facts are insufficient, write a cautious factual sentence.",
    "",
    `Field: ${fieldPath}`,
    "",
    `Facts: ${facts}`,
    "",
    "Write the field text only.",
  ].join("\n");
}

export function buildReasoningNotesPrompt({ task, facts, maxWords }: ReasoningPromptArgs) {
  return [
    "You are producing internal reasoning notes for a deterministic report builder.",
    "",
    "Return concise internal notes only.",
    "",
    "Rules:",
    "- These notes are not shown directly to the user.",
    "- Do not produce JSON.",
    "- Do not produce Markdown headings.",
    "- Focus only on the supplied facts.",
    "- Do not invent data.",
    `- Maximum ${maxWords} words.`,
    "",
    `Task: ${task}`,
    "",
    `Facts: ${facts}`,
  ].join("\n");
}

export function buildGroundedQaPrompt({ question, retrievedContext }: GroundedQaPromptArgs) {
  return [
    "You are answering using retrieved source context.",
    "",
    "Rules:",
    "- Use only the retrieved context for factual/regulatory claims.",
    "- If context is insufficient, say the answer is not found in the loaded knowledge pack.",
    "- Do not invent obligations, control numbers, policy clauses, or source references.",
    "- Keep the answer concise.",
    "- Cite source chunk IDs where provided.",
    "",
    `Question: ${question}`,
    "",
    `Retrieved context: ${retrievedContext}`,
  ].join("\n");
}

export function taskModeLabel(taskMode: LocalLlmTaskMode) {
  return taskMode.replaceAll("_", " ");
}
