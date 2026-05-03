import type { Metadata } from "next";
import { TeamPerformance } from "@/components/rcm/views/TeamPerformance";

export const metadata: Metadata = {
  title: "Team Performance - OpenCare Portal",
};

export default function RevenueCycleTeamPerformancePage() {
  return <TeamPerformance />;
}
