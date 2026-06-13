import type { ReactNode } from "react";

import Link from "next/link";

import type { NavItem } from "@/config/navigation";
import { getUseCaseByPath } from "@/lib/use-cases";

type Props = {
  pathname: string;
  navigation: NavItem[];
  children: ReactNode;
};

function getTopbarContext(pathname: string) {
  if (pathname === "/governance") {
    return {
      label: "Governance",
      title: "KPI entry",
      badge: "Trust mode",
      actionHref: "/governance/health",
      actionLabel: "Health",
    };
  }

  if (pathname.startsWith("/governance/kpi/") && pathname.endsWith("/trace")) {
    return {
      label: "Governance",
      title: "Technical trace",
      badge: "Proof view",
      actionHref: "/governance",
      actionLabel: "Back",
    };
  }

  if (pathname.startsWith("/governance/kpi/")) {
    return {
      label: "Governance",
      title: "KPI trust journey",
      badge: "Trust mode",
      actionHref: "/governance/health",
      actionLabel: "Health",
    };
  }

  if (pathname.startsWith("/governance/asset/")) {
    return {
      label: "Governance",
      title: "Asset detail",
      badge: "Steward view",
      actionHref: "/governance",
      actionLabel: "Back",
    };
  }

  if (pathname.startsWith("/governance/health")) {
    return {
      label: "Governance",
      title: "Governance health",
      badge: "Program view",
      actionHref: "/governance",
      actionLabel: "Entry",
    };
  }

  if (pathname.startsWith("/admin")) {
    return {
      label: "Administration",
      title: "Governance and Platform Control",
      badge: "Admin Context",
      actionHref: "/admin",
      actionLabel: "Admin",
    };
  }

  const useCase = getUseCaseByPath(pathname);
  if (useCase) {
    return useCase.shell;
  }

  return {
    label: "Jazan Municipality",
    title: "Jazan Performance Management",
    badge: "Platform",
    actionHref: "/jazan-performance/admin",
    actionLabel: "Admin",
  };
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <section className="nav-section">
      <p className="nav-section-title">{title}</p>
      <ul className="nav-list">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={isActive ? "nav-link active" : "nav-link"}
              >
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function NavigationShell({ pathname, navigation, children }: Props) {
  const topbar = getTopbarContext(pathname);
  const isFullBleedUseCase =
    pathname === "/" ||
    pathname === "/use-cases/data-management-office-establishment" ||
    pathname === "/use-cases/data-ai-capability-diagnostic" ||
    pathname === "/use-cases/data-strategy-builder";

  if (isFullBleedUseCase) {
    return <>{children}</>;
  }

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo-shell">
            <span className="brand-logo-mark">JM</span>
          </div>
          <span className="brand-kicker">Jazan Municipality</span>
          <p className="brand-title">Jazan Performance Management</p>
          <p>
            RFP-aligned performance management for objectives, KPIs, municipalities, early warning, and corrective
            actions.
          </p>
        </div>
        <NavSection title="Global Navigation" items={navigation} pathname={pathname} />
        <section className="nav-section">
          <p className="nav-section-title">Pipeline</p>
          <div className="sidebar-pipeline">
            <span className="status-dot" />
            <span>Not connected</span>
            <span>No data loaded</span>
          </div>
        </section>
      </aside>
      <main className="main">
        <header className="main-topbar">
          <div>
            <p className="topbar-label">{topbar.label}</p>
            <h2 className="topbar-title">{topbar.title}</h2>
          </div>
          <div className="topbar-actions">
            <span className="persona-badge">{topbar.badge}</span>
            <Link className="settings-link" href={topbar.actionHref}>
              {topbar.actionLabel}
            </Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
