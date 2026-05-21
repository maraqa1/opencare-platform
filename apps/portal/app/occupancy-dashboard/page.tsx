import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Occupancy Dashboard - OpenCare Portal",
};

export default function OccupancyDashboardPage() {
  redirect("/occupancy");
}
