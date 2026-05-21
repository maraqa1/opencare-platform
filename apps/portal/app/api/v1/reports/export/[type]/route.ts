import { getApiUrl } from "@/lib/api";

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const params = await context.params;
  const response = await fetch(getApiUrl(`/api/v1/reports/export/${params.type}`), {
    cache: "no-store",
    headers: {
      accept: "text/csv",
    },
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/csv",
      "content-disposition":
        response.headers.get("content-disposition") ?? `attachment; filename="${params.type}.csv"`,
    },
  });
}
