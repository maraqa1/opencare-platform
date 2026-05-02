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
      background: "#ffffff",
      color: "#1a1a1a",
      border: "0.5px solid #ddd",
    },
    primary: {
      background: "#1a3050",
      color: "#b8d4f0",
      border: "none",
    },
    cfo: {
      background: "#1a3050",
      color: "#b8d4f0",
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
        borderRadius: 6,
        fontSize: small ? 11 : 12,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {label}
    </button>
  );
}
