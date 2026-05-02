"use client";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  open:           { label: "Open",           bg: "#f5f4f0", color: "#888888" },
  in_appeal:      { label: "In Appeal",      bg: "#e8f0f9", color: "#1a3050" },
  submitted:      { label: "Submitted",      bg: "#e1f5ee", color: "#0f6e56" },
  in_progress:    { label: "In Progress",    bg: "#fef5e4", color: "#b7600a" },
  escalated:      { label: "Escalated",      bg: "#fef5e4", color: "#b7600a" },
  write_off_risk: { label: "Write-off Risk", bg: "#fdecea", color: "#c0392b" },
  assigned:       { label: "Assigned",       bg: "#e8f0f9", color: "#1a3050" },
  appeal_pending: { label: "Appeal Pending", bg: "#e8f0f9", color: "#1a3050" },
  under_review:   { label: "Under Review",   bg: "#fef5e4", color: "#b7600a" },
  completed:      { label: "Completed",      bg: "#e1f5ee", color: "#0f6e56" },
  resolved:       { label: "Resolved",       bg: "#e1f5ee", color: "#0f6e56" },
  dismissed:      { label: "Dismissed",      bg: "#f5f4f0", color: "#888888" },
  expired:        { label: "Expired",        bg: "#fdecea", color: "#c0392b" },
  closed:         { label: "Closed",         bg: "#f5f4f0", color: "#888888" },
};

export function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "#f5f4f0", color: "#888888" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}
