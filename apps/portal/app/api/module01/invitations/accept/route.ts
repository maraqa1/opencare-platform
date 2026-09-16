import { NextRequest, NextResponse } from "next/server";
import { backendRequest, customerAssessmentCookie, safeBackendBody } from "@/lib/module01/customerAssessmentApi";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 1000) return NextResponse.json({ detail: "Invalid invitation." }, { status: 400 });
  try {
    const response = await backendRequest("/api/v1/module01/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: raw });
    const body = safeBackendBody(await response.text());
    if (!response.ok) return NextResponse.json(body, { status: response.status });
    const result = NextResponse.json({ assessmentId: body.assessmentId, expiresAt: body.expiresAt });
    result.cookies.set(customerAssessmentCookie, String(body.sessionToken), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/module01", maxAge: 30 * 24 * 60 * 60 });
    return result;
  } catch { return NextResponse.json({ detail: "Customer assessment service is unavailable." }, { status: 502 }); }
}
