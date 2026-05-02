"use client";

type KPIItem = {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "up-good" | "up-bad" | "down-good" | "down-bad" | "neutral";
  sub?: string;
};

export function KPIGrid({ items }: { items: KPIItem[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 10,
        marginBottom: 20,
      }}
    >
      {items.map((item) => {
        const deltaColor =
          item.deltaType === "up-good" || item.deltaType === "down-good"
            ? "#4a7c1f"
            : item.deltaType === "up-bad" || item.deltaType === "down-bad"
            ? "#c0392b"
            : "#888888";

        return (
          <div
            key={item.label}
            style={{
              background: "#f5f4f0",
              borderRadius: 6,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "#999999",
                margin: 0,
              }}
            >
              {item.label}
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: "#1a1a1a",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {item.value}
            </p>
            {item.delta && (
              <p style={{ fontSize: 11, color: deltaColor, margin: 0 }}>
                {item.delta}
              </p>
            )}
            {item.sub && (
              <p style={{ fontSize: 11, color: "#888888", margin: 0 }}>
                {item.sub}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
