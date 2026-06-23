import { NextRequest } from "next/server";
import type { CashCommandPayload, RecoveryQueuePayload } from "@/components/rcm/types";
import { getApiUrl } from "@/lib/api";
import { buildRevenueCycleBoardPack } from "@/lib/rcm-board-pack";

export const dynamic = "force-dynamic";

async function fetchJson<T>(path: string) {
  try {
    const response = await fetch(getApiUrl(path), {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function describeScope(searchParams: URLSearchParams) {
  const labels: Record<string, string> = {
    period: "Period",
    payer: "Insurer",
    owner: "Owner",
    issue_type: "Issue",
    status: "Status",
    priority: "Priority",
    due_window: "Due window",
    min_value: "Minimum value",
    search: "Search",
    facility: "Facility",
    department: "Department",
    specialty: "Specialty",
    patient_type: "Patient type",
    claim_status: "Claim status",
    date_from: "From",
    date_to: "To",
  };

  const parts = Array.from(searchParams.entries())
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${labels[key] ?? key}: ${value}`);

  return parts.length > 0 ? parts.join(" | ") : "Default live scope";
}

export async function GET(request: NextRequest) {
  const queryString = request.nextUrl.searchParams.toString();
  const suffix = queryString ? `?${queryString}` : "";

  const [cash, queue] = await Promise.all([
    fetchJson<CashCommandPayload>(`/api/v1/revenue-cycle/cash-command${suffix}`),
    fetchJson<RecoveryQueuePayload>(`/api/v1/rcm/recovery-queue${suffix}`),
  ]);

  if (!cash || !queue) {
    return new Response("Unable to load the revenue cycle board pack data.", {
      status: 502,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  const html = buildRevenueCycleBoardPack({
    cash,
    queue,
    requestLabel: describeScope(request.nextUrl.searchParams),
  });

  const dateStamp = new Date().toISOString().slice(0, 10);

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="revenue-cycle-board-pack-${dateStamp}.html"`,
      "cache-control": "no-store",
    },
  });
}
