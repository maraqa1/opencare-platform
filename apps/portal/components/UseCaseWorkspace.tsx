import type { ReactNode } from "react";

import { TabNav } from "@/components/TabNav";
import { bedPressureTabs } from "@/lib/use-cases";

export function UseCaseWorkspace({
  activeTab,
  title = "Bed Pressure Intelligence",
  description = "A self-contained module for occupancy pressure, breach forecasting, trend evidence, operational decisions, and one-click provenance.",
  trustItems = ["Pipeline 8m ago", "6/6 sources", "42/42 tests"],
  tabs = bedPressureTabs,
  headerActions,
  children,
}: {
  activeTab: string;
  title?: string;
  description?: string;
  trustItems?: string[];
  tabs?: Array<{ key: string; label: string; href: string }>;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="workspace">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Use Case Workspace</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="workspace-header-side">
          {headerActions ? <div className="button-row">{headerActions}</div> : null}
          <div className="workspace-trust">
            <span className="status-dot live" />
            {trustItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>
      <TabNav items={tabs} activeKey={activeTab} />
      {children}
    </div>
  );
}
