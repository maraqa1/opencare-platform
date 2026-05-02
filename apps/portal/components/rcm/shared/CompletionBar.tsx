"use client";

export function CompletionBar({ pct }: { pct: number }) {
  const color =
    pct >= 75 ? "#4a7c1f" :
    pct >= 50 ? "#b7600a" :
                "#c0392b";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "#f0ede6",
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
