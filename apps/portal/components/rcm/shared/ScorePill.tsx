"use client";

import { scoreBand } from "@/lib/scoring";

export function ScorePill({ score }: { score: number }) {
  const band = scoreBand(score);
  const cfg =
    band === "High"   ? { bg: "var(--oc-normal-bg)", color: "var(--oc-normal)" } :
    band === "Medium" ? { bg: "var(--oc-warning-bg)", color: "var(--oc-warning)" } :
                        { bg: "var(--oc-critical-bg)", color: "var(--oc-critical)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
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
