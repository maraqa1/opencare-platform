import type { Metadata } from "next";

import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Municipal & Project Early Warning - OpenCare Portal",
};

export default function JazanEarlyWarningPage() {
  return (
    <PageFrame
      eyebrow="Jazan Performance"
      title="Municipal & Project Early Warning"
      description="No data loaded"
    >
      <section className="panel jazan-detail-panel">
        <h2>Municipal & Project Early Warning</h2>
        <p>No data loaded</p>
      </section>
    </PageFrame>
  );
}
