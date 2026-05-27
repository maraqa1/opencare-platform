import type { Metadata } from "next";

import { PageFrame } from "@/components/page-frame";

export const metadata: Metadata = {
  title: "Jazan Performance Admin - OpenCare Portal",
};

export default function JazanPerformanceAdminPage() {
  return (
    <PageFrame
      eyebrow="Jazan Performance"
      title="Jazan Performance Admin"
      description="No data loaded"
    >
      <section className="panel jazan-detail-panel">
        <h2>Jazan Performance Admin</h2>
        <p>No data loaded</p>
      </section>
    </PageFrame>
  );
}
