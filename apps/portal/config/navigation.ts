import { getApiJson } from "@/lib/api";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  useCase?: string;
  badge?: string;
  requiresRole?: string;
}

const staticNav: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "home" },
  { label: "Reports", href: "/reports", icon: "file-text" },
  { label: "Dictionary", href: "/dictionary", icon: "book-open" },
  { label: "Admin", href: "/admin", icon: "settings", requiresRole: "admin" },
];

export async function buildNavigation(userRole: string): Promise<NavItem[]> {
  const payload = await getApiJson<{
    use_cases?: Record<
      string,
      {
        enabled?: boolean;
        portal_pages?: Array<{
          slug: string;
          label: string;
          icon: string;
          badge?: string;
          tab_order?: number;
        }>;
      }
    >;
  }>({
    path: "/api/v1/config/use-cases",
    fallback: { use_cases: {} },
  });

  const dynamicNav: NavItem[] = [];

  Object.entries(payload.use_cases ?? {}).forEach(([key, useCase]) => {
    if (!useCase.enabled) {
      return;
    }

    [...(useCase.portal_pages ?? [])]
      .sort((left, right) => (left.tab_order ?? 999) - (right.tab_order ?? 999))
      .forEach((page) => {
        dynamicNav.push({
          label: page.label,
          href: `/${page.slug}`,
          icon: page.icon,
          useCase: key,
          badge: page.badge,
        });
      });
  });

  return [
    staticNav[0],
    ...dynamicNav,
    ...staticNav.slice(1).filter((item) => !item.requiresRole || item.requiresRole === userRole),
  ];
}
