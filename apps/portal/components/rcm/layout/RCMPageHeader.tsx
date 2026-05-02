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
        borderBottom: "1px solid rgba(31, 56, 100, 0.08)",
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
              color: "var(--oc-gray-600)",
              margin: "0 0 4px",
            }}
          >
            {eyebrow}
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "var(--oc-gray-900)", margin: "0 0 4px" }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 12, color: "var(--oc-gray-600)", margin: 0 }}>{subtitle}</p>
          )}
          {badges.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {badges.map((b) => {
                const badgeColors = {
                  green:  { bg: "var(--oc-normal-bg)", color: "var(--oc-normal)" },
                  amber:  { bg: "var(--oc-warning-bg)", color: "var(--oc-warning)" },
                  blue:   { bg: "var(--oc-blue-light)", color: "var(--oc-navy)" },
                  gray:   { bg: "var(--oc-gray-100)", color: "var(--oc-gray-600)" },
                };
                const cfg = badgeColors[b.color ?? "gray"];
                return (
                  <span
                    key={b.label}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
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
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 500,
                background: arBreached ? "var(--oc-critical-bg)" : "var(--oc-normal-bg)",
                color: arBreached ? "var(--oc-critical)" : "var(--oc-normal)",
                border: `1px solid ${arBreached ? "rgba(183,28,28,0.2)" : "rgba(46,125,50,0.2)"}`,
              }}
            >
              AR Days: {arDays}d {arBreached ? "⚠" : "✓"} (target {arTarget}d)
            </span>
          )}
          {showCFOButton && (
            <button
              onClick={onCFOClick}
              style={{
                background: "var(--oc-navy)",
                color: "rgba(255,255,255,0.88)",
                border: "none",
                borderRadius: 10,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
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
