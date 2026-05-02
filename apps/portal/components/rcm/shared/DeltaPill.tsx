"use client";

export function DeltaPill({
  direction,
  value,
  positive = false,
}: {
  direction: "up" | "down" | "flat";
  value: string;
  positive?: boolean;
}) {
  let bg = "#f5f4f0";
  let color = "#888888";

  if (direction === "flat") {
    bg = "#f5f4f0";
    color = "#888888";
  } else if (direction === "up") {
    bg = positive ? "#f0f7e8" : "#fdecea";
    color = positive ? "#4a7c1f" : "#c0392b";
  } else {
    bg = positive ? "#fdecea" : "#f0f7e8";
    color = positive ? "#c0392b" : "#4a7c1f";
  }

  const arrow = direction === "flat" ? "—" : direction === "up" ? "↑" : "↓";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 500,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {arrow} {value}
    </span>
  );
}
