import type { Metadata } from "next";
import { UseCasesClient } from "@/app/use-cases/use-cases-client";

export const metadata: Metadata = {
  title: "Use Cases - OpenCare Portal",
};

export default function UseCasesPage() {
  return <UseCasesClient />;
}
