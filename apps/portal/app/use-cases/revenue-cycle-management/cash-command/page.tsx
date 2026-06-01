import type { Metadata } from "next";
import { CashCommand } from "@/components/rcm/views/CashCommand";
import { getApiJson } from "@/lib/api";
import type { CashCommandPayload } from "@/components/rcm/types";

export const metadata: Metadata = {
  title: "Cash Command - OpenCare Portal",
};

export default async function RevenueCycleCashCommandPage() {
  const initialData = await getApiJson<CashCommandPayload>({
    path: "/api/v1/revenue-cycle/cash-command",
    fallback: {},
    cacheMode: "no-store",
  });

  return <CashCommand initialData={initialData} />;
}
