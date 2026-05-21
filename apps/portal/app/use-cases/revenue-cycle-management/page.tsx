import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Revenue Cycle Management - OpenCare Portal",
};

export default function RevenueCycleWorkspaceIndex() {
  redirect("/use-cases/revenue-cycle-management/cash-command");
}
