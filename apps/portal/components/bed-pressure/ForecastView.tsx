"use client";

import { useEffect, useMemo, useState } from "react";
import { useSharedJsonResource } from "@/lib/useSharedJsonResource";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type OccupancyItem = {
  ward_id: string;
  ward_name: string;
};

type ForecastRow = {
  ward_id: string;
  department_name?: string;
  forecast_date: string;
  predicted_occupancy: number;
  lower_ci_95: number | null;
  upper_ci_95: number | null;
  occupancy_rate: number | null;
  breach_risk: boolean;
  model_used?: string;
  capacity_beds?: number | null;
};

type ChartPoint = {
  date: string;
  dayLabel: string;
  predictedRate: number;
  predictedBeds: number;
  lowerRate: number;
  upperRate: number;
  breachRisk: boolean;
  modelUsed: string;
};

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "n/a";
  }
  return `${value.toFixed(1)}%`;
}

function toPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }
  return value * 100;
}

function bedValueToRate(value: number | null | undefined, capacityBeds: number | null | undefined) {
  if (value === null || value === undefined || !capacityBeds) {
    return 0;
  }
  return (value / capacityBeds) * 100;
}

function formatDayLabel(isoDate: string) {
  const value = new Date(isoDate);
  return value.toLocaleDateString("en-GB", { weekday: "short" });
}

function daysUntil(dateValue: string) {
  const today = new Date();
  const target = new Date(dateValue);
  return Math.max(1, Math.round((target.getTime() - today.getTime()) / 86400000));
}

function ForecastSkeleton() {
  return (
    <section className="panel chart-shell" aria-label="Loading forecast chart">
      <div className="panel-header">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line medium" style={{ marginTop: 10 }} />
        </div>
        <span className="skeleton-line medium" style={{ width: 260, height: 44 }} />
      </div>
      <div className="chart-stage">
        <span className="skeleton-line" style={{ width: "100%", height: "100%" }} />
      </div>
    </section>
  );
}

