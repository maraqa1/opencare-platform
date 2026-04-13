const DEFAULT_API_BASE_URL = "http://backend:8000";

function getApiBaseUrl() {
  return (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_API_BASE_URL
  );
}

export async function getApiJson<TData>({
  path,
  fallback,
}: {
  path: string;
  fallback: TData;
}): Promise<TData> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as TData;
  } catch {
    return fallback;
  }
}
