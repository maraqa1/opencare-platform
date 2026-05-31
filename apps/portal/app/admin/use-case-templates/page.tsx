import type { Metadata } from "next";

import { UseCaseTemplatesClient } from "@/app/admin/use-case-templates/use-case-templates-client";

export const metadata: Metadata = {
  title: "Use Case Templates - OpenCare Portal",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function UseCaseTemplatesPage() {
  return <UseCaseTemplatesClient />;
}
