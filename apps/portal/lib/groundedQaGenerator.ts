import { callLocalLlm } from "@/lib/localLlmClient";
import { buildGroundedQaPrompt } from "@/lib/promptContracts";
import { sanitizePlainTextField } from "@/lib/textSanitizer";

type GenerateGroundedQaArgs = {
  question: string;
  retrievedContext: string;
  fallbackText?: string;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs?: number;
  };
};

const missingKnowledgePackMessage = "Official regulatory source material has not been loaded into the knowledge pack yet.";

export async function generateGroundedQa(args: GenerateGroundedQaArgs) {
  const fallbackText = args.fallbackText ?? missingKnowledgePackMessage;
  if (!args.retrievedContext.trim()) {
    return {
      text: missingKnowledgePackMessage,
      status: "fallback" as const,
      durationMs: 0,
      rejectionReason: "missing_retrieved_context",
    };
  }

  const result = await callLocalLlm({
    taskMode: "grounded_qa",
    prompt: buildGroundedQaPrompt({
      question: args.question,
      retrievedContext: args.retrievedContext,
    }),
    modelConfig: args.modelConfig,
  });
  if (result.status !== "success") {
    return { text: fallbackText, status: "fallback" as const, durationMs: result.durationMs };
  }

  const sanitized = sanitizePlainTextField(result.rawOutput, {
    fallbackText,
    maxWords: 140,
  });
  return {
    text: sanitized.status === "fallback_required" ? fallbackText : sanitized.text,
    status: sanitized.status === "fallback_required" ? "fallback" as const : "ai_enriched" as const,
    durationMs: result.durationMs,
    rejectionReason: sanitized.rejectionReason,
  };
}
