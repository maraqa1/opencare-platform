import { NextRequest, NextResponse } from "next/server";
import { backendRequest, customerAssessmentCookie, safeBackendBody } from "@/lib/module01/customerAssessmentApi";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ detail: "Assessment not found." }, { status: 404 });
  const token = request.cookies.get(customerAssessmentCookie)?.value;
  if (!token) return NextResponse.json({ detail: "Assessment session required." }, { status: 401 });
  try {
    const response = await backendRequest(`/api/v1/module01/assessments/${id}/submit`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: await request.text() });
    return NextResponse.json(safeBackendBody(await response.text()), { status: response.status });
  } catch { return NextResponse.json({ detail: "Customer assessment service is unavailable." }, { status: 502 }); }
}
