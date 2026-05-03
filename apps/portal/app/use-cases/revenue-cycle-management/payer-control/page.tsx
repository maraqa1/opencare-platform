import type { Metadata } from "next";
import { PayerControl } from "@/components/rcm/views/PayerControl";

export const metadata: Metadata = {
  title: "Payer Control - OpenCare Portal",
};

export default function RevenueCyclePayerControlPage() {
  return <PayerControl />;
}
