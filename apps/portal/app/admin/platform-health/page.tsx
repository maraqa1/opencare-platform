import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Platform Health - OpenCare Portal",
};

export default function PlatformHealthPage() {
  redirect("/admin/health");
}
