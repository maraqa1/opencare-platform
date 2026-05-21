import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "CFO Cash Command - OpenCare Portal",
};

export default function RevenueCycleCashCommandPage() {
  redirect("/use-cases/revenue-cycle-management/cash-command");
}
