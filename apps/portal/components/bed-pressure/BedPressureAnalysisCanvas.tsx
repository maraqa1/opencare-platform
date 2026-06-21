"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { integer, percent, shortDate, timestamp } from "@/lib/format";

type OccupancyItem = {
  ward_id: string;
  ward_code?: string;
  ward_name: string;
  snapshot_date?: string;
  occupied_beds: number;
  staffed_beds: number;
  occupancy_rate: number;
  avg_7d_occupancy: number;
  admissions_today: number;
  discharges_today: number;
  status: "critical" | "warning" | "normal";
};

type CurrentPayload = {
  snapshot_date?: string | null;
  summary?: { critical: number; warning: number; normal: number };
  items?: OccupancyItem[];
};

type HistoricalItem = {
  date_day: string;
  ward_id: string;
  ward_code?: string;
  ward_name: string;
  occupied_beds: number;
  staffed_beds: number;
  occupancy_rate: number;
};

type HistoricalPayload = {
  items?: HistoricalItem[];
};

type AnomalyPayload = {
  generated_at?: string | null;
  total?: number;
  summary?: { critical: number; warning: number; info: number };
};

type AnalysisPayload = {
  current: CurrentPayload;
  historical: HistoricalPayload;
  anomalies: AnomalyPayload;
};

type PressureMixDatum = {
  label: string;
  value: number;
  tone: "critical" | "warning" | "normal";
  fill: string;
};

type TrendDatum = {
  date: string;
  label: string;
  averageOccupancy: number;
  peakOccupancy: number;
  criticalWards: number;
};

type WardComparisonDatum = {
  ward: string;
  current: number;
  baseline: number;
  tone: OccupancyItem["status"];
};

type FlowDatum = {
  ward: string;
  admissions: number;
  discharges: number;
  netFlow: number;
};

const PRESSURE_COLOURS = {
  critical: "var(--oc-critical)",
  warning: "var(--oc-warning)",
  normal: "var(--oc-normal)",
} as const;

const tooltipStyle = {
  borderRadius: 16,
  border: "1px solid rgba(31, 56, 100, 0.08)",
  boxShadow: "0 18px 40px rgba(31, 56, 100, 0.12)",
  fontFamily: "var(--font-body)",
  background: "rgba(255, 255, 255, 0.98)",
};

