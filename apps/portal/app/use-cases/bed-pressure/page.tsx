import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Bed Pressure Workspace - OpenCare Portal",
};

export default function BedPressureWorkspaceIndex() {
  redirect("/use-cases/bed-pressure/status");
}
