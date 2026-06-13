import {
  assertMistralNemoTaskAllowed,
  estimateTokens,
  type LocalLlmTaskMode,
} from "@/lib/mistralNemoInteractionPolicy";
import { logLocalLlmTelemetry, preview } from "@/lib/localLlmTelemetry";

type LocalLlmClientArgs = {
  taskMode: LocalLlmTaskMode;
  fieldPath?: string;
  prompt: string;
  modelConfig: {
    gatewayBaseUrl: string;
    headers: Record<string, string>;
    model: string;
    timeoutMs?: number;
    maxWords?: number;
  };
};

export type LocalLlmClientResult = {
  status: "success" | "timeout" | "blocked" | "error";
  rawOutput: string;
  durationMs: number;
  model: string;
  inputTokenEstimate: number;
  outputTokenEstimate: number;
  error?: string;
};

export async function callLocalLlm(args: LocalLlmClientArgs): Promise<LocalLlmClientResult> {
  const startedAt = Date.now();
  const model = args.modelConfig.model;
  const inputTokenEstimate = estimateTokens(args.prompt);
  let policy;

  try {
    policy = assertMistralNemoTaskAllowed(args.taskMode);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logLocalLlmTelemetry({
      taskMode: args.taskMode,
      fieldPath: args.fieldPath,
      model,
      inputTokenEstimate,
      totalMs: durationMs,
      status: "blocked",
      timeout: false,
      fallbackUsed: true,
      rejectionReason: error instanceof Error ? error.message : "blocked",
    });
    return {
      status: "blocked",
      rawOutput: "",
      durationMs,
      model,
      inputTokenEstimate,
      outputTokenEstimate: 0,
      error: error instanceof Error ? error.message : "Blocked by local LLM policy.",
    };
  }

  if (inputTokenEstimate > policy.maxInputTokens || inputTokenEstimate > 3500) {
    const durationMs = Date.now() - startedAt;
    const error = `Prompt too large for ${args.taskMode}: ${inputTokenEstimate} estimated tokens.`;
    logLocalLlmTelemetry({
      taskMode: args.taskMode,
      fieldPath: args.fieldPath,
      model,
      inputTokenEstimate,
      totalMs: durationMs,
      status: "blocked",
      timeout: false,
      fallbackUsed: true,
      rejectionReason: error,
    });
    return {
      status: "blocked",
      rawOutput: "",
      durationMs,
      model,
      inputTokenEstimate,
      outputTokenEstimate: 0,
      error,
    };
  }

  const abortController = new AbortController();
  const timeoutMs = args.modelConfig.timeoutMs ?? policy.timeoutMs;
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(`${args.modelConfig.gatewayBaseUrl}/chat/completions`, {
      method: "POST",
      headers: args.modelConfig.headers,
      signal: abortController.signal,
      body: JSON.stringify({
        model,
        temperature: policy.temperature,
        top_p: policy.topP,
        max_tokens: Math.min(policy.maxOutputTokens, 180),
        num_predict: Math.min(policy.maxOutputTokens, 180),
        options: {
          temperature: policy.temperature,
          top_p: policy.topP,
          repeat_penalty: policy.repeatPenalty,
          num_ctx: policy.numCtx,
          num_predict: Math.min(policy.maxOutputTokens, 180),
          stop: ["```", "\n#", "\n##", "{", "}"],
        },
        messages: [
          {
            role: "user",
            content: args.prompt,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const durationMs = Date.now() - startedAt;
      const error = `Local LLM gateway returned ${response.status}.`;
      logLocalLlmTelemetry({
        taskMode: args.taskMode,
        fieldPath: args.fieldPath,
        model,
        inputTokenEstimate,
        totalMs: durationMs,
        status: "error",
        timeout: false,
        fallbackUsed: true,
        rejectionReason: error,
      });
      return {
        status: "error",
        rawOutput: "",
        durationMs,
        model,
        inputTokenEstimate,
        outputTokenEstimate: 0,
        error,
      };
    }

    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const rawOutput = body.choices?.[0]?.message?.content ?? "";
    const durationMs = Date.now() - startedAt;
    const outputTokenEstimate = estimateTokens(rawOutput);
    logLocalLlmTelemetry({
      taskMode: args.taskMode,
      fieldPath: args.fieldPath,
      model,
      inputTokenEstimate,
      outputTokenEstimate,
      totalMs: durationMs,
      status: "success",
      timeout: false,
      fallbackUsed: false,
      rawOutputPreview: preview(rawOutput),
    });
    return {
      status: "success",
      rawOutput,
      durationMs,
      model,
      inputTokenEstimate,
      outputTokenEstimate,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const timeoutHit = error instanceof DOMException && error.name === "AbortError";
    logLocalLlmTelemetry({
      taskMode: args.taskMode,
      fieldPath: args.fieldPath,
      model,
      inputTokenEstimate,
      totalMs: durationMs,
      status: timeoutHit ? "timeout" : "error",
      timeout: timeoutHit,
      fallbackUsed: true,
      rejectionReason: error instanceof Error ? error.message : "local_llm_error",
    });
    return {
      status: timeoutHit ? "timeout" : "error",
      rawOutput: "",
      durationMs,
      model,
      inputTokenEstimate,
      outputTokenEstimate: 0,
      error: error instanceof Error ? error.message : "Local LLM request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
