"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CacheEntry<T> = {
  data: T | null;
  error: string;
  promise: Promise<T | null> | null;
  listeners: Set<() => void>;
};

const sharedJsonCache = new Map<string, CacheEntry<unknown>>();

function getCacheEntry<T>(url: string): CacheEntry<T> {
  const existing = sharedJsonCache.get(url);
  if (existing) {
    return existing as CacheEntry<T>;
  }

  const created: CacheEntry<T> = {
    data: null,
    error: "",
    promise: null,
    listeners: new Set(),
  };
  sharedJsonCache.set(url, created as CacheEntry<unknown>);
  return created;
}

function notify(entry: CacheEntry<unknown>) {
  entry.listeners.forEach((listener) => listener());
}

async function fetchSharedJson<T>(url: string, fallbackData?: T): Promise<T | null> {
  const entry = getCacheEntry<T>(url);
  if (entry.promise) {
    return entry.promise;
  }

  entry.promise = (async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as T;
      entry.data = payload;
      entry.error = "";
      notify(entry as CacheEntry<unknown>);
      return payload;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : "Unable to reach backend.";
      if (entry.data === null && fallbackData !== undefined) {
        entry.data = fallbackData;
      }
      notify(entry as CacheEntry<unknown>);
      return entry.data;
    } finally {
      entry.promise = null;
    }
  })();

  return entry.promise;
}

export function useSharedJsonResource<T>(
  url: string,
  {
    fallbackData,
    initialData,
    refreshIntervalMs,
    enabled = true,
  }: {
    fallbackData?: T;
    initialData?: T;
    refreshIntervalMs?: number;
    enabled?: boolean;
  } = {},
) {
  const entry = getCacheEntry<T>(url);
  if (enabled && initialData !== undefined && entry.data === null) {
    entry.data = initialData;
    entry.error = "";
  }

  const [, setVersion] = useState(0);
  const refresh = useCallback(() => {
    if (!enabled) {
      return Promise.resolve(getCacheEntry<T>(url).data);
    }
    return fetchSharedJson<T>(url, fallbackData);
  }, [enabled, fallbackData, url]);

  useEffect(() => {
    const entry = getCacheEntry<T>(url);
    const listener = () => setVersion((value) => value + 1);
    entry.listeners.add(listener);

    if (enabled && entry.data === null && entry.promise === null) {
      void fetchSharedJson<T>(url, fallbackData);
    }

    return () => {
      entry.listeners.delete(listener);
    };
  }, [enabled, fallbackData, url]);

  useEffect(() => {
    if (!enabled || !refreshIntervalMs) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchSharedJson<T>(url, fallbackData);
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, fallbackData, refreshIntervalMs, url]);

  const data = useMemo(() => {
    if (entry.data !== null) {
      return entry.data;
    }
    return initialData ?? fallbackData ?? null;
  }, [entry.data, fallbackData, initialData]);

  return {
    data: data as T | null,
    error: entry.error,
    loading: enabled && entry.data === null && !entry.error,
    refetch: refresh,
  };
}
