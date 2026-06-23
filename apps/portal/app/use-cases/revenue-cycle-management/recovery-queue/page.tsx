import type { Metadata } from "next";
import { RecoveryQueue } from "@/components/rcm/views/RecoveryQueue";

export const metadata: Metadata = {
  title: "Recovery Work Queue - Cash Recovery Board",
};

export default function RevenueCycleRecoveryQueuePage() {
  return <RecoveryQueue />;
}
