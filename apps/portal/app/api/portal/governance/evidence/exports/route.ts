import { NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const packId = form.get("pack_id");
  if (typeof packId !== "string" || packId.length === 0) {
    return NextResponse.json({ status: "error", message: "pack_id is required" }, { status: 400 });
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1/governance/evidence/exports`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      pack_id: packId,
      actor: "portal_user",
      role: "viewer",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  }

  return NextResponse.redirect(new URL("/governance/evidence", request.url), { status: 303 });
}
