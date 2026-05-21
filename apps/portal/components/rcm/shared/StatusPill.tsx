"use client";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  open:           { label: "Open",           bg: "var(--oc-gray-100)", color: "var(--oc-gray-600)" },
  in_appeal:      { label: "In Appeal",      bg: "var(--oc-blue-light)", color: "var(--oc-navy)" },
  submitted:      { label: "Submitted",      bg: "rgba(0,105,92,0.10)", color: "var(--oc-teal)" },
  in_progress:    { label: "In Progress",    bg: "var(--oc-warning-bg)", color: "var(--oc-warning)" },
  escalated:      { label: "Escalated",      bg: "var(--oc-warning-bg)", color: "var(--oc-warning)" },
  write_off_risk: { label: "Write-off Risk", bg: "var(--oc-critical-bg)", color: "var(--oc-critical)" },
  assigned:       { label: "Assigned",       bg: "var(--oc-blue-light)", color: "var(--oc-navy)" },
  appeal_pending: { label: "Appeal Pending", bg: "var(--oc-blue-light)", color: "var(--oc-navy)" },
  under_review:   { label: "Under Review",   bg: "var(--oc-warning-bg)", color: "var(--oc-warning)" },
  completed:      { label: "Completed",      bg: "rgba(0,105,92,0.10)", color: "var(--oc-teal)" },
  resolved:       { label: "Resolved",       bg: "rgba(0,105,92,0.10)", color: "var(--oc-teal)" },
  dismissed:      { label: "Dismissed",      bg: "var(--oc-gray-100)", color: "var(--oc-gray-600)" },
  expired:        { label: "Expired",        bg: "var(--oc-critical-bg)", color: "var(--oc-critical)" },
  closed:         { label: "Closed",         bg: "var(--oc-gray-100)", color: "var(--oc-gray-600)" },
};

export function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "var(--oc-gray-100)", color: "var(--oc-gray-600)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
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
