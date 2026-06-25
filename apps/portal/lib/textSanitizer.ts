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
    .replace(/^(?:board narrative|narrative|advisory narrative|board scorecard advisory)\s*:\s*/i, "")
    .replace(/\s+\(([A-Z]{2,8})\)/g, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const lower = text.toLowerCase();
  if (lower.startsWith("here is") || lower.startsWith("```")) {
    return fallback(fallbackText, "unsafe_preface");
  }
  if (/^\s*[{[]/.test(text) || /[}\]]\s*$/.test(text)) {
    return fallback(fallbackText, "json_like_output");
  }
  if (/^\s*(executive summary|board asks|roadmap|priority gap register)\b/i.test(text)) {
    return fallback(fallbackText, "markdown_report_structure");
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
