import type { Metadata } from "next";
import { ExecutiveNarrative } from "@/components/rcm/views/ExecutiveNarrative";

export const metadata: Metadata = {
  title: "Executive Summary - OpenCare Portal",
};

export default function RevenueCycleExecutiveNarrativePage() {
  return <ExecutiveNarrative />;
}
