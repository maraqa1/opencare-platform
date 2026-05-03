import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Runtime Status - OpenCare Portal",
};

export default function RuntimeStatusPage() {
  redirect("/admin/runtime");
}
