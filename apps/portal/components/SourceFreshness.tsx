"use client";

import { useEffect, useState } from "react";

type FreshnessItem = {
  id: string;
  source_name: string;
  table_name: string;
  last_loaded_at?: string | null;
  freshness_minutes?: number | null;
  warn_after_minutes?: number | null;
  error_after_minutes?: number | null;
  status: "fresh" | "stale" | "expired";
};

type SourceFreshnessProps = {
  sourceFilters?: string[];
};

function relativeTime(value?: string | null) {
  if (!value) {
    return "unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function matchesSource(item: FreshnessItem, filters: string[]) {
  const haystack = `${item.source_name}.${item.table_name}`.toLowerCase();
  return filters.some((filter) => haystack.includes(filter.toLowerCase()));
}

export function SourceFreshness({ sourceFilters = [] }: SourceFreshnessProps) {
  const [payload, setPayload] = useState<{ items?: FreshnessItem[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFreshness() {
      const response = await fetch("/api/portal/api/v1/lineage/freshness", { cache: "no-store" });
      const nextPayload = (await response.json()) as { items?: FreshnessItem[] };
      if (!cancelled) {
        setPayload(nextPayload);
      }
    }

    loadFreshness().catch(() => {
      if (!cancelled) {
        setPayload({ items: [] });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems =
    sourceFilters.length > 0
      ? (payload?.items ?? []).filter((item) => matchesSource(item, sourceFilters))
      : (payload?.items ?? []);

  return (
    <section className="governance-card">
      <div className="governance-card-header">
        <div>
          <p className="eyebrow">Freshness</p>
          <h3>Source Freshness</h3>
          <p className="section-subtitle">Operational SLAs with live elapsed-time tracking against the source landing zone.</p>
        </div>
      </div>
      <div className="freshness-stack">
        {filteredItems.map((item) => {
          const threshold = item.error_after_minutes ?? item.warn_after_minutes ?? 1;
          const usage = item.freshness_minutes ? Math.min(160, Math.round((item.freshness_minutes / threshold) * 100)) : 0;
          return (
            <article className={`freshness-row ${item.status}`} key={item.id}>
              <div className="freshness-copy">
                <strong>{item.source_name}.{item.table_name}</strong>
                <span className={`freshness-badge ${item.status}`}>{item.status.toUpperCase()}</span>
                <p title={item.last_loaded_at ?? ""}>loaded {relativeTime(item.last_loaded_at)}</p>
              </div>
              <div className="freshness-bar-shell">
                <div className="freshness-bar-track">
                  <span className="freshness-bar-fill" style={{ width: `${usage}%` }} />
                </div>
                <p className="subtle">
                  SLA: {Math.round((item.warn_after_minutes ?? threshold) / 60)} hours
                  {" | "}
                  {item.freshness_minutes ?? "n/a"} minutes elapsed
                </p>
              </div>
            </article>
          );
        })}
        {filteredItems.length === 0 ? <div className="empty-state">No use-case-specific freshness sources are connected for this governance view yet.</div> : null}
      </div>
    </section>
  );
}
