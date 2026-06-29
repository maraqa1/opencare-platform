export type SanitizedTextStatus = "clean" | "sanitized" | "fallback_required";

type SanitizePlainTextOptions = {
  fallbackText: string;
  maxWords: number;
  maxCharacters?: number;
};

export type SanitizedPlainText = {
  text: string;
  status: SanitizedTextStatus;
  rejectionReason?: string;
};

function wordLimit(text: string, maxWords: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text;
  }
  return words.slice(0, maxWords).join(" ");
}

function fallback(fallbackText: string, rejectionReason: string): SanitizedPlainText {
  return {
    text: fallbackText,
    status: "fallback_required",
    rejectionReason,
  };
}

function stripTrailingStructuredPayload(text: string) {
  const structuredMarkers = [
    /\n\s*[{[]/,
    /\n\s*"[^"]+"\s*:/,
    /\n\s*(?:Field|Facts|Prompt|Response|Output)\s*:/i,
  ];
  const markerIndexes = structuredMarkers
    .map((pattern) => text.search(pattern))
    .filter((index) => index > 0);

  if (!markerIndexes.length) {
    return text;
  }

  const candidate = text.slice(0, Math.min(...markerIndexes)).trim();
  const wordCount = candidate.split(/\s+/).filter(Boolean).length;
  if (wordCount < 18 || candidate.includes("{") || candidate.includes("}")) {
    return text;
  }
  return candidate;
}

export function sanitizePlainTextField(raw: string, options: SanitizePlainTextOptions): SanitizedPlainText {
  const fallbackText = options.fallbackText.trim();
  if (!raw || !raw.trim()) {
    return fallback(fallbackText, "empty_output");
  }

  const original = raw;
  let text = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/```/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*[A-Za-z][A-Za-z0-9]*(?:Narrative|View|Summary|Paragraph)\s*:\s*/i, "")
    .replace(/^(?:executive summary|board narrative|narrative|advisory narrative|board scorecard advisory(?: narrative)?|roadmap(?: narrative)?|overall advisory(?: synthesis)?|helicopter view)\s*:\s*/i, "")
    .replace(/^(?:executive summary|board scorecard advisory(?: narrative)?|roadmap(?: narrative)?|overall advisory(?: synthesis)?|helicopter view)\s+(?=for\b|the\b|[A-Z])/i, "")
    .replace(/\s+\(([A-Z]{2,8})\)/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  text = stripTrailingStructuredPayload(text)
    .replace(/\s+/g, " ")
    .trim();

  const lower = text.toLowerCase();
  if (lower.startsWith("here is") || lower.startsWith("```")) {
    return fallback(fallbackText, "unsafe_preface");
  }
  if (/^\s*[{[]/.test(text) || /[}\]]\s*$/.test(text)) {
    return fallback(fallbackText, "json_like_output");
  }
  if (/^\s*(executive summary|board asks|roadmap|priority gap register|deliverable\s+\d+|dmo operating model)\b/i.test(text)) {
    return fallback(fallbackText, "markdown_report_structure");
  }
  if (/\b(dmo operating model|purpose and mandate|metadata, quality, sharing, classification)\b/i.test(text)) {
    return fallback(fallbackText, "generic_report_pack");
  }
  if (text.includes("{") || text.includes("}")) {
    return fallback(fallbackText, "unsafe_json_syntax");
  }

  text = wordLimit(text, options.maxWords);
  if (options.maxCharacters && text.length > options.maxCharacters) {
    text = text.slice(0, options.maxCharacters).trim();
  }

  return {
    text,
    status: text === original.trim() ? "clean" : "sanitized",
  };
}
