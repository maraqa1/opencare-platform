"use client";

import { TabNav } from "@/components/TabNav";
import { revenueCycleTabs } from "@/lib/use-cases";

export function RCMNavTabs({ active }: { active: string }) {
  return <TabNav items={revenueCycleTabs} activeKey={active} />;
}
