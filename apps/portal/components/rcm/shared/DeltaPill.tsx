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
  let bg = "var(--oc-gray-100)";
  let color = "var(--oc-gray-600)";

  if (direction === "flat") {
    bg = "var(--oc-gray-100)";
    color = "var(--oc-gray-600)";
  } else if (direction === "up") {
    bg = positive ? "var(--oc-normal-bg)" : "var(--oc-critical-bg)";
    color = positive ? "var(--oc-normal)" : "var(--oc-critical)";
  } else {
    bg = positive ? "var(--oc-critical-bg)" : "var(--oc-normal-bg)";
    color = positive ? "var(--oc-critical)" : "var(--oc-normal)";
  }

  const arrow = direction === "flat" ? "—" : direction === "up" ? "↑" : "↓";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: "2px 8px",
        borderRadius: 999,
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