function formatSigned(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) {
    return "n/a";
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}%`;
}

function shortWardLabel(item: { ward_code?: string; ward_name: string }) {
  return item.ward_code ?? item.ward_name;
}

function averagePercent(items: OccupancyItem[]) {
  const occupied = items.reduce((sum, item) => sum + item.occupied_beds, 0);
  const staffed = items.reduce((sum, item) => sum + item.staffed_beds, 0);
  return staffed > 0 ? (occupied / staffed) * 100 : 0;
}

function buildTrendSeries(items: HistoricalItem[]) {
  const byDate = new Map<string, { occupied: number; staffed: number; peak: number; critical: number }>();

  for (const item of items) {
    const bucket = byDate.get(item.date_day) ?? { occupied: 0, staffed: 0, peak: 0, critical: 0 };
    bucket.occupied += item.occupied_beds;
    bucket.staffed += item.staffed_beds;
    bucket.peak = Math.max(bucket.peak, item.occupancy_rate ?? 0);
    if ((item.occupancy_rate ?? 0) >= 90) {
      bucket.critical += 1;
    }
    byDate.set(item.date_day, bucket);
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({
      date,
      label: shortDate(date),
      averageOccupancy: bucket.staffed > 0 ? (bucket.occupied / bucket.staffed) * 100 : 0,
      peakOccupancy: bucket.peak,
      criticalWards: bucket.critical,
    }));
}

function AnalysisSkeleton() {
  return (
    <section className="bed-analysis-shell" aria-label="Loading bed pressure analysis">
      <section className="panel bed-analysis-hero">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line medium" style={{ marginTop: 12 }} />
          <span className="skeleton-line medium" style={{ width: "92%", marginTop: 12 }} />
        </div>
      </section>
      <section className="bed-analysis-kpi-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="bed-analysis-kpi-card" key={index}>
            <span className="skeleton-line short" />
            <span className="skeleton-line tall" style={{ marginTop: 18 }} />
            <span className="skeleton-line medium" style={{ marginTop: 16 }} />
          </article>
        ))}
      </section>
    </section>
  );
}

export function BedPressureAnalysisCanvas() {
  const [payload, setPayload] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalysis() {
      const [currentResponse, historicalResponse, anomalyResponse] = await Promise.all([
        fetch("/api/portal/api/v1/occupancy/current", { cache: "no-store" }),
        fetch("/api/portal/api/v1/occupancy/historical?days=30", { cache: "no-store" }),
        fetch("/api/portal/api/v1/anomalies/summary", { cache: "no-store" }),
      ]);

      if (!currentResponse.ok || !historicalResponse.ok || !anomalyResponse.ok) {
        throw new Error(`HTTP ${currentResponse.status}/${historicalResponse.status}/${anomalyResponse.status}`);
      }

      const [current, historical, anomalies] = await Promise.all([
        currentResponse.json(),
        historicalResponse.json(),
        anomalyResponse.json(),
      ]);

      if (!cancelled) {
        setPayload({
          current: current as CurrentPayload,
          historical: historical as HistoricalPayload,
          anomalies: anomalies as AnomalyPayload,
        });
        setError("");
      }
    }

    loadAnalysis().catch((loadError) => {
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load analysis.");
      }
    });

    const intervalId = window.setInterval(() => {
      loadAnalysis().catch(() => undefined);
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const currentItems = useMemo(() => payload?.current.items ?? [], [payload]);
  const historicalItems = useMemo(() => payload?.historical.items ?? [], [payload]);

  const trendSeries = useMemo<TrendDatum[]>(() => buildTrendSeries(historicalItems), [historicalItems]);

  const pressureMix = useMemo<PressureMixDatum[]>(() => {
    const critical = currentItems.filter((item) => item.status === "critical").length;
    const warning = currentItems.filter((item) => item.status === "warning").length;
    const normal = currentItems.filter((item) => item.status === "normal").length;

    return [
      { label: "Critical", value: critical, tone: "critical", fill: PRESSURE_COLOURS.critical },
      { label: "Warning", value: warning, tone: "warning", fill: PRESSURE_COLOURS.warning },
      { label: "Normal", value: normal, tone: "normal", fill: PRESSURE_COLOURS.normal },
    ];
  }, [currentItems]);

  const comparisonRows = useMemo<WardComparisonDatum[]>(() => {
    return [...currentItems]
      .sort((left, right) => right.occupancy_rate - left.occupancy_rate)
      .slice(0, 6)
      .map((item) => ({
        ward: shortWardLabel(item),
        current: item.occupancy_rate,
        baseline: item.avg_7d_occupancy ?? item.occupancy_rate,
        tone: item.status,
      }));
  }, [currentItems]);

  const flowRows = useMemo<FlowDatum[]>(() => {
    return [...currentItems]
      .sort(
        (left, right) =>
          right.admissions_today +
          right.discharges_today -
          (left.admissions_today + left.discharges_today),
      )
      .slice(0, 6)
      .map((item) => ({
        ward: shortWardLabel(item),
        admissions: item.admissions_today,
        discharges: item.discharges_today,
        netFlow: item.admissions_today - item.discharges_today,
      }));
  }, [currentItems]);

  const highestPressureWard = comparisonRows[0];
  const largestDeltaWard = useMemo(() => {
    return [...currentItems]
      .sort(
        (left, right) =>
          right.occupancy_rate -
          (right.avg_7d_occupancy ?? right.occupancy_rate) -
          (left.occupancy_rate - (left.avg_7d_occupancy ?? left.occupancy_rate)),
      )[0];
  }, [currentItems]);

  const totalWards = currentItems.length;
  const networkOccupancy = averagePercent(currentItems);
  const occupiedBeds = currentItems.reduce((sum, item) => sum + item.occupied_beds, 0);
  const staffedBeds = currentItems.reduce((sum, item) => sum + item.staffed_beds, 0);
  const flowBalance = currentItems.reduce(
    (sum, item) => sum + item.admissions_today - item.discharges_today,
    0,
  );
  const rollingAverage =
    trendSeries.length > 0
      ? trendSeries.reduce((sum, item) => sum + item.averageOccupancy, 0) / trendSeries.length
      : null;
  const currentDelta = rollingAverage == null ? null : networkOccupancy - rollingAverage;
  const peakOccupancy =
    trendSeries.length > 0 ? Math.max(...trendSeries.map((item) => item.peakOccupancy)) : 0;

  if (!payload && !error) {
    return <AnalysisSkeleton />;
  }

  if (error) {
    return (
      <section className="panel empty-state-panel">
        <p className="eyebrow">Executive Evidence Canvas</p>
        <h3 className="section-heading">Unable to load board-facing analysis</h3>
        <p className="section-subtitle mono">{error}</p>
      </section>
    );
  }

  if (!payload || currentItems.length === 0) {
    return (
      <section className="panel empty-state-panel">
        <p className="eyebrow">Executive Evidence Canvas</p>
        <h3 className="section-heading">No occupancy evidence is available yet</h3>
        <p className="section-subtitle">
          The analysis layer will populate as soon as the governed occupancy mart and anomaly
          runtime are refreshed.
        </p>
      </section>
    );
  }

  const snapshotLabel = payload.current.snapshot_date ? shortDate(payload.current.snapshot_date) : "Pending";
  const anomalyTimestamp = payload.anomalies.generated_at ? timestamp(payload.anomalies.generated_at) : "Pending";

  return (
    <section className="bed-analysis-shell">
      <section className="panel bed-analysis-hero">
        <div className="bed-analysis-hero-copy">
          <p className="eyebrow">Executive Evidence Canvas</p>
          <h3>Board-ready occupancy intelligence before the full Superset board</h3>
          <p className="section-subtitle">
            Start with pressure mix, network trend, flow pressure, and ward comparison. Then drill
            into the embedded analytics dashboard for the governed source view.
          </p>
        </div>
        <div className="bed-analysis-hero-side">
          <div className="filter-row">
            <span className="filter-chip active">All wards</span>
            <span className="filter-chip active">Last 30 days</span>
            <span className="filter-chip active">Board evidence</span>
          </div>
          <div className="bed-analysis-hero-meta">
            <span className="data-pill">{`Snapshot ${snapshotLabel}`}</span>
            <span className="data-pill">{`Anomalies ${anomalyTimestamp}`}</span>
          </div>
        </div>
      </section>

      <section className="bed-analysis-kpi-grid">
        <article className="bed-analysis-kpi-card tone-blue">
          <p className="eyebrow">Network Occupancy</p>
          <strong>{percent(networkOccupancy)}</strong>
          <p>{`30-day baseline ${percent(rollingAverage)} | ${formatSigned(currentDelta)} vs baseline`}</p>
        </article>
        <article className="bed-analysis-kpi-card tone-critical">
          <p className="eyebrow">Critical Wards</p>
          <strong>{integer(pressureMix[0]?.value ?? 0)}</strong>
          <p>{`${totalWards > 0 ? Math.round(((pressureMix[0]?.value ?? 0) / totalWards) * 100) : 0}% of the hospital footprint above 90%`}</p>
        </article>
        <article className="bed-analysis-kpi-card tone-teal">
          <p className="eyebrow">Beds Occupied</p>
          <strong>{`${integer(occupiedBeds)} / ${integer(staffedBeds)}`}</strong>
          <p>{`Peak occupancy in the last 30 days reached ${percent(peakOccupancy)}`}</p>
        </article>
        <article className="bed-analysis-kpi-card tone-amber">
          <p className="eyebrow">Net Flow Today</p>
          <strong>{flowBalance >= 0 ? `+${integer(flowBalance)}` : integer(flowBalance)}</strong>
          <p>{`${payload.anomalies.total ?? 0} active anomaly signals require operational review`}</p>
        </article>
      </section>

      <section className="bed-analysis-grid">
        <article className="panel bed-analysis-chart-card span-4">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Pressure Mix</p>
              <h3>Current ward severity split</h3>
            </div>
          </div>
          <div className="bed-analysis-donut-shell">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pressureMix}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={78}
                  outerRadius={114}
                  paddingAngle={4}
                  stroke="none"
                >
                  {pressureMix.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} wards`, name]} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="bed-analysis-donut-center">
              <strong>{integer(totalWards)}</strong>
              <span>wards live</span>
            </div>
          </div>
          <div className="bed-analysis-legend">
            {pressureMix.map((entry) => (
              <div className="bed-analysis-legend-row" key={entry.label}>
                <span className={`bed-analysis-legend-dot ${entry.tone}`} />
                <strong>{entry.label}</strong>
                <span>{`${entry.value} wards`}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel bed-analysis-chart-card span-8">
          <div className="panel-header">
            <div>
              <p className="eyebrow">30-Day Trend</p>
              <h3>Network occupancy and peak ward pressure</h3>
            </div>
          </div>
          <div className="chart-stage">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trendSeries} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bed-analysis-occupancy-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(46, 117, 182, 0.34)" />
                    <stop offset="100%" stopColor="rgba(46, 117, 182, 0.04)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "averageOccupancy") {
                      return [`${value.toFixed(1)}%`, "Network average"];
                    }
                    return [`${value.toFixed(1)}%`, "Peak ward"];
                  }}
                  labelFormatter={(label: string) => label}
                  contentStyle={tooltipStyle}
                />
                <ReferenceLine y={75} stroke="rgba(230, 81, 0, 0.8)" strokeDasharray="5 5" />
                <ReferenceLine y={90} stroke="rgba(183, 28, 28, 0.8)" strokeDasharray="5 5" />
                <Area
                  type="monotone"
                  dataKey="averageOccupancy"
                  stroke="var(--oc-blue)"
                  strokeWidth={3}
                  fill="url(#bed-analysis-occupancy-fill)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="peakOccupancy"
                  stroke="var(--oc-critical)"
                  strokeWidth={2.5}
                  fill="rgba(183, 28, 28, 0.03)"
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel bed-analysis-chart-card span-6">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ward Comparison</p>
              <h3>Highest-pressure wards vs seven-day baseline</h3>
            </div>
          </div>
          <div className="chart-stage">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={comparisonRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                <XAxis dataKey="ward" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name === "current" ? "Current occupancy" : "7-day baseline",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="baseline" fill="rgba(31, 56, 100, 0.2)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="current" radius={[8, 8, 0, 0]}>
                  {comparisonRows.map((entry) => (
                    <Cell key={entry.ward} fill={PRESSURE_COLOURS[entry.tone]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel bed-analysis-chart-card span-6">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Flow Pressure</p>
              <h3>Admissions versus discharges today</h3>
            </div>
          </div>
          <div className="chart-stage">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={flowRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                <XAxis dataKey="ward" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    integer(value),
                    name === "admissions" ? "Admissions" : "Discharges",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="admissions" fill="var(--oc-chart-1)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="discharges" fill="var(--oc-chart-8)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel bed-analysis-insight-card span-12">
          <div className="bed-analysis-insight-head">
            <div>
              <p className="eyebrow">Priority Readout</p>
              <h3>What the board should notice first</h3>
            </div>
            <div className="button-row">
              <Link className="secondary-link" href="/use-cases/bed-pressure/status">
                Open Current Status
              </Link>
              <Link className="secondary-link" href="/use-cases/bed-pressure/predictions">
                Open Predictions
              </Link>
              <a className="button primary" href="/api/v1/reports/export/forecast">
                Export Forecast CSV
              </a>
            </div>
          </div>
          <div className="bed-analysis-insight-grid">
            <article className="bed-analysis-insight-tile tone-critical">
              <span className="eyebrow">Highest Pressure</span>
              <strong>{highestPressureWard?.ward ?? "n/a"}</strong>
              <p>{`Current occupancy ${percent(highestPressureWard?.current)} against a ${percent(highestPressureWard?.baseline)} seven-day baseline.`}</p>
            </article>
            <article className="bed-analysis-insight-tile tone-amber">
              <span className="eyebrow">Largest Surge</span>
              <strong>{largestDeltaWard ? shortWardLabel(largestDeltaWard) : "n/a"}</strong>
              <p>{`Running ${formatSigned((largestDeltaWard?.occupancy_rate ?? 0) - (largestDeltaWard?.avg_7d_occupancy ?? 0))} above normal demand.`}</p>
            </article>
            <article className="bed-analysis-insight-tile tone-teal">
              <span className="eyebrow">Anomaly Load</span>
              <strong>{integer(payload.anomalies.total ?? 0)}</strong>
              <p>{`${integer(payload.anomalies.summary?.critical ?? 0)} critical and ${integer(payload.anomalies.summary?.warning ?? 0)} warning anomaly signals in the latest run.`}</p>
            </article>
            <article className="bed-analysis-insight-tile tone-blue">
              <span className="eyebrow">Governed Source</span>
              <strong className="mono">analytics.fct_bed_occupancy</strong>
              <p>All portal visuals and the embedded dashboard are anchored to the same occupancy mart.</p>
            </article>
          </div>
        </article>
      </section>
    </section>
  );
}
