"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
              borderRadius: 20,
              border: `0.5px solid ${isActive ? "#1a3050" : "#ddd"}`,
              fontSize: 12,
              fontWeight: isActive ? 500 : 400,
              background: isActive ? "#1a3050" : "#ffffff",
              color: isActive ? "#ffffff" : "#1a1a1a",
              textDecoration: "none",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
