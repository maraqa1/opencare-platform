"use client";

import { useCallback, useEffect, useState } from "react";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  stale: boolean;
  refetch: () => void;
};

const ENDPOINT_MAP: Record<string, string> = {
  "cash-command":        "/api/portal/api/v1/revenue-cycle/cash-command",
  "journey":             "/api/portal/api/v1/revenue-cycle/journey",
  "recovery-queue":      "/api/portal/api/v1/revenue-cycle/recovery-queue",
  "payer-control":       "/api/portal/api/v1/revenue-cycle/payer-control",
  "revenue-leakage":     "/api/portal/api/v1/revenue-cycle/leakage",
  "team-performance":    "/api/portal/api/v1/revenue-cycle/team-performance",
  "executive-narrative": "/api/portal/api/v1/revenue-cycle/executive-narrative",
};

export function useRCMFetch<T>(view: string, params?: Record<string, string>): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const base = ENDPOINT_MAP[view];
    if (!base) return;

    const url = params && Object.keys(params).length > 0
      ? `${base}?${new URLSearchParams(params).toString()}`
      : base;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as T & {
          meta?: { freshness?: string };
          data_freshness?: { status?: string | null };
        };
        if (!cancelled) {
          setData(payload);
          setStale(
            payload.meta?.freshness === "stale"
            || payload.data_freshness?.status === "stale"
            || payload.data_freshness?.status === "delayed"
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to reach backend.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tick, JSON.stringify(params)]);

  return { data, loading, error, stale, refetch };
}
