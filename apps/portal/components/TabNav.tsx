import Link from "next/link";

type TabItem = {
  key: string;
  label: string;
  href: string;
};

export function TabNav({
  items,
  activeKey,
}: {
  items: TabItem[];
  activeKey: string;
}) {
  return (
    <nav className="tab-nav" aria-label="Use case tabs">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={item.key === activeKey ? "tab-link active" : "tab-link"}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
