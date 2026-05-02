"use client";

const CONFIG = {
  High:   { bg: "var(--oc-normal-bg)", color: "var(--oc-normal)" },
  Medium: { bg: "var(--oc-warning-bg)", color: "var(--oc-warning)" },
  Low:    { bg: "var(--oc-critical-bg)", color: "var(--oc-critical)" },
};

export function RecoverabilityPill({ level }: { level: "High" | "Medium" | "Low" }) {
  const cfg = CONFIG[level] ?? { bg: "var(--oc-gray-100)", color: "var(--oc-gray-600)" };
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
      {level}
    </span>
  );
}
