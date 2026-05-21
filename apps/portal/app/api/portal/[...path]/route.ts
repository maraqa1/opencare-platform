import { NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const target = new URL(`${getApiBaseUrl()}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  try {
    const method = request.method;
    const requestBody = method === "GET" || method === "HEAD" ? undefined : await request.text();
    const response = await fetch(target, {
      method,
      body: requestBody,
      cache: "no-store",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
      },
    });
    const contentType = response.headers.get("content-type") ?? "application/json";
    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "content-type": contentType,
        ...(response.headers.get("content-disposition")
          ? { "content-disposition": response.headers.get("content-disposition") as string }
          : {}),
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
