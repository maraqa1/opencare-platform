import type { ReactNode } from "react";

import { TabNav } from "@/components/TabNav";
import { bedPressureTabs } from "@/lib/use-cases";

export function UseCaseWorkspace({
  activeTab,
  children,
}: {
  activeTab: string;
  children: ReactNode;
}) {
  return (
    <div className="workspace">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Use Case Workspace</p>
          <h2>Bed Pressure Intelligence</h2>
          <p>
            A self-contained module for occupancy pressure, breach forecasting, trend evidence,
            operational decisions, and one-click provenance.
          </p>
        </div>
        <div className="workspace-trust">
          <span className="status-dot live" />
          <span>Pipeline 8m ago</span>
          <span>6/6 sources</span>
          <span>42/42 tests</span>
        </div>
      </section>
      <TabNav items={bedPressureTabs} activeKey={activeTab} />
      {children}
    </div>
  );
}
