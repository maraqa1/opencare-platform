import type { Metadata } from "next";
import { DecisionQueue } from "@/components/rcm/views/DecisionQueue";

export const metadata: Metadata = {
  title: "Decision Review Queue - Governed Recovery Interventions",
};

export default function RevenueCycleDecisionQueuePage() {
  return <DecisionQueue />;
}
