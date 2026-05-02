"use client";

const CONFIG = {
  High:   { bg: "#f0f7e8", color: "#4a7c1f" },
  Medium: { bg: "#fef5e4", color: "#b7600a" },
  Low:    { bg: "#fdecea", color: "#c0392b" },
};

export function RecoverabilityPill({ level }: { level: "High" | "Medium" | "Low" }) {
  const cfg = CONFIG[level] ?? { bg: "#f5f4f0", color: "#888888" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 12,
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
