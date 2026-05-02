"use client";

import Link from "next/link";

const TABS = [
  { key: "cash-command",        label: "Cash command",       href: "/use-cases/revenue-cycle-management/cash-command" },
  { key: "recovery-queue",      label: "Recovery queue",     href: "/use-cases/revenue-cycle-management/recovery-queue" },
  { key: "payer-control",       label: "Payer control",      href: "/use-cases/revenue-cycle-management/payer-control" },
  { key: "revenue-leakage",     label: "Leakage",            href: "/use-cases/revenue-cycle-management/revenue-leakage" },
  { key: "team-performance",    label: "Team performance",   href: "/use-cases/revenue-cycle-management/team-performance" },
  { key: "executive-narrative", label: "Executive narrative",href: "/use-cases/revenue-cycle-management/executive-narrative" },
];

export function RCMNavTabs({ active }: { active: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        marginBottom: 20,
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 14px",
              borderRadius: 999,
              border: `1px solid ${isActive ? "var(--oc-navy)" : "rgba(31,56,100,0.08)"}`,
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              background: isActive ? "var(--oc-navy)" : "rgba(255,255,255,0.92)",
              color: isActive ? "var(--oc-white)" : "var(--oc-gray-900)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
