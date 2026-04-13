import type { ReactNode } from "react";

import Link from "next/link";

const navigation = {
  customer: [
    { href: "/", label: "Home" },
    { href: "/occupancy-dashboard", label: "Occupancy Dashboard" },
    { href: "/forecast", label: "Forecast" },
    { href: "/anomalies", label: "Anomalies" },
    { href: "/reports", label: "Reports" },
    { href: "/dictionary", label: "Dictionary" },
  ],
  admin: [
    { href: "/admin", label: "Admin Home" },
    { href: "/admin/runtime-status", label: "Runtime Status" },
    { href: "/admin/data-refresh-status", label: "Data Refresh Status" },
    { href: "/admin/platform-health", label: "Platform Health" },
    { href: "/admin/dictionary-management", label: "Dictionary Management" },
  ],
};

type Props = {
  pathname: string;
  children: ReactNode;
};

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
  pathname: string;
}) {
  return (
    <section className="nav-section">
      <p className="nav-section-title">{title}</p>
      <ul className="nav-list">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={isActive ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function NavigationShell({ pathname, children }: Props) {
  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-kicker">OpenCare Insight Platform</span>
          <h1>Bed Occupancy Intelligence</h1>
          <p>
            Customer views stay inside the portal while analytics, runtimes, and
            dashboards remain governed behind the scenes.
          </p>
        </div>
        <NavSection title="Customer" items={navigation.customer} pathname={pathname} />
        <NavSection title="Admin" items={navigation.admin} pathname={pathname} />
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
