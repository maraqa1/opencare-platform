"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { payerLabel } from "@/lib/displayNames";
import { currencyCompact, integer, percent } from "@/lib/format";

type EmptyMeta = {
  empty?: boolean;
  message?: string | null;
};

type CashDashboardPayload = {
  subtitle?: string;
  status?: {
    label?: string;
    value?: number;
    target?: string;
    band?: string;
  };
  kpis?: {
    total_cash_collected?: number;
    total_cash_collected_delta_pct?: number;
    denial_rate_pct?: number;
    denial_rate_delta_pp?: number;
    leakage_recovered?: number;
    leakage_recovered_pct_gross?: number;
    claims_in_pipeline?: number;
    claims_require_action?: number;
  };
  cash_vs_charge_series?: Array<{ month: string; charges: number; collections: number }>;
  ar_aging_buckets?: Array<{ bucket: string; value: number; risk_band: string }>;
};

type CashCommandResponse = {
  meta?: EmptyMeta;
  dashboard?: CashDashboardPayload | null;
};

type QueueDashboardPayload = {
  denial_pipeline?: Array<{ month: string; Clinical: number; Coding: number; Eligibility: number; Other: number }>;
  action_cards?: Array<{ label: string; amount: number; subtext: string; button_label: string; href: string }>;
};

type RecoveryQueueResponse = {
  meta?: EmptyMeta;
  dashboard?: QueueDashboardPayload | null;
};

type PayerPerformanceRow = {
  payer: string;
  collection_rate_pct: number;
  avg_days_to_pay: number;
  collection_rate_band: string;
  days_to_pay_band: string;
};

type PayerDashboardPayload = {
  payer_performance?: PayerPerformanceRow[];
  leakage_by_payer?: Array<{ label: string; value_pct: number; leakage_amount: number }>;
};

type PayerControlResponse = {
  meta?: EmptyMeta;
  dashboard?: PayerDashboardPayload | null;
};

function deltaLabel(value?: number | null, suffix = "%", invertPositive = false) {
  if (value == null) {
    return { text: "No prior comparison", className: "neutral", polarity: "flat" as const };
  }
  const polarity = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const effective = invertPositive ? -value : value;
  const arrow = effective > 0 ? "^" : effective < 0 ? "v" : "-";
  const className = effective > 0 ? "positive" : effective < 0 ? "negative" : "neutral";
  return { text: `${arrow} ${Math.abs(value).toFixed(1)}${suffix}`, className, polarity };
}

