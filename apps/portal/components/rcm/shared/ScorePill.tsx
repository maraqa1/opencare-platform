"use client";

import { scoreBand } from "@/lib/scoring";

export function ScorePill({ score }: { score: number }) {
  const band = scoreBand(score);
  const cfg =
    band === "High"   ? { bg: "#f0f7e8", color: "#4a7c1f" } :
    band === "Medium" ? { bg: "#fef5e4", color: "#b7600a" } :
                        { bg: "#fdecea", color: "#c0392b" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      {band} · {score.toLocaleString("en-GB")}
    </span>
  );
}
