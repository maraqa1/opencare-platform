import { NextRequest, NextResponse } from "next/server";
import { backendRequest, safeBackendBody } from "@/lib/module01/customerAssessmentApi";

export async function POST(request: NextRequest) {
  const adminToken = request.headers.get("x-module01-admin-token");
  if (!adminToken || adminToken.length > 500) return NextResponse.json({ detail: "Advisor authorization required." }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2_100_000) return NextResponse.json({ detail: "Assessment is too large." }, { status: 413 });
  try {
    const response = await backendRequest("/api/v1/module01/admin/assessments", { method: "POST", headers: { "content-type": "application/json", "x-module01-admin-token": adminToken, "x-opencare-actor": "portal-advisor" }, body: raw });
    return NextResponse.json(safeBackendBody(await response.text()), { status: response.status });
  } catch { return NextResponse.json({ detail: "Customer assessment service is unavailable." }, { status: 502 }); }
}
