import type { Metadata } from "next";
import { RecoveryQueue } from "@/components/rcm/views/RecoveryQueue";

export const metadata: Metadata = {
  title: "Recovery Queue - OpenCare Portal",
};

export default function RevenueCycleRecoveryQueuePage() {
  return <RecoveryQueue />;
}
