import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Data Refresh Status - OpenCare Portal",
};

export default function DataRefreshStatusPage() {
  redirect("/admin/ingestion");
}
