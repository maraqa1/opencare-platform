import { NextRequest, NextResponse } from "next/server";
import { backendRequest, safeBackendBody } from "@/lib/module01/customerAssessmentApi";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ detail: "Assessment not found." }, { status: 404 });
  const adminToken = request.headers.get("x-module01-admin-token");
  if (!adminToken || adminToken.length > 500) return NextResponse.json({ detail: "Advisor authorization required." }, { status: 403 });
  try {
    const response = await backendRequest(`/api/v1/module01/admin/assessments/${id}/invitations`, { method: "POST", headers: { "content-type": "application/json", "x-module01-admin-token": adminToken, "x-opencare-actor": "portal-advisor" }, body: await request.text() });
    return NextResponse.json(safeBackendBody(await response.text()), { status: response.status });
  } catch { return NextResponse.json({ detail: "Customer assessment service is unavailable." }, { status: 502 }); }
}
