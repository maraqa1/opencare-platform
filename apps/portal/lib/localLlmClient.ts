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

type MistralNemoPolicy = ReturnType<typeof assertMistralNemoTaskAllowed>;
const ai2DirectChatUrl = "https://ai2.opendatalake.com/api/chat";

export type LocalLlmClientResult = {
  status: "success" | "timeout" | "blocked" | "error";
  rawOutput: string;
  durationMs: number;
  model: string;
  inputTokenEstimate: number;
  outputTokenEstimate: number;
  error?: string;
};

function nativeChatUrlFromGateway(gatewayBaseUrl: string) {
  try {
    const url = new URL(gatewayBaseUrl);
    url.pathname = "/api/chat";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return gatewayBaseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "") + "/api/chat";
  }
}

function shouldTryNativeChat(status: number) {
  return status === 404 || status === 405 || status === 502 || status === 503 || status === 504;
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls));
}

function openAiChatRequest(args: LocalLlmClientArgs, policy: MistralNemoPolicy, model: string): Omit<RequestInit, "signal"> {
  return {
    method: "POST",
    headers: args.modelConfig.headers,
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
  };
}

function nativeChatRequest(args: LocalLlmClientArgs, policy: MistralNemoPolicy): Omit<RequestInit, "signal"> {
  return {
    method: "POST",
    headers: args.modelConfig.headers,
    body: JSON.stringify({
      model: args.modelConfig.model,
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
        stop: ["```", "\n#", "\n##", "{", "}", "\nDeliverable", "Deliverable", "\nField:", "\nFacts:", "\nPrompt:"],
      },
      messages: [
        {
          role: "user",
          content: args.prompt,
        },
      ],
    }),
    cache: "no-store",
  };
}

function unwrapPossibleJsonText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>;
      answer?: string;
      content?: string;
      message?: string;
      response?: string;
    };
    return parsed.choices?.[0]?.message?.content
      ?? parsed.choices?.[0]?.text
      ?? parsed.answer
      ?? parsed.content
      ?? parsed.response
      ?? parsed.message
      ?? value;
  } catch {
    return value;
  }
}

async function readLlmResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await response.json() as string | {
      choices?: Array<{ message?: { content?: string }; text?: string }>;
      answer?: string;
      content?: string;
      message?: string;
      response?: string;
    };
    if (typeof body === "string") {
      return unwrapPossibleJsonText(body);
    }
    const content = body.choices?.[0]?.message?.content
      ?? body.choices?.[0]?.text
      ?? body.answer
      ?? body.content
      ?? body.response
      ?? body.message
      ?? "";
    return unwrapPossibleJsonText(content);
  }
  return unwrapPossibleJsonText(await response.text());
}

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
    const preferNativeChat = args.taskMode === "narrative_field";
    let response = preferNativeChat
      ? await fetch(nativeChatUrlFromGateway(args.modelConfig.gatewayBaseUrl), {
        ...nativeChatRequest(args, policy),
        signal: abortController.signal,
      })
      : await fetch(`${args.modelConfig.gatewayBaseUrl}/chat/completions`, {
        ...openAiChatRequest(args, policy, model),
        signal: abortController.signal,
      });
    if (preferNativeChat && !response.ok && shouldTryNativeChat(response.status)) {
      const fallbackUrls = uniqueUrls([
        nativeChatUrlFromGateway(args.modelConfig.gatewayBaseUrl),
        ai2DirectChatUrl,
      ]).slice(1);
      for (const url of fallbackUrls) {
        response = await fetch(url, {
          ...nativeChatRequest(args, policy),
          signal: abortController.signal,
        });
        if (response.ok || !shouldTryNativeChat(response.status)) break;
      }
    }
    const finalResponse = !preferNativeChat && !response.ok && shouldTryNativeChat(response.status)
      ? await fetch(nativeChatUrlFromGateway(args.modelConfig.gatewayBaseUrl), {
        ...nativeChatRequest(args, policy),
        signal: abortController.signal,
      })
      : response;

    if (!finalResponse.ok) {
      const durationMs = Date.now() - startedAt;
      const error = `Local LLM gateway returned ${finalResponse.status}.`;
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

    const rawOutput = await readLlmResponse(finalResponse);
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