function chartColour(band: string) {
  switch (band) {
    case "green":
      return "var(--oc-normal)";
    case "blue":
      return "var(--oc-blue)";
    case "amber":
      return "var(--oc-warning)";
    case "orange":
      return "var(--oc-chart-9)";
    case "red":
      return "var(--oc-critical)";
    default:
      return "var(--oc-gray-400)";
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="panel empty-state-panel">
      <p className="eyebrow">Revenue Cycle Command</p>
      <h3 className="section-heading">No revenue cycle data loaded yet</h3>
      <p className="section-subtitle">{message}</p>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="panel empty-state-panel">
      <p className="eyebrow">Revenue Cycle Command</p>
      <h3 className="section-heading">Unable to load executive dashboard</h3>
      <p className="section-subtitle mono">{message}</p>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="rcm-dashboard-shell">
      <div className="panel">
        <span className="skeleton-line short" />
        <span className="skeleton-line medium" style={{ marginTop: "0.75rem" }} />
      </div>
      <div className="kpi-cards">
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="kpi-skeleton-card" key={index}>
            <span className="skeleton-line short" />
            <span className="skeleton-line tall" />
            <span className="skeleton-line medium" style={{ marginTop: "1rem" }} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ChartUnavailable({ message = "Data unavailable for the current filters." }: { message?: string }) {
  return (
    <div
      style={{
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        border: "1px dashed rgba(31, 56, 100, 0.12)",
        background: "linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.96))",
        color: "var(--oc-gray-600)",
        fontSize: 13,
        textAlign: "center",
        padding: "0 24px",
      }}
    >
      {message}
    </div>
  );
}

export function RCMDashboard() {
  const [cash, setCash] = useState<CashCommandResponse | null>(null);
  const [queue, setQueue] = useState<RecoveryQueueResponse | null>(null);
  const [payer, setPayer] = useState<PayerControlResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payerView, setPayerView] = useState<"collection" | "days">("collection");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [cashResponse, queueResponse, payerResponse] = await Promise.all([
          fetch("/api/portal/api/v1/revenue-cycle/cash-command", { cache: "no-store" }),
          fetch("/api/portal/api/v1/revenue-cycle/recovery-queue", { cache: "no-store" }),
          fetch("/api/portal/api/v1/revenue-cycle/payer-control", { cache: "no-store" }),
        ]);

        if (!cashResponse.ok || !queueResponse.ok || !payerResponse.ok) {
          throw new Error(`HTTP ${cashResponse.status}/${queueResponse.status}/${payerResponse.status}`);
        }

        const [cashPayload, queuePayload, payerPayload] = await Promise.all([
          cashResponse.json(),
          queueResponse.json(),
          payerResponse.json(),
        ]);

        setCash(cashPayload as CashCommandResponse);
        setQueue(queuePayload as RecoveryQueueResponse);
        setPayer(payerPayload as PayerControlResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const isEmpty = Boolean(cash?.meta?.empty && queue?.meta?.empty && payer?.meta?.empty);

  const cashSeries = useMemo(() => {
    return cash?.dashboard?.cash_vs_charge_series?.length
      ? cash.dashboard.cash_vs_charge_series
      : [];
  }, [cash]);

  const agingBuckets = useMemo(() => {
    return cash?.dashboard?.ar_aging_buckets?.length ? cash.dashboard.ar_aging_buckets : [];
  }, [cash]);

  const denialPipeline = useMemo(() => {
    return queue?.dashboard?.denial_pipeline?.length ? queue.dashboard.denial_pipeline : [];
  }, [queue]);

  const payerPerformance = useMemo(() => {
    return payer?.dashboard?.payer_performance?.length ? payer.dashboard.payer_performance : [];
  }, [payer]);

  const leakageByPayer = useMemo(() => {
    return payer?.dashboard?.leakage_by_payer?.length ? payer.dashboard.leakage_by_payer : [];
  }, [payer]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (isEmpty) {
    return <EmptyState message={cash?.meta?.message ?? queue?.meta?.message ?? payer?.meta?.message ?? "The command dashboard will appear once revenue-cycle marts are loaded."} />;
  }

  const kpis = cash?.dashboard?.kpis;
  const cashDelta = deltaLabel(kpis?.total_cash_collected_delta_pct, "%");
  const denialDelta = deltaLabel(kpis?.denial_rate_delta_pp, "pp", true);
  const statusBand = cash?.dashboard?.status?.band === "green" ? "normal" : cash?.dashboard?.status?.band ? "warning" : "neutral";
  const actionCards = queue?.dashboard?.action_cards ?? [];

  return (
    <section className="rcm-dashboard-shell">
      <article className="panel rcm-command-topbar">
        <div>
          <p className="eyebrow">Executive Dashboard</p>
          <h3 className="section-heading">Revenue Cycle Command</h3>
          <p className="section-subtitle">{cash?.dashboard?.subtitle ?? "Live revenue-cycle performance summary"}</p>
        </div>
        <div className={`summary-badge ${statusBand}`}>
          {cash?.dashboard?.status?.value != null
            ? `${cash?.dashboard?.status?.label ?? "Status"}: ${integer(cash?.dashboard?.status?.value)} - Target ${cash?.dashboard?.status?.target ?? "Unavailable"}`
            : "Status unavailable"}
        </div>
      </article>

      <section className="rcm-kpi-grid">
        <article className="rcm-kpi-card">
          <span className="eyebrow">Total Cash Collected</span>
          <strong>{currencyCompact(kpis?.total_cash_collected, "SAR")}</strong>
          <p className={`rcm-kpi-subtext ${cashDelta?.className ?? "neutral"}`}>{cashDelta?.text ?? "No prior comparison"} vs prior year</p>
        </article>
        <article className="rcm-kpi-card">
          <span className="eyebrow">Denial Rate</span>
          <strong>{percent(kpis?.denial_rate_pct)}</strong>
          <p className={`rcm-kpi-subtext ${denialDelta?.className ?? "neutral"}`}>{denialDelta?.text ?? "No prior comparison"} - target &lt;5%</p>
        </article>
        <article className="rcm-kpi-card">
          <span className="eyebrow">Leakage Recovered</span>
          <strong>{currencyCompact(kpis?.leakage_recovered, "SAR")}</strong>
          <p className="rcm-kpi-subtext neutral">{percent(kpis?.leakage_recovered_pct_gross)} of gross charges</p>
        </article>
        <article className="rcm-kpi-card">
          <span className="eyebrow">Claims in Pipeline</span>
          <strong>{integer(kpis?.claims_in_pipeline)}</strong>
          <p className="rcm-kpi-subtext neutral">{integer(kpis?.claims_require_action)} require action</p>
        </article>
      </section>

      <section className="rcm-dashboard-grid">
        <article className="panel rcm-chart-card span-6">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Collections vs Charges</p>
              <h3>Monthly cash collections vs charges</h3>
            </div>
          </div>
          <div className="chart-stage">
            {cashSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={cashSeries}>
                  <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `SAR ${value}M`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => `SAR ${value.toFixed(1)}M`} />
                  <Legend />
                  <Line type="monotone" dataKey="charges" name="Charges" stroke="var(--oc-gray-600)" strokeDasharray="6 6" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="collections" name="Collections" stroke="var(--oc-blue)" strokeWidth={3} dot={{ r: 3, fill: "var(--oc-blue)" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ChartUnavailable message="Cash and charge trend is unavailable until the rolling monthly series is populated." />
            )}
          </div>
        </article>

        <article className="panel rcm-chart-card span-6">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AR Aging</p>
              <h3>AR aging buckets</h3>
            </div>
          </div>
          <div className="chart-stage">
            {agingBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={agingBuckets}>
                  <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `SAR ${value}M`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => `SAR ${value.toFixed(1)}M`} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {agingBuckets.map((entry) => (
                      <Cell key={entry.bucket} fill={chartColour(entry.risk_band)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartUnavailable message="A/R aging is unavailable for the current filter set." />
            )}
          </div>
        </article>

        <article className="panel rcm-chart-card span-8">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Denial Pipeline</p>
              <h3>Denial &amp; recovery pipeline</h3>
            </div>
          </div>
          <div className="chart-stage">
            {denialPipeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={denialPipeline}>
                  <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Clinical" stackId="pipeline" fill="var(--oc-critical)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Coding" stackId="pipeline" fill="var(--oc-blue)" />
                  <Bar dataKey="Eligibility" stackId="pipeline" fill="var(--oc-warning)" />
                  <Bar dataKey="Other" stackId="pipeline" fill="var(--oc-teal)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartUnavailable message="Denial pipeline history is unavailable for the current data slice." />
            )}
          </div>
          <div className="rcm-action-grid">
            {actionCards.slice(0, 2).map((card) => (
              <article className="rcm-action-card" key={card.label}>
                <div>
                  <p className="eyebrow">{card.label}</p>
                  <h4>{currencyCompact(card.amount, "SAR")} at risk</h4>
                  <p className="section-subtitle">{card.subtext}</p>
                </div>
                <Link className="button primary" href={card.href}>
                  {card.button_label}
                </Link>
              </article>
            ))}
          </div>
        </article>

        <article className="panel rcm-chart-card span-4">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Payer Performance</p>
              <h3>Payer performance</h3>
            </div>
            <div className="button-row">
              <button className={`filter-chip ${payerView === "collection" ? "active" : ""}`} type="button" onClick={() => setPayerView("collection")}>
                Collection rate
              </button>
              <button className={`filter-chip ${payerView === "days" ? "active" : ""}`} type="button" onClick={() => setPayerView("days")}>
                Avg days to pay
              </button>
            </div>
          </div>
          <div className="rcm-payer-list">
            {payerPerformance.length > 0 ? payerPerformance.map((row) => {
              const value = payerView === "collection" ? row.collection_rate_pct : row.avg_days_to_pay;
              const band = payerView === "collection" ? row.collection_rate_band : row.days_to_pay_band;
              const width = payerView === "collection" ? Math.min(row.collection_rate_pct, 100) : Math.min((row.avg_days_to_pay / 45) * 100, 100);
              return (
                <div className="rcm-payer-row" key={row.payer}>
                  <div className="rcm-payer-row-header">
                    <strong>{payerLabel(row.payer)}</strong>
                    <span>{payerView === "collection" ? `${value.toFixed(0)}%` : `${integer(value)}d`}</span>
                  </div>
                  <div className="rcm-payer-bar-track">
                    <span className={`rcm-payer-bar-fill ${band}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            }) : <ChartUnavailable message="Payer performance is unavailable until the latest monthly payer mart is materialized." />}
          </div>
          <div className="button-row" style={{ marginTop: "1rem" }}>
            <Link className="secondary-link" href="/use-cases/revenue-cycle-management/payer-control">
              Open Payer Control
            </Link>
          </div>
        </article>

        <article className="panel rcm-chart-card span-12">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Leakage Mix</p>
              <h3>Leakage by payer</h3>
            </div>
          </div>
          <div className="rcm-leakage-layout">
            {leakageByPayer.length > 0 ? (
              <>
                <div className="chart-stage">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={leakageByPayer}
                        dataKey="value_pct"
                        nameKey="label"
                        innerRadius={78}
                        outerRadius={118}
                        paddingAngle={2}
                      >
                        {leakageByPayer.map((entry, index) => {
                          const palette = ["var(--oc-blue)", "var(--oc-navy)", "var(--oc-warning)", "var(--oc-critical)", "var(--oc-teal)"];
                          return <Cell key={`${entry.label}-${index}`} fill={palette[index % palette.length]} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="rcm-leakage-legend">
                  {leakageByPayer.map((entry, index) => (
                    <div className="rcm-leakage-legend-row" key={entry.label}>
                      <span className="legend-dot" style={{ background: ["var(--oc-blue)", "var(--oc-navy)", "var(--oc-warning)", "var(--oc-critical)", "var(--oc-teal)"][index % 5] }} />
                      <strong>{entry.label}</strong>
                      <span>{percent(entry.value_pct)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <ChartUnavailable message="Leakage-by-payer distribution is unavailable until payer leakage rows are present." />
            )}
          </div>
        </article>
      </section>
    </section>
  );
}
