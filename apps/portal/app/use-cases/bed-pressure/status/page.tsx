import { Suspense } from "react";
import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { RecordSpecification } from "@/components/RecordSpecification";
import { RecordSpecificationFallback } from "@/components/RecordSpecificationFallback";
import { UseCaseWorkspace } from "@/components/UseCaseWorkspace";
import { getApiJson } from "@/lib/api";
import { BedPressureStatusClient } from "./bed-pressure-status-client";

export const metadata: Metadata = {
  title: "Bed Pressure Status - OpenCare Portal",
};

export default async function BedPressureStatusPage() {
  const occupancy = await getApiJson<{
    summary?: { critical: number; warning: number; normal: number };
    items?: Array<{
      ward_id: string;
      ward_code?: string;
      ward_name: string;
      occupancy_rate: number;
      occupied_beds: number;
      staffed_beds: number;
      avg_7d_occupancy: number;
      admissions_today: number;
      discharges_today: number;
      status: "critical" | "warning" | "normal";
    }>;
  }>({
    path: "/api/v1/occupancy/current",
    fallback: { summary: { critical: 0, warning: 0, normal: 0 }, items: [] },
    cacheMode: "no-store",
  });
  const runtime = await getApiJson<{
    runtimes?: Array<{
      name?: string;
      last_run?: string | null;
    }>;
  }>({
    path: "/api/v1/admin/runtime-status",
    fallback: { runtimes: [] },
    cacheMode: "no-store",
  });
  const anomalySummary = await getApiJson<{
    generated_at?: string | null;
    summary?: { critical: number; warning: number; info: number };
    total?: number;
  }>({
    path: "/api/v1/anomalies/summary",
    fallback: { summary: { critical: 0, warning: 0, info: 0 }, total: 0 },
    cacheMode: "no-store",
  });
  const criticalAnomalies = await getApiJson<{
    generated_at?: string | null;
    items?: Array<{
      ward_id: string;
      department_name?: string;
      event_date: string;
      anomaly_type: string;
      severity: "critical" | "warning" | "info";
      occupancy_rate: number | null;
      z_score: number | null;
      threshold_breached: string;
      message?: string;
    }>;
  }>({
    path: "/api/v1/anomalies?severity=critical",
    fallback: { items: [] },
    cacheMode: "no-store",
  });

  return (
    <PageFrame
      eyebrow="Operational Landing Page"
      title="Current Status"
      description="The bed manager command console: worst-first pressure, active alerts, and lightweight trust cues on every number."
    >
      <UseCaseWorkspace activeTab="status">
        <BedPressureStatusClient
          initialOccupancy={occupancy}
          initialRuntime={runtime}
          initialSummary={anomalySummary}
          initialAnomalies={criticalAnomalies}
        />
        <Suspense fallback={<RecordSpecificationFallback label="Record specification" />}>
          <RecordSpecification table="analytics.fct_bed_occupancy" />
        </Suspense>
      </UseCaseWorkspace>
    </PageFrame>
  );
}
