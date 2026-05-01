import type { ReactNode } from "react";

import Link from "next/link";

import type { NavItem } from "@/config/navigation";

type Props = {
  pathname: string;
  navigation: NavItem[];
  children: ReactNode;
};

function getTopbarContext(pathname: string) {
  if (pathname.startsWith("/admin")) {
    return {
      label: "Administration",
      title: "Governance and Platform Control",
      badge: "Admin Context",
      actionHref: "/admin",
      actionLabel: "Admin",
    };
  }

  if (pathname.startsWith("/use-cases/revenue-cycle-management")) {
    return {
      label: "Revenue Cycle Management",
      title: "Executive Revenue Workspace",
      badge: "Revenue Ops",
      actionHref: "/admin/governance",
      actionLabel: "Governance",
    };
  }

  return {
    label: "Phase 4b Enhanced",
    title: "Use Case Workspace Architecture",
    badge: "Bed Manager",
    actionHref: "/admin",
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

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo-shell">
            <img
              src="https://yottalogica.com/wp-content/uploads/logo3.png"
              alt="YottaLogica"
              className="brand-logo"
            />
          </div>
          <span className="brand-kicker">OpenCare</span>
          <h1>Hospital Operations Intelligence</h1>
          <p>
            Use case workspaces keep daily operations, decision support, and deep governance
            in the right place.
          </p>
        </div>
        <NavSection title="Global Navigation" items={navigation} pathname={pathname} />
        <section className="nav-section">
          <p className="nav-section-title">Pipeline</p>
          <div className="sidebar-pipeline">
            <span className="status-dot live" />
            <span>8m ago</span>
            <span>6/6 sources</span>
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
