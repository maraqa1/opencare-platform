import { NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const target = new URL(`${getApiBaseUrl()}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  try {
    const response = await fetch(target, {
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "application/json";
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Unable to reach backend proxy target.",
      },
      { status: 502 },
    );
  }
}
