import type { Metadata } from "next";
import { CashCommand } from "@/components/rcm/views/CashCommand";

export const metadata: Metadata = {
  title: "Cash Command - OpenCare Portal",
};

export default function RevenueCycleCashCommandPage() {
  return <CashCommand />;
}
