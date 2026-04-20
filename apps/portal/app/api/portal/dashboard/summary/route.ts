import { NextResponse } from "next/server";

import { getApiUrl } from "@/lib/api";

type OccupancyPayload = {
  summary?: { critical?: number; warning?: number; normal?: number };
  items?: Array<{ occupancy_rate?: number }>;
};

type RuntimePayload = {
  runtimes?: Array<{
    name?: string;
    last_run?: string | null;
  }>;
};

function diffInMinutes(iso: string | null | undefined) {
  if (!iso) {
    return null;
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((Date.now() - parsed.getTime()) / 60000));
}

export async function GET() {
  try {
    const [occupancyResponse, runtimeResponse] = await Promise.all([
      fetch(getApiUrl("/api/v1/occupancy/current"), { cache: "no-store" }),
      fetch(getApiUrl("/api/v1/admin/runtime-status"), { cache: "no-store" }),
    ]);

    if (!occupancyResponse.ok || !runtimeResponse.ok) {
      throw new Error("Dashboard summary source request failed");
    }

    const occupancy = (await occupancyResponse.json()) as OccupancyPayload;
    const runtime = (await runtimeResponse.json()) as RuntimePayload;
    const forecastRuntime = (runtime.runtimes ?? []).find((item) => item.name === "forecast");
    const lastRefreshMinutes = diffInMinutes(forecastRuntime?.last_run);
    const avgOccupancy =
      (occupancy.items ?? []).length > 0
        ? (occupancy.items ?? []).reduce((total, item) => total + (item.occupancy_rate ?? 0), 0) /
          (occupancy.items ?? []).length
        : 0;

    let pipelineStatus: "live" | "stale" | "error" = "error";
    if (lastRefreshMinutes !== null && lastRefreshMinutes <= 75) {
      pipelineStatus = "live";
    } else if (lastRefreshMinutes !== null) {
      pipelineStatus = "stale";
    }

    return NextResponse.json({
      critical_wards: occupancy.summary?.critical ?? 0,
      warning_wards: occupancy.summary?.warning ?? 0,
      normal_wards: occupancy.summary?.normal ?? 0,
      avg_occupancy: avgOccupancy,
      pipeline_status: pipelineStatus,
      last_refresh_minutes: lastRefreshMinutes,
      next_refresh_minutes:
        lastRefreshMinutes === null ? null : Math.max(0, 60 - (lastRefreshMinutes % 60)),
      last_run: forecastRuntime?.last_run ?? null,
    });
  } catch {
    return NextResponse.json(
      {
        critical_wards: 0,
        warning_wards: 0,
        normal_wards: 0,
        avg_occupancy: 0,
        pipeline_status: "error",
        last_refresh_minutes: null,
        next_refresh_minutes: null,
        last_run: null,
      },
      { status: 200 },
    );
  }
}
