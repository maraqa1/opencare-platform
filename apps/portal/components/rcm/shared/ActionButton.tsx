"use client";

export function ActionButton({
  label,
  onClick,
  variant = "default",
  small = false,
}: {
  label: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "cfo";
  small?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: "var(--oc-white)",
      color: "var(--oc-gray-900)",
      border: "1px solid rgba(31, 56, 100, 0.08)",
    },
    primary: {
      background: "var(--oc-navy)",
      color: "rgba(255,255,255,0.88)",
      border: "none",
    },
    cfo: {
      background: "var(--oc-navy)",
      color: "rgba(255,255,255,0.88)",
      border: "none",
    },
  };

  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: small ? "4px 10px" : "6px 14px",
        borderRadius: 10,
        fontSize: small ? 12 : 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {label}
    </button>
  );
}
