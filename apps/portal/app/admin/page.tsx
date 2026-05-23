import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/page-frame";

const adminSections = [
  {
    href: "/admin/operations",
    title: "Operations",
    description: "Service health, pipeline schedule, runtime status, ingestion status, and quality summary.",
  },
  {
    href: "/admin/governance",
    title: "Governance",
    description: "Dictionary, lineage DAG, record specs, freshness, impact analysis, tests, contracts, compliance, and audit summary.",
  },
  {
    href: "/admin/configuration",
    title: "Configuration",
    description: "Use case enablement, thresholds, alert rules, schedules, and current YAML-driven settings.",
  },
  {
    href: "/admin/audit",
    title: "Audit",
    description: "Access logs, data access trail, configuration changes, and exportable audit history.",
  },
  {
    href: "/admin/use-case-templates",
    title: "Use Case Templates",
    description: "Upload, validate, preview, install, include, exclude, and uninstall packaged OpenCare use cases.",
  },
];

export const metadata: Metadata = {
  title: "Administration - OpenCare Portal",
};

export default function AdminPage() {
  return (
    <PageFrame
      eyebrow="Administration"
      title="Operations, governance, configuration, and audit"
      description="Deep governance is available to platform admins and auditors without competing with operational bed-manager workflows."
      chips={[
        { label: "Admin separated from operations", tone: "primary" },
        { label: "Full 4b preservation", tone: "accent" },
      ]}
    >
      <section className="operations-grid">
        {adminSections.map((section) => (
          <Link href={section.href} className="status-card" key={section.href}>
            <p className="eyebrow">Administration</p>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <span className="inline-link">Open {section.title}</span>
          </Link>
        ))}
      </section>
    </PageFrame>
  );
}
