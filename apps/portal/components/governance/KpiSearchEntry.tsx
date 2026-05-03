"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { GovernanceKpi } from "@/lib/governance-registry";
import { TrustBadge } from "@/components/governance/TrustBadge";

export function KpiSearchEntry({ kpis }: { kpis: GovernanceKpi[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) {
      return kpis;
    }
    const normalized = query.toLowerCase();
    return kpis.filter((kpi) =>
      `${kpi.label} ${kpi.description} ${kpi.useCaseName}`.toLowerCase().includes(normalized),
    );
  }, [kpis, query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, GovernanceKpi[]>>((acc, kpi) => {
      acc[kpi.useCaseName] ??= [];
      acc[kpi.useCaseName].push(kpi);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div className="kpi-search-shell">
      <section className="panel governance-entry-panel">
        <p className="eyebrow">KPI search</p>
        <h3 className="section-heading">Select a number to trace</h3>
        <p className="section-subtitle">
          Start from one KPI and follow its trust journey from source system to operational decision.
        </p>
        <label className="governance-search-shell">
          <span className="subtle">Search KPI or use case</span>
          <input
            className="governance-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pressure, occupancy, cash command, risk..."
          />
        </label>
      </section>

      <section className="governance-entry-grid">
        <article className="panel governance-entry-card">
          <p className="eyebrow">Suggested KPIs</p>
          <div className="governance-kpi-list">
            {Object.entries(grouped).map(([useCaseName, items]) => (
              <div className="governance-kpi-group" key={useCaseName}>
                <h4>{useCaseName}</h4>
                <div className="governance-kpi-stack">
                  {items.map((kpi) => (
                    <Link className="governance-kpi-row" href={`/governance/kpi/${kpi.slug}`} key={kpi.slug}>
                      <div>
                        <strong>{kpi.label}</strong>
                        <p>{kpi.description}</p>
                      </div>
                      <TrustBadge state={kpi.trustState} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="subtle">No KPI matches your search.</p>
            ) : null}
          </div>
        </article>

        <article className="panel governance-entry-card">
          <p className="eyebrow">Recently viewed</p>
          <h3 className="section-heading">Not yet instrumented</h3>
          <p className="section-subtitle">
            Recent KPI history is not yet instrumented. Suggested KPIs are shown from the curated governance registry.
          </p>
        </article>
      </section>
    </div>
  );
}
