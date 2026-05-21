"use client";

const FLAG_CONFIG = {
  Flagged:   { bg: "var(--oc-critical-bg)", color: "var(--oc-critical)" },
  Watch:     { bg: "var(--oc-warning-bg)", color: "var(--oc-warning)" },
  Compliant: { bg: "var(--oc-normal-bg)", color: "var(--oc-normal)" },
};

export function FlagPill({ status }: { status: "Flagged" | "Watch" | "Compliant" }) {
  const cfg = FLAG_CONFIG[status] ?? { bg: "var(--oc-gray-100)", color: "var(--oc-gray-600)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
