"use client";


type Badge = { label: string; color?: "green" | "amber" | "blue" | "gray" };

export function RCMPageHeader({
  eyebrow = "USE CASE WORKSPACE",
  title = "Revenue Cycle Management",
  subtitle,
  badges = [],
  arDays,
  arTarget = 40,
  showCFOButton = false,
  onCFOClick,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  badges?: Badge[];
  arDays?: number;
  arTarget?: number;
  showCFOButton?: boolean;
  onCFOClick?: () => void;
}) {
  const arBreached = arDays != null && arDays > arTarget;

  return (
    <div
      style={{
        padding: "20px 0 16px",
        borderBottom: "0.5px solid #e5e3dc",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 400,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "#999999",
              margin: "0 0 4px",
            }}
          >
            {eyebrow}
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#1a1a1a", margin: "0 0 4px" }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 12, color: "#888888", margin: 0 }}>{subtitle}</p>
          )}
          {badges.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {badges.map((b) => {
                const badgeColors = {
                  green:  { bg: "#f0f7e8", color: "#4a7c1f" },
                  amber:  { bg: "#fef5e4", color: "#b7600a" },
                  blue:   { bg: "#e8f0f9", color: "#1a3050" },
                  gray:   { bg: "#f5f4f0", color: "#888888" },
                };
                const cfg = badgeColors[b.color ?? "gray"];
                return (
                  <span
                    key={b.label}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 500,
                      background: cfg.bg,
                      color: cfg.color,
                    }}
                  >
                    {b.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {arDays != null && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                background: arBreached ? "#fdecea" : "#f0f7e8",
                color: arBreached ? "#c0392b" : "#4a7c1f",
                border: `0.5px solid ${arBreached ? "#f5c8c8" : "#c3e6a8"}`,
              }}
            >
              AR Days: {arDays}d {arBreached ? "⚠" : "✓"} (target {arTarget}d)
            </span>
          )}
          {showCFOButton && (
            <button
              onClick={onCFOClick}
              style={{
                background: "#1a3050",
                color: "#b8d4f0",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              CFO View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
