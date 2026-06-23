import type { Metadata } from "next";
import { Leakage } from "@/components/rcm/views/Leakage";

export const metadata: Metadata = {
  title: "Revenue Loss - OpenCare Portal",
};

export default function RevenueCycleLeakagePage() {
  return <Leakage />;
}
