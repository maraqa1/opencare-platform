"use client";

const FLAG_CONFIG = {
  Flagged:   { bg: "#fdecea", color: "#c0392b" },
  Watch:     { bg: "#fef5e4", color: "#b7600a" },
  Compliant: { bg: "#f0f7e8", color: "#4a7c1f" },
};

export function FlagPill({ status }: { status: "Flagged" | "Watch" | "Compliant" }) {
  const cfg = FLAG_CONFIG[status] ?? { bg: "#f5f4f0", color: "#888888" };
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
      {status}
    </span>
  );
}
