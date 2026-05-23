const DEFAULT_API_BASE_URL = "http://backend:8000";

export function getApiBaseUrl() {
  return (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_API_BASE_URL
  );
}

export function getApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

export async function getApiJson<TData>({
  path,
  fallback,
  cacheMode = "revalidate",
  adminContext = false,
}: {
  path: string;
  fallback: TData;
  cacheMode?: "revalidate" | "no-store";
  adminContext?: boolean;
}): Promise<TData> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}${path}`,
      {
        ...(cacheMode === "no-store" ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
        headers: adminContext ? { "x-opencare-admin-context": "admin" } : undefined,
      },
    );

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as TData;
  } catch {
    return fallback;
  }
}
