export interface NavItem {
  label: string;
  href: string;
  icon: string;
  useCase?: string;
  badge?: string;
  requiresRole?: string;
}

const staticNav: NavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Governance", href: "/governance", icon: "shield" },
  { label: "Use Cases", href: "/use-cases", icon: "grid" },
  { label: "Reports", href: "/reports", icon: "file-text" },
  { label: "Administration", href: "/admin", icon: "settings", requiresRole: "admin" },
];

export function buildNavigation(userRole: string): NavItem[] {
  return staticNav.filter((item) => !item.requiresRole || item.requiresRole === userRole);
}
