import type { ReactNode } from "react";

import Link from "next/link";

import type { NavItem } from "@/config/navigation";

type Props = {
  pathname: string;
  navigation: NavItem[];
  children: ReactNode;
};

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
          const isActive = pathname === item.href;
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
  const customerItems = navigation.filter((item) => !item.requiresRole || item.requiresRole !== "admin");
  const adminItems = [
    ...navigation.filter((item) => item.requiresRole === "admin"),
    { href: "/admin/health", label: "Platform Health", icon: "pulse", requiresRole: "admin" },
    { href: "/admin/ingestion", label: "Ingestion Status", icon: "database", requiresRole: "admin" },
    { href: "/admin/runtime", label: "Runtime Status", icon: "activity", requiresRole: "admin" },
  ];

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-kicker">OpenCare Insight Platform</span>
          <h1>Bed Occupancy Intelligence</h1>
          <p>
            Customer views stay inside the portal while analytics, runtimes, dashboards,
            and record contracts remain governed behind the scenes.
          </p>
        </div>
        <NavSection title="Use Cases" items={customerItems} pathname={pathname} />
        <NavSection title="Admin" items={adminItems} pathname={pathname} />
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