export function ForecastView({
  selectedWardId,
  statusHref = "/occupancy?tab=occupancy",
}: {
  selectedWardId?: string;
  statusHref?: string;
}) {
  const occupancy = useSharedJsonResource<{ items?: Array<OccupancyItem> }>("/api/portal/api/v1/occupancy/current", {
    fallbackData: { items: [] },
    refreshIntervalMs: 60000,
  });
  const wards = occupancy.data?.items ?? [];
  const [activeWardId, setActiveWardId] = useState<string | undefined>(selectedWardId);
  const [forecastRows, setForecastRows] = useState<ForecastRow[] | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setActiveWardId((currentWardId) => currentWardId ?? selectedWardId ?? wards[0]?.ward_id);
  }, [selectedWardId, wards]);

  useEffect(() => {
    if (!activeWardId) {
      setForecastRows([]);
      setIsReady(true);
      return;
    }

    let cancelled = false;
    const wardId = activeWardId;
    setIsReady(false);

    async function loadForecast() {
      const response = await fetch(
        `/api/portal/api/v1/forecast?days=7&ward_id=${encodeURIComponent(wardId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as { items?: ForecastRow[] };
      if (!cancelled) {
        setForecastRows(payload.items ?? []);
        setIsReady(true);
      }
    }

    loadForecast().catch(() => {
      if (!cancelled) {
        setForecastRows([]);
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeWardId]);

  const chartData = useMemo<ChartPoint[]>(() => {
    return (forecastRows ?? []).map((item) => ({
      date: item.forecast_date,
      dayLabel: formatDayLabel(item.forecast_date),
      predictedRate: toPercent(item.occupancy_rate),
      predictedBeds: item.predicted_occupancy,
      lowerRate: bedValueToRate(item.lower_ci_95, item.capacity_beds),
      upperRate: bedValueToRate(item.upper_ci_95, item.capacity_beds),
      breachRisk: item.breach_risk,
      modelUsed: item.model_used ?? "auto.arima",
    }));
  }, [forecastRows]);

  const breachPoint = chartData.find((item) => item.predictedRate >= 90);
  const wardName =
    forecastRows?.[0]?.department_name ?? wards.find((item) => item.ward_id === activeWardId)?.ward_name;

  if (!isReady && !forecastRows) {
    return <ForecastSkeleton />;
  }

  return (
    <section className="panel chart-shell">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ward Forecast</p>
          <h3 className="section-heading">{wardName ?? "Select a ward"}</h3>
          <p className="section-subtitle">
            Seven-day occupancy trajectory with confidence intervals and threshold breaches.
          </p>
        </div>
        <form className="selector-form">
          <label htmlFor="ward-selector" className="subtle">
            Ward
          </label>
          <select
            id="ward-selector"
            name="ward"
            value={activeWardId ?? ""}
            onChange={(event) => setActiveWardId(event.target.value)}
          >
            {wards.map((item) => (
              <option key={item.ward_id} value={item.ward_id}>
                {item.ward_name}
              </option>
            ))}
          </select>
        </form>
      </div>

      <div className="forecast-meta-grid">
        <div className="forecast-stat">
          <p className="eyebrow">Latest Forecast</p>
          <strong>{formatPercent(chartData[0]?.predictedRate)}</strong>
        </div>
        <div className="forecast-stat">
          <p className="eyebrow">Peak Window</p>
          <strong>{formatPercent(Math.max(...chartData.map((item) => item.predictedRate), 0))}</strong>
        </div>
        <div className="forecast-stat">
          <p className="eyebrow">Model</p>
          <strong className="mono">{chartData[0]?.modelUsed ?? "auto.arima"}</strong>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="chart-stage">
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chartData} margin={{ top: 22, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
              <XAxis
                dataKey="dayLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#757575", fontSize: 12, fontFamily: "Inter" }}
              />
              <YAxis
                domain={[0, 110]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#757575", fontSize: 12, fontFamily: "JetBrains Mono" }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "Predicted") {
                    return [`${value.toFixed(1)}%`, "Predicted"];
                  }
                  if (name === "Lower 95%") {
                    return [`${value.toFixed(1)}%`, "Lower 95%"];
                  }
                  if (name === "Upper 95%") {
                    return [`${value.toFixed(1)}%`, "Upper 95%"];
                  }
                  return [value, name];
                }}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as ChartPoint | undefined;
                  if (!item) {
                    return "";
                  }
                  return `${item.date} | ${item.modelUsed}`;
                }}
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid rgba(31, 56, 100, 0.08)",
                  boxShadow: "0 18px 40px rgba(31, 56, 100, 0.12)",
                  fontFamily: "Inter, sans-serif",
                }}
              />
              <ReferenceLine
                y={90}
                stroke="#b71c1c"
                strokeDasharray="5 5"
                label={{ value: "Critical Threshold", position: "insideTopRight", fill: "#b71c1c", fontSize: 12 }}
              />
              <ReferenceLine
                y={75}
                stroke="#e65100"
                strokeDasharray="5 5"
                label={{ value: "Warning Threshold", position: "insideBottomRight", fill: "#e65100", fontSize: 12 }}
              />
              {chartData[0] ? (
                <ReferenceLine
                  x={chartData[0].dayLabel}
                  stroke="rgba(31, 56, 100, 0.28)"
                  strokeDasharray="4 4"
                  label={{ value: "Forecast Start", position: "insideTopLeft", fill: "#757575", fontSize: 12 }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="upperRate"
                stroke="transparent"
                fill="rgba(21, 101, 192, 0.14)"
                fillOpacity={1}
                isAnimationActive
                animationDuration={1200}
                name="Upper 95%"
              />
              <Area
                type="monotone"
                dataKey="lowerRate"
                stroke="transparent"
                fill="rgba(255, 255, 255, 1)"
                fillOpacity={1}
                isAnimationActive
                animationDuration={1200}
                name="Lower 95%"
              />
              <Line
                type="monotone"
                dataKey="predictedRate"
                stroke="#1565c0"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: "#1565c0" }}
                isAnimationActive
                animationDuration={1200}
                name="Predicted"
              />
              {breachPoint ? (
                <ReferenceDot
                  x={breachPoint.dayLabel}
                  y={breachPoint.predictedRate}
                  r={8}
                  fill="#b71c1c"
                  stroke="#fff"
                  label={{
                    position: "top",
                    value: `Predicted breach in ${daysUntil(breachPoint.date)} days`,
                    fill: "#b71c1c",
                    fontSize: 12,
                  }}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">No forecast data is available for the selected ward.</div>
      )}

      {breachPoint ? (
        <div className="callout critical">
          <h4>Breach Forecast</h4>
          <p>
            {wardName} is predicted to exceed 90% occupancy by {breachPoint.date}. The current
            trajectory rises to {breachPoint.predictedRate.toFixed(1)}% within the next{" "}
            {daysUntil(breachPoint.date)} days.
          </p>
          <ul>
            <li>Review discharge readiness for current inpatients.</li>
            <li>Pre-authorise surge bed capacity for the affected ward cluster.</li>
            <li>Escalate to the on-call capacity manager before the breach window.</li>
          </ul>
          <div className="button-row">
            <a className="button secondary" href={statusHref}>
              View All Wards
            </a>
            <a className="button primary" href="/api/v1/reports/export/forecast">
              Export Forecast CSV
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
