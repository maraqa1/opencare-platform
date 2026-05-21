"use client";

export function CompletionBar({ pct }: { pct: number }) {
  const color =
    pct >= 75 ? "var(--oc-normal)" :
    pct >= 50 ? "var(--oc-warning)" :
                "var(--oc-critical)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "rgba(31, 56, 100, 0.06)",
          overflow: "hidden",
          minWidth: 48,
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
