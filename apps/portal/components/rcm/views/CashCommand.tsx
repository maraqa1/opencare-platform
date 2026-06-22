"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RCMNavTabs } from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { EmptyView, ErrorView, LoadingView, StaleBanner } from "../shared/ViewStates";
import { useRCMFetch } from "../useRCMFetch";
import type {
  ActionItem,
  CashCommandGroupedAction,
  CashCommandKpi,
  CashCommandMetric,
  CashCommandPayload,
  CashCommandRiskRow,
  CashCommandStage,
  CashCommandStatus,
} from "../types";
import { departmentLabel, payerLabel } from "@/lib/displayNames";
import { shortDate } from "@/lib/format";
import styles from "./CashCommand.module.css";

function formatSar(value?: number | null, digits = 0) {
  if (value == null) return "-";
  return `SAR ${new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}`;
}

function formatSarCompact(value?: number | null) {
  if (value == null) return "-";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `SAR ${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `SAR ${(value / 1_000).toFixed(1)}K`;
  return formatSar(value, 0);
}

function formatMetric(value: number | null | undefined, unit: string) {
  if (value == null) return "-";
  if (unit === "currency") return formatSarCompact(value);
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "days") return `${Math.round(value)} days`;
  return new Intl.NumberFormat("en-GB").format(Math.round(value));
}

function chartCurrencyTick(value: number) {
  if (Math.abs(value) >= 1_000_000) return `SAR ${Math.round(value / 1_000_000)}M`;
  if (Math.abs(value) >= 1_000) return `SAR ${Math.round(value / 1_000)}K`;
  return `SAR ${Math.round(value)}`;
}

function statusBadgeClass(status?: CashCommandStatus) {
  switch (status) {
    case "critical":
      return `${styles.statusBadge} ${styles.statusCritical}`;
    case "watch":
      return `${styles.statusBadge} ${styles.statusWatch}`;
    case "healthy":
      return `${styles.statusBadge} ${styles.statusHealthy}`;
    default:
      return `${styles.statusBadge} ${styles.statusUnknown}`;
  }
}

function kpiCardClass(status?: CashCommandStatus) {
  switch (status) {
    case "critical":
      return `${styles.kpiCard} ${styles.kpiCardCritical}`;
    case "watch":
      return `${styles.kpiCard} ${styles.kpiCardWatch}`;
    case "healthy":
      return `${styles.kpiCard} ${styles.kpiCardHealthy}`;
    default:
      return styles.kpiCard;
  }
}

function barFillClass(status?: CashCommandStatus) {
  switch (status) {
    case "critical":
      return `${styles.barFill} ${styles.criticalFill}`;
    case "watch":
      return `${styles.barFill} ${styles.watchFill}`;
    case "healthy":
      return `${styles.barFill} ${styles.healthyFill}`;
    default:
      return styles.barFill;
  }
}

function agingBarColor(riskBand?: string) {
  switch (riskBand) {
    case "green":
      return "rgba(0, 105, 92, 0.88)";
    case "blue":
      return "rgba(30, 94, 166, 0.88)";
    case "amber":
      return "rgba(194, 117, 0, 0.88)";
    case "orange":
      return "rgba(219, 126, 38, 0.88)";
    case "red":
      return "rgba(183, 28, 28, 0.9)";
    default:
      return "rgba(31, 56, 100, 0.45)";
  }
}

function severityBannerClass(status?: CashCommandStatus) {
  switch (status) {
    case "critical":
      return `${styles.alertStrip} ${styles.alertStripCritical}`;
    case "watch":
      return `${styles.alertStrip} ${styles.alertStripWatch}`;
    default:
      return `${styles.alertStrip} ${styles.alertStripHealthy}`;
  }
}

function ChartEmpty({ message }: { message: string }) {
  return <div className={styles.emptyBlock}>{message}</div>;
}

function AlertStrip({
  severity,
  message,
  metrics,
}: {
  severity?: CashCommandStatus;
  message?: string | null;
  metrics: CashCommandMetric[];
}) {
  return (
    <section className={severityBannerClass(severity)}>
      <div>
        <p className={styles.alertEyebrow}>CFO Executive Alert</p>
        <p className={styles.alertMessage}>{message ?? "No CFO narrative available."}</p>
      </div>
      <div className={styles.alertMetrics}>
        {metrics.map((metric) => (
          <div className={styles.metricChip} key={metric.label}>
            <span className={styles.metricChipLabel}>{metric.label}</span>
            <span className={styles.metricChipValue}>{formatMetric(metric.value, metric.unit)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function KpiCard({ item }: { item: CashCommandKpi }) {
  return (
    <article className={kpiCardClass(item.status)}>
      <div className={styles.kpiHeader}>
        <p className={styles.kpiLabel}>{item.label}</p>
        <span className={statusBadgeClass(item.status)}>{item.status}</span>
      </div>
      <p className={styles.kpiValue}>{formatMetric(item.value, item.unit)}</p>
      <p className={styles.kpiTarget}>{item.target_label ?? "No benchmark configured"}</p>
      <p className={styles.kpiInterpretation}>{item.interpretation ?? "No interpretation available."}</p>
    </article>
  );
}

function JourneyCard({ stage }: { stage: CashCommandStage }) {
  return (
    <article className={styles.journeyCard}>
      <div>
        <span className={styles.journeyNumber}>{String(stage.stage_number).padStart(2, "0")}</span>
        <h3 className={styles.journeyTitle}>{stage.title}</h3>
        <p className={styles.journeyReason}>{stage.why_it_matters ?? "No narrative available."}</p>
      </div>
      <span className={statusBadgeClass(stage.status)}>{stage.status}</span>
      <div className={styles.journeyMetrics}>
        {stage.metrics.map((metric) => (
          <div className={styles.journeyMetric} key={`${stage.key}-${metric.label}`}>
            <span className={styles.journeyMetricLabel}>{metric.label}</span>
            <span className={styles.journeyMetricValue}>{formatMetric(metric.value, metric.unit)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function RiskCard({ item }: { item: CashCommandRiskRow }) {
  return (
    <article className={styles.riskCard}>
      <div className={styles.kpiHeader}>
        <p className={styles.riskLabel}>{item.label}</p>
        <span className={statusBadgeClass(item.status)}>{item.status}</span>
      </div>
      <p className={styles.riskAmount}>{formatSarCompact(item.amount)}</p>
      <p className={styles.riskMeta}>
        {new Intl.NumberFormat("en-GB").format(item.claims)} claims
        {item.share_pct != null ? ` - ${item.share_pct.toFixed(1)}% of total risk` : ""}
      </p>
      <p className={styles.riskMeta}>{item.note ?? "No note available."}</p>
    </article>
  );
}

function PayerRow({
  payer,
  collectionRate,
  denialRate,
  avgDaysToPay,
  arExposure,
  riskScore,
  status,
}: {
  payer: string;
  collectionRate?: number | null;
  denialRate?: number | null;
  avgDaysToPay?: number | null;
  arExposure?: number | null;
  riskScore?: number | null;
  status?: CashCommandStatus;
}) {
  const width = Math.max(8, Math.min(riskScore ?? 0, 100));
  return (
    <div className={styles.payerRow}>
      <div className={styles.payerTop}>
        <strong>{payerLabel(payer)}</strong>
        <span className={statusBadgeClass(status)}>{status ?? "unknown"}</span>
      </div>
      <div className={styles.payerMeta}>
        <span>Collection {collectionRate != null ? `${collectionRate.toFixed(1)}%` : "-"}</span>
        <span>Denial {denialRate != null ? `${denialRate.toFixed(1)}%` : "-"}</span>
        <span>Days to pay {avgDaysToPay != null ? `${Math.round(avgDaysToPay)}d` : "-"}</span>
        <span>AR {formatSarCompact(arExposure)}</span>
      </div>
      <div className={styles.barTrack}>
        <span className={barFillClass(status)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function LeakageRow({
  payer,
  amount,
  sharePct,
}: {
  payer: string;
  amount: number;
  sharePct?: number | null;
}) {
  const width = Math.max(8, Math.min(sharePct ?? 0, 100));
  return (
    <div className={styles.leakageRow}>
      <div className={styles.leakageTop}>
        <strong>{payerLabel(payer)}</strong>
        <span>{sharePct != null ? `${sharePct.toFixed(1)}%` : "-"}</span>
      </div>
      <div className={styles.barTrack}>
        <span className={styles.barFill} style={{ width: `${width}%` }} />
      </div>
      <span className={styles.sectionSubtext}>{formatSarCompact(amount)}</span>
    </div>
  );
}

function ActionTable({ rows }: { rows: CashCommandGroupedAction[] }) {
  if (rows.length === 0) {
    return <ChartEmpty message="No grouped recovery actions are available for the current filters." />;
  }

  return (
    <div className={styles.actionsTableWrap}>
      <table className={styles.actionsTable}>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Issue Type</th>
            <th>Payer / Department</th>
            <th>Claims</th>
            <th>Recoverable Amount</th>
            <th>Expected Recovery</th>
            <th>Owner</th>
            <th>Due Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.issue_type}-${row.payer_id}-${row.department_id}-${index}`}>
              <td>{row.priority ?? "-"}</td>
              <td>{row.issue_type ?? "-"}</td>
              <td>
                {payerLabel(row.payer_id ?? "")}
                <br />
                <span className={styles.sectionSubtext}>{departmentLabel(row.department_id ?? "")}</span>
              </td>
              <td>{row.claims ?? 0}</td>
              <td>{formatSarCompact(row.recoverable_amount)}</td>
              <td>{formatSarCompact(row.expected_recovery)}</td>
              <td>{row.owner ?? "-"}</td>
              <td>
                {row.due_bucket ?? "-"}
                <br />
                <span className={styles.sectionSubtext}>{shortDate(row.earliest_due_date)}</span>
              </td>
              <td>{row.action ?? "Review"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeadlineCard({ item }: { item: ActionItem }) {
  return (
    <article className={styles.deadlineCard}>
      <p className={styles.deadlineTitle}>{item.issue_type ?? "Recovery item"}</p>
      <p className={styles.deadlineMeta}>
        {payerLabel(item.payer_id ?? "")} - {departmentLabel(item.department_id ?? "")}
      </p>
      <p className={styles.deadlineMeta}>Due {shortDate(item.due_date)}</p>
      <p className={styles.deadlineMeta}>Expected recovery {formatSarCompact(item.expected_recovery_amount)}</p>
      <p className={styles.deadlineMeta}>{item.next_step ?? "Review work item"}</p>
    </article>
  );
}

export function CashCommand() {
  const { data, loading, error, stale, refetch } = useRCMFetch<CashCommandPayload>("cash-command");

  const kpis = data?.kpis ?? [];
  const journeyStages = data?.journey?.stages ?? [];
  const riskRows = data?.risk_concentration ?? [];
  const cashSeries = data?.charts?.cash_vs_charges ?? [];
  const agingBuckets = data?.charts?.ar_aging_buckets ?? [];
  const denialPipeline = data?.charts?.denial_recovery_pipeline ?? [];
  const payerPerformance = data?.charts?.payer_performance ?? [];
  const leakageByPayer = data?.charts?.leakage_by_payer ?? [];
  const actionRows = data?.actions?.grouped ?? [];
  const deadlines = data?.actions?.deadlines_at_risk ?? [];
  const arDaysKpi = kpis.find((item) => item.key === "ar_days");
  const trustLoaded = data?.data_quality?.sources_loaded ?? 0;
  const trustTotal = data?.data_quality?.total_sources ?? 0;
  const periodLabel = data?.period?.label ?? "Rolling 12 months";

  const badgeColor: "green" | "amber" | "blue" | "gray" =
    data?.data_freshness?.status === "fresh"
      ? "green"
      : data?.data_freshness?.status === "unknown"
      ? "gray"
      : "amber";

  return (
    <div className={styles.page}>
      <RCMPageHeader
        title="Cash Command"
        subtitle="CFO landing page for reconciled cash performance, revenue risk, and grouped recovery actions."
        arDays={arDaysKpi?.value ?? undefined}
        arTarget={40}
        badges={[
          { label: data?.data_quality?.trust_label ?? "Financial truth: ERP postings", color: "blue" },
          { label: `Freshness: ${data?.data_freshness?.status ?? "unknown"}`, color: badgeColor },
          { label: `${trustLoaded}/${trustTotal || 5} sources loaded`, color: trustLoaded === trustTotal ? "green" : "amber" },
        ]}
      />
      <RCMNavTabs active="cash-command" />

      {stale && <StaleBanner />}
      {loading && <LoadingView />}
      {error && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && !loading && !error && (
        <EmptyView message={data.meta.message ?? "Cash command will populate once revenue-cycle marts are loaded."} />
      )}

      {!loading && !error && data && !data.meta?.empty && (
        <>
          <AlertStrip
            severity={data.headline?.severity}
            message={data.headline?.message}
            metrics={data.headline?.metrics ?? []}
          />

          <section className={styles.kpiGrid}>
            {kpis.map((item) => (
              <KpiCard item={item} key={item.key} />
            ))}
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Revenue Cycle Journey</p>
                <h2 className={styles.sectionTitle}>Seven-stage cash conversion path</h2>
                <p className={styles.sectionSubtext}>
                  {periodLabel}. Each stage uses the same filtered cohort as the KPI cards above.
                </p>
              </div>
            </div>
            <div className={styles.journeyGrid}>
              {journeyStages.map((stage) => (
                <JourneyCard key={stage.key} stage={stage} />
              ))}
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Revenue Risk Concentration</p>
                <h2 className={styles.sectionTitle}>Where the cash pressure is concentrated</h2>
              </div>
            </div>
            <div className={styles.riskGrid}>
              {riskRows.map((item) => (
                <RiskCard item={item} key={item.key} />
              ))}
            </div>
          </section>

          <section className={styles.chartGrid}>
            <article className={`${styles.chartCard} ${styles.span8}`}>
              <div className={styles.chartHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Collections vs Charges</p>
                  <h3 className={styles.chartTitle}>Monthly charges, posted cash, and expected collections</h3>
                  <p className={styles.chartNote}>{periodLabel}</p>
                </div>
              </div>
              {cashSeries.length > 0 ? (
                <>
                  <div className={styles.chartStage}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashSeries}>
                        <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={chartCurrencyTick} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value: number) => formatSar(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="charges" name="Charges" stroke="rgba(8, 32, 66, 0.74)" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="cash_collected" name="Cash Collected" stroke="rgba(30, 94, 166, 0.96)" strokeWidth={3} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="expected_collections" name="Expected Collections" stroke="rgba(0, 105, 92, 0.88)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className={styles.chartInterpretation}>
                    Cash is lagging charges by {formatSarCompact(data.charts?.cash_gap_to_charges ?? 0)} across the current cohort.
                  </p>
                </>
              ) : (
                <ChartEmpty message="No monthly cash-versus-charge trend is available for the selected filters." />
              )}
            </article>

            <article className={`${styles.chartCard} ${styles.span4}`}>
              <div className={styles.chartHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>AR Aging</p>
                  <h3 className={styles.chartTitle}>Aged receivables by bucket</h3>
                  <p className={styles.chartNote}>
                    Total AR {formatSarCompact(data.charts?.ar_total)} - AR &gt;90 {formatSarCompact(data.charts?.ar_over_90)}
                  </p>
                </div>
              </div>
              {agingBuckets.length > 0 ? (
                <div className={styles.chartStage}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingBuckets}>
                      <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                      <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={chartCurrencyTick} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => formatSar(value)} />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        {agingBuckets.map((entry) => (
                          <Cell key={entry.bucket} fill={agingBarColor(entry.risk_band)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmpty message="No AR aging data is available for the selected filters." />
              )}
            </article>

            <article className={`${styles.chartCard} ${styles.span6}`}>
              <div className={styles.chartHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Denial & Recovery Pipeline</p>
                  <h3 className={styles.chartTitle}>Denied claim value vs expected recovery</h3>
                  <p className={styles.chartNote}>Both series are shown in SAR.</p>
                </div>
              </div>
              {denialPipeline.length > 0 ? (
                <div className={styles.chartStage}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={denialPipeline}>
                      <CartesianGrid stroke="rgba(31, 56, 100, 0.08)" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={chartCurrencyTick} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => formatSar(value)} />
                      <Legend />
                      <Bar dataKey="denied_value" name="Denied Claim Value" fill="rgba(183, 28, 28, 0.88)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expected_recovery" name="Expected Recovery" fill="rgba(0, 105, 92, 0.88)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmpty message="No denial or recovery pipeline trend is available for the selected filters." />
              )}
            </article>

            <article className={`${styles.chartCard} ${styles.span6}`}>
              <div className={styles.chartHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Payer Performance</p>
                  <h3 className={styles.chartTitle}>Worst financial risk first</h3>
                  <p className={styles.chartNote}>Collection rate, denial rate, AR exposure, and average days to pay.</p>
                </div>
              </div>
              {payerPerformance.length > 0 ? (
                <div className={styles.payersList}>
                  {payerPerformance.slice(0, 6).map((row) => (
                    <PayerRow
                      key={row.payer}
                      payer={row.payer}
                      collectionRate={row.collection_rate_pct}
                      denialRate={row.denial_rate_pct}
                      avgDaysToPay={row.avg_days_to_pay}
                      arExposure={row.ar_exposure}
                      riskScore={row.risk_score}
                      status={row.status}
                    />
                  ))}
                </div>
              ) : (
                <ChartEmpty message="No payer performance rows are available for the selected filters." />
              )}
            </article>

            <article className={`${styles.chartCard} ${styles.span12}`}>
              <div className={styles.chartHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Leakage by Payer</p>
                  <h3 className={styles.chartTitle}>Ranked leakage exposure</h3>
                </div>
              </div>
              {leakageByPayer.length > 0 ? (
                <div className={styles.leakageList}>
                  {leakageByPayer.map((row) => (
                    <LeakageRow
                      key={row.payer}
                      payer={row.payer}
                      amount={row.leakage_amount}
                      sharePct={row.share_pct}
                    />
                  ))}
                </div>
              ) : (
                <ChartEmpty message="No leakage-by-payer rows are available for the selected filters." />
              )}
            </article>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Today's Recovery Actions</p>
                <h2 className={styles.sectionTitle}>Grouped action board</h2>
                <p className={styles.sectionSubtext}>
                  Repeated actions are grouped by issue type, payer, department, owner, and due-date bucket.
                </p>
              </div>
            </div>
            <div className={styles.actionsLayout}>
              <ActionTable rows={actionRows} />
              <div className={styles.deadlineList}>
                {deadlines.length > 0 ? (
                  deadlines.map((item) => (
                    <DeadlineCard key={item.opportunity_id ?? item.claim_id ?? item.issue_type} item={item} />
                  ))
                ) : (
                  <ChartEmpty message="No deadlines are currently at risk." />
                )}
              </div>
            </div>
          </section>

          <details className={styles.trustDrawer}>
            <summary className={styles.trustSummary}>
              <div>
                <p className={styles.sectionEyebrow}>Data Trust & Source Coverage</p>
                <h3 className={styles.chartTitle}>Freshness, loaded marts, and known limitations</h3>
              </div>
              <span className={styles.sectionSubtext}>
                {data.data_quality?.trust_label ?? "Financial truth: ERP postings"} - {trustLoaded}/{trustTotal || 5} loaded
              </span>
            </summary>
            <div className={styles.trustGrid}>
              <div className={styles.trustMiniGrid}>
                <div className={styles.trustBlock}>
                  <p className={styles.sectionEyebrow}>Source Tables</p>
                  <ul className={styles.trustList}>
                    {(data.data_quality?.source_tables ?? []).map((source) => (
                      <li key={source.table}>
                        <strong>{source.table}</strong> - {source.role}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={styles.trustBlock}>
                  <p className={styles.sectionEyebrow}>Applied Filters</p>
                  <ul className={styles.trustList}>
                    <li>Date from: {data.data_quality?.filters_applied?.date_from ?? "Auto"}</li>
                    <li>Date to: {data.data_quality?.filters_applied?.date_to ?? "Auto"}</li>
                    <li>Payer: {(data.data_quality?.filters_applied?.payer ?? []).join(", ") || "All"}</li>
                    <li>Department: {(data.data_quality?.filters_applied?.department ?? []).join(", ") || "All"}</li>
                    <li>Claim status: {(data.data_quality?.filters_applied?.claim_status ?? []).join(", ") || "All"}</li>
                  </ul>
                </div>
              </div>

              <div className={styles.trustMiniGrid}>
                <div className={styles.trustBlock}>
                  <p className={styles.sectionEyebrow}>Missing Metrics</p>
                  <ul className={styles.trustList}>
                    {(data.data_quality?.missing_metrics ?? []).map((metric) => (
                      <li key={metric.label}>
                        <strong>{metric.label}</strong> - {metric.reason}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={styles.trustBlock}>
                  <p className={styles.sectionEyebrow}>Warnings & Limitations</p>
                  <ul className={styles.trustList}>
                    {(data.data_quality?.warnings ?? []).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                    {(data.data_quality?.limitations ?? []).map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
