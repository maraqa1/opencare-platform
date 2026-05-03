import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dictionary Management - OpenCare Portal",
};

export default function DictionaryManagementPage() {
  redirect("/dictionary");
}
