"use client";

import { useMemo } from "react";
import { useSharedJsonResource } from "@/lib/useSharedJsonResource";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  stale: boolean;
  refetch: () => void;
};

type UseRCMFetchOptions<T> = {
  initialData?: T;
};

const ENDPOINT_MAP: Record<string, string> = {
  "cash-command":        "/api/portal/api/v1/revenue-cycle/cash-command",
  "recovery-queue":      "/api/portal/api/v1/revenue-cycle/recovery-queue",
  "payer-control":       "/api/portal/api/v1/revenue-cycle/payer-control",
  "revenue-leakage":     "/api/portal/api/v1/revenue-cycle/leakage",
  "team-performance":    "/api/portal/api/v1/revenue-cycle/team-performance",
  "executive-narrative": "/api/portal/api/v1/revenue-cycle/executive-narrative",
};

export function useRCMFetch<T>(
  view: string,
  params?: Record<string, string>,
  options: UseRCMFetchOptions<T> = {},
): FetchState<T> {
  const base = ENDPOINT_MAP[view];
  const url = useMemo(() => {
    if (!base) {
      return "";
    }
    return params && Object.keys(params).length > 0
      ? `${base}?${new URLSearchParams(params).toString()}`
      : base;
  }, [base, params]);
  const { data, loading, error, refetch } = useSharedJsonResource<T & { meta?: { freshness?: string } }>(url, {
    enabled: Boolean(base),
    initialData: options.initialData as (T & { meta?: { freshness?: string } }) | undefined,
  });
  const stale = data?.meta?.freshness === "stale";

  return { data: data as T | null, loading, error, stale, refetch };
}
