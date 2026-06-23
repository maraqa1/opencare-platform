import type {
  CashCommandKpi,
  CashCommandPayload,
  RCMDecisionQueuePayload,
  RecoveryQueueKpi,
  RecoveryQueuePayload,
  RecoveryQueueRollup,
  RevenueCycleBoardPackPayload,
} from "@/components/rcm/types";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSar(value?: number | null, digits = 0, currencyCode = "SAR") {
  if (value == null) return "-";
  return `${currencyCode} ${new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}`;
}

function formatSarCompact(value?: number | null, currencyCode = "SAR") {
  if (value == null) return "-";
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) return `${currencyCode} ${(value / 1_000_000).toFixed(1)}M`;
  if (absoluteValue >= 1_000) return `${currencyCode} ${(value / 1_000).toFixed(1)}K`;
  return formatSar(value, 0, currencyCode);
}

function formatCount(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatHours(value?: number | null) {
  if (value == null) return "-";
  return `${value.toFixed(1)}h`.replace(".0h", "h");
}

function formatPercent(value?: number | null, digits = 1) {
  if (value == null) return "Metric unavailable";
  return `${value.toFixed(digits)}%`;
}

function formatDays(value?: number | null) {
  if (value == null) return "Metric unavailable";
  return `${Math.round(value)} days`;
}

function shortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function timestamp(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function kpiByKey(kpis: CashCommandKpi[] | undefined, key: string) {
  return (kpis ?? []).find((item) => item.key === key) ?? null;
}

function queueKpiById(kpis: RecoveryQueueKpi[] | undefined, id: string) {
  return (kpis ?? []).find((item) => item.id === id) ?? null;
}

function buildNarrative(cash: CashCommandPayload, queue: RecoveryQueuePayload) {
  const cashAtRisk = cash.cash_at_risk ?? 0;
  const recoverable7d = cash.recoverable_cash_7d ?? 0;
  const queueValue = queueKpiById(queue.kpis, "recoverable_queue_value")?.value ?? 0;
  const expectedRecovery = queueKpiById(queue.kpis, "expected_recovery")?.value ?? 0;
  const dueThisWeek = queueKpiById(queue.kpis, "due_this_week")?.value ?? 0;
  const queueItems = queue.total ?? queue.queue_items?.length ?? queue.items?.length ?? 0;
  const cashStory = cash.headline?.message ?? "Cash overview narrative unavailable.";
  const queueStory = queue.headline?.message ?? "Recovery work queue narrative unavailable.";

  return {
    summary:
      `Cash Overview identifies ${formatSarCompact(cashAtRisk)} at risk and ${formatSarCompact(recoverable7d)} recoverable inside the next 7 days. ` +
      `Recovery Work Queue translates that exposure into ${formatCount(queueItems)} ranked actions, ${formatSarCompact(queueValue)} of visible recoverable value, and ${formatCount(dueThisWeek)} items due this week.`,
    cashStory,
    queueStory,
    execution:
      `The financial story is concentrated, not uniform. Once risk is isolated, the operating challenge becomes sequencing effort to convert ${formatSarCompact(expectedRecovery)} of expected recovery into realised cash without creating a new due-window backlog.`,
  };
}

function svgLineChart(
  data: Array<Record<string, unknown>>,
  series: Array<{ key: string; color: string; dashed?: boolean }>,
  width = 760,
  height = 220,
) {
  if (data.length === 0) {
    return `<div class="empty-chart">No chart data available.</div>`;
  }

  const numericValues = data.flatMap((row) =>
    series
      .map((line) => Number(row[line.key] ?? 0))
      .filter((value) => Number.isFinite(value)),
  );

  const maxValue = Math.max(...numericValues, 1);
  const minValue = Math.min(...numericValues, 0);
  const left = 42;
  const right = 16;
  const top = 14;
  const bottom = 28;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;

  const x = (index: number) =>
    left + (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
  const y = (value: number) => {
    const span = maxValue - minValue || 1;
    return top + innerHeight - ((value - minValue) / span) * innerHeight;
  };

  const guides = [0.25, 0.5, 0.75].map((ratio) => {
    const yPos = top + innerHeight * ratio;
    return `<line x1="${left}" y1="${yPos}" x2="${width - right}" y2="${yPos}" stroke="rgba(31,56,100,0.10)" stroke-width="1" />`;
  });

  const lines = series
    .map((line) => {
      const points = data
        .map((row, index) => `${x(index)},${y(Number(row[line.key] ?? 0))}`)
        .join(" ");
      return `<polyline fill="none" stroke="${line.color}" stroke-width="3" ${
        line.dashed ? `stroke-dasharray="7 7"` : ""
      } points="${points}" />`;
    })
    .join("");

  const labels = data
    .map((row, index) => {
      const label = escapeHtml(row.month ?? row.label ?? row.bucket ?? `P${index + 1}`);
      return `<text x="${x(index)}" y="${height - 8}" text-anchor="middle" font-size="11" fill="rgba(31,56,100,0.62)">${label}</text>`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Trend chart">
      ${guides.join("")}
      <line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" stroke="rgba(31,56,100,0.16)" stroke-width="1.5" />
      ${lines}
      ${labels}
    </svg>
  `;
}

function svgBarChart(
  data: Array<Record<string, unknown>>,
  key: string,
  colorFn: (row: Record<string, unknown>) => string,
  width = 760,
  height = 220,
) {
  if (data.length === 0) {
    return `<div class="empty-chart">No chart data available.</div>`;
  }

  const values = data.map((row) => Number(row[key] ?? 0));
  const maxValue = Math.max(...values, 1);
  const left = 40;
  const right = 16;
  const top = 14;
  const bottom = 28;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const slotWidth = innerWidth / data.length;
  const barWidth = Math.max(18, slotWidth * 0.56);

  const guides = [0.25, 0.5, 0.75].map((ratio) => {
    const yPos = top + innerHeight * ratio;
    return `<line x1="${left}" y1="${yPos}" x2="${width - right}" y2="${yPos}" stroke="rgba(31,56,100,0.10)" stroke-width="1" />`;
  });

  const bars = data
    .map((row, index) => {
      const value = Number(row[key] ?? 0);
      const barHeight = maxValue === 0 ? 0 : (value / maxValue) * innerHeight;
      const barX = left + slotWidth * index + (slotWidth - barWidth) / 2;
      const barY = top + innerHeight - barHeight;
      const fill = colorFn(row);
      const label = escapeHtml(row.month ?? row.bucket ?? row.label ?? `B${index + 1}`);
      return `
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="10" fill="${fill}" />
        <text x="${barX + barWidth / 2}" y="${height - 8}" text-anchor="middle" font-size="11" fill="rgba(31,56,100,0.62)">${label}</text>
      `;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Bar chart">
      ${guides.join("")}
      <line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" stroke="rgba(31,56,100,0.16)" stroke-width="1.5" />
      ${bars}
    </svg>
  `;
}

function progressList(
  rows: RecoveryQueueRollup[],
  metric: "expected_recovery" | "effort_hours" | "recoverable_value",
  currencyCode: string,
) {
  if (rows.length === 0) {
    return `<div class="empty-chart">No ranked items available.</div>`;
  }

  const maxValue = Math.max(
    ...rows.map((row) => Number(row[metric] ?? 0)),
    1,
  );

  return rows
    .slice(0, 5)
    .map((row) => {
      const rawValue = Number(row[metric] ?? 0);
      const width = Math.max(10, Math.round((rawValue / maxValue) * 100));
      const metricLabel =
        metric === "effort_hours"
          ? (row.formatted_effort_hours ?? formatHours(row.effort_hours))
          : metric === "expected_recovery"
            ? (row.formatted_expected_recovery ?? formatSarCompact(row.expected_recovery, currencyCode))
            : (row.formatted_recoverable_value ?? formatSarCompact(row.recoverable_value, currencyCode));

      return `
        <div class="progress-row">
          <div class="progress-top">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(metricLabel)}</span>
          </div>
          <div class="progress-meta">${escapeHtml(`${formatCount(row.count ?? 0)} items`)}</div>
          <div class="progress-track"><span class="progress-fill" style="width:${width}%"></span></div>
        </div>
      `;
    })
    .join("");
}

function agingColor(riskBand?: unknown) {
  switch (String(riskBand ?? "")) {
    case "green":
      return "rgba(0,105,92,0.90)";
    case "blue":
      return "rgba(30,94,166,0.90)";
    case "amber":
      return "rgba(194,117,0,0.90)";
    case "orange":
      return "rgba(219,126,38,0.90)";
    case "red":
      return "rgba(183,28,28,0.92)";
    default:
      return "rgba(31,56,100,0.55)";
  }
}

function toneColor(status?: string | null) {
  switch (String(status ?? "").toLowerCase()) {
    case "critical":
      return "rgba(183,28,28,0.92)";
    case "watch":
      return "rgba(194,117,0,0.92)";
    case "healthy":
      return "rgba(0,122,96,0.92)";
    default:
      return "rgba(31,56,100,0.80)";
  }
}

function statusClass(status?: string | null) {
  switch (String(status ?? "").toLowerCase()) {
    case "critical":
      return "critical";
    case "watch":
      return "watch";
    case "healthy":
      return "healthy";
    default:
      return "neutral";
  }
}

function statusLabel(status?: string | null) {
  const raw = String(status ?? "neutral").trim();
  if (!raw) return "Neutral";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function buildKpiCards(kpis: Array<{ label?: string | null; formatted_value?: string | null; interpretation?: string | null; target_label?: string | null; status?: string | null }>) {
  return kpis
    .map((kpi) => `
      <article class="kpi-card" style="border-top:4px solid ${toneColor(kpi.status)}">
        <div class="kpi-top">
          <p class="eyebrow">${escapeHtml(kpi.label ?? "KPI")}</p>
          <span class="badge ${statusClass(kpi.status)}">${escapeHtml(statusLabel(kpi.status))}</span>
        </div>
        <div class="kpi-value">${escapeHtml(kpi.formatted_value ?? "-")}</div>
        <p class="kpi-target">${escapeHtml(kpi.target_label ?? "")}</p>
        <p class="kpi-note">${escapeHtml(kpi.interpretation ?? "")}</p>
      </article>
    `)
    .join("");
}

export function buildRevenueCycleBoardPack({
  boardPack,
  requestLabel,
}: {
  boardPack: RevenueCycleBoardPackPayload;
  requestLabel?: string;
}) {
  const cash: CashCommandPayload = boardPack.cash_command ?? {};
  const queue: RecoveryQueuePayload = boardPack.recovery_queue ?? {};
  const decisionPayload: RCMDecisionQueuePayload = boardPack.decision_layer?.payload ?? {};
  const executiveCover = boardPack.executive_cover ?? {};
  const storyline = boardPack.storyline ?? {};
  const decisionLayer = boardPack.decision_layer ?? {};
  const dataTrust = boardPack.data_trust ?? {};
  const currencyCode =
    boardPack.currency ??
    cash.currency ??
    queue.currency ??
    decisionPayload.currency ??
    "SAR";
  const generatedAt = timestamp(
    boardPack.generated_at ?? queue.generated_at ?? cash.as_of ?? new Date().toISOString(),
  );
  const cashKpis = cash.kpis ?? [];
  const queueKpis = queue.kpis ?? [];
  const decisionKpis = decisionLayer.kpis ?? [];
  const topActions = (queue.queue_items ?? queue.items ?? []).slice(0, 12);
  const issueMix = queue.intelligence?.issue_mix ?? [];
  const payerRecovery = queue.intelligence?.payer_recovery ?? [];
  const ownerWorkload = queue.intelligence?.owner_workload ?? [];
  const dueWindow = queue.intelligence?.due_window ?? [];
  const collectionRateKpi = kpiByKey(cashKpis, "collection_rate");
  const denialRateKpi = kpiByKey(cashKpis, "denial_rate");
  const arDaysKpi = kpiByKey(cashKpis, "ar_days");
  const netPatientRevenueKpi = kpiByKey(cashKpis, "net_patient_revenue");
  const cashCollectedKpi = kpiByKey(cashKpis, "cash_collected");
  const queueValueKpi = queueKpiById(queueKpis, "recoverable_queue_value");
  const expectedRecoveryKpi = queueKpiById(queueKpis, "expected_recovery");
  const dueThisWeekKpi = queueKpiById(queueKpis, "due_this_week");
  const overdueItemsKpi = queueKpiById(queueKpis, "overdue_items");
  const effortHoursKpi = queueKpiById(queueKpis, "recovery_effort_hours");
  const filterEntries = Object.entries(
    dataTrust.filters_applied ?? boardPack.filters_applied ?? {},
  ).filter(([, value]) => value != null && String(value).trim() !== "");
  const sourceTables = dataTrust.source_tables ?? [];
  const sourceFreshness = dataTrust.source_freshness ?? [];
  const metricDefinitions = dataTrust.metric_definitions ?? [];
  const missingMetrics = dataTrust.missing_metrics ?? [];
  const unavailableFields = dataTrust.unavailable_fields ?? [];
  const warnings = dataTrust.warnings ?? [];
  const limitations = dataTrust.limitations ?? [];
  const scoringLogic = dataTrust.scoring_logic ?? [];

  const cashRiskLabel =
    cash.cash_at_risk == null
      ? "Metric unavailable"
      : formatSarCompact(cash.cash_at_risk, currencyCode);
  const netPatientRevenueLabel =
    netPatientRevenueKpi?.value == null
      ? "Metric unavailable"
      : formatSarCompact(netPatientRevenueKpi.value, currencyCode);
  const cashCollectedLabel =
    cashCollectedKpi?.value == null
      ? "Metric unavailable"
      : formatSarCompact(cashCollectedKpi.value, currencyCode);
  const recoverableQueueLabel =
    queueValueKpi?.formatted_value ??
    (queueValueKpi?.value == null
      ? "Metric unavailable"
      : formatSarCompact(queueValueKpi.value, currencyCode));
  const expectedRecoveryLabel =
    expectedRecoveryKpi?.formatted_value ??
    (expectedRecoveryKpi?.value == null
      ? "Metric unavailable"
      : formatSarCompact(expectedRecoveryKpi.value, currencyCode));
  const dueThisWeekLabel =
    dueThisWeekKpi?.value == null
      ? "Metric unavailable"
      : `${formatCount(dueThisWeekKpi.value)} items`;
  const overdueItemsLabel =
    overdueItemsKpi?.value == null
      ? "Metric unavailable"
      : `${formatCount(overdueItemsKpi.value)} items`;
  const effortHoursLabel =
    effortHoursKpi?.value == null
      ? "Metric unavailable"
      : formatHours(effortHoursKpi.value);
  const cashSectionSubtitle =
    `CFO position: cash conversion is ${cash.headline?.severity ?? "unknown"}. ` +
    `Average payment days are ${formatDays(arDaysKpi?.value)} against ${arDaysKpi?.target_label ?? "target unavailable"}, ` +
    `rejected claim rate is ${formatPercent(denialRateKpi?.value)}, and ${cashRiskLabel} ` +
    `is exposed through aged receivables, rejected claims, billing backlog, and underpayments.`;
  const recoverySectionSubtitle =
    "Cash Command diagnoses the financial risk. Recovery Queue operationalises it by creating a ranked operating list with expected recovery, effort, due window, owner, insurer, and status.";
  const recoveryAlertStrip =
    `The recovery opportunity is ${recoverableQueueLabel}, expected recovery is ${expectedRecoveryLabel}, ` +
    `${dueThisWeekLabel}, ${overdueItemsLabel.toLowerCase()}, and ${effortHoursLabel} effort hours are required.`;
  const cashSeverity = statusClass(cash.headline?.severity);
  const queueSeverity = statusClass(queue.headline?.severity);
  const decisionSeverity = decisionLayer.workflow_configured ? statusClass(decisionPayload.headline?.severity) : "neutral";
  const cashAlertMessage =
    `Cash Command diagnoses the financial problem. ${netPatientRevenueLabel} of net patient revenue has generated only ${cashCollectedLabel} of collected cash in the visible scope. ` +
    `The finance team should focus on aged receivables, rejected claims, billing backlog, and underpayments before they become permanent cash loss.`;
  const cashTalkTrack =
    `Cash Command shows that this is not simply a reporting issue. The hospital has ${netPatientRevenueLabel} net patient revenue, but only ${cashCollectedLabel} has converted into cash. ` +
    `Average payment days are ${formatDays(arDaysKpi?.value)} and rejected claim rate is ${formatPercent(denialRateKpi?.value)}. ` +
    `The CFO now knows the cash risk is concentrated in aged receivables, rejected claims, billing backlog, and underpayments.`;
  const recoveryTalkTrack =
    `Recovery Queue converts the cash problem into action. The queue contains ${recoverableQueueLabel} recoverable value and ${expectedRecoveryLabel} expected recovery. ` +
    `${overdueItemsLabel === "0 items" ? "Nothing is overdue today" : `${overdueItemsLabel} remain overdue`}, but ${dueThisWeekLabel.toLowerCase()} and ${effortHoursLabel} are required. ` +
    `This means the queue ${overdueItemsLabel === "0 items" ? "is controlled now" : "needs immediate intervention"}, while execution pressure is building.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Revenue Cycle Board Pack</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --navy:#10284f;
      --blue:#2b67d0;
      --blue-soft:#eaf1ff;
      --green:#007a60;
      --amber:#b97800;
      --red:#b71c1c;
      --slate:#5d6878;
      --panel:#ffffff;
      --bg:#f4f7fb;
    }
    * { box-sizing:border-box; }
    body {
      margin:0;
      font-family:"Segoe UI", Arial, sans-serif;
      background:var(--bg);
      color:#10203c;
      padding:32px;
    }
    .report {
      max-width:1240px;
      margin:0 auto;
      display:grid;
      gap:22px;
    }
    .hero {
      padding:30px;
      border-radius:26px;
      background:
        radial-gradient(circle at top right, rgba(147,187,255,0.20), transparent 34%),
        linear-gradient(135deg, rgba(13,39,82,0.98), rgba(31,91,177,0.92));
      color:white;
      box-shadow:0 24px 48px rgba(16,40,79,0.16);
    }
    .eyebrow {
      margin:0 0 8px;
      font-size:11px;
      letter-spacing:0.16em;
      text-transform:uppercase;
      color:rgba(255,255,255,0.72);
      font-weight:700;
    }
    .hero h1 {
      margin:0;
      font-size:40px;
      line-height:1.05;
    }
    .hero p {
      margin:10px 0 0;
      font-size:15px;
      line-height:1.6;
      max-width:900px;
      color:rgba(255,255,255,0.88);
    }
    .hero-split {
      display:grid;
      grid-template-columns:1.45fr 0.55fr;
      gap:24px;
    }
    .pill-row {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:16px;
    }
    .pill {
      padding:6px 10px;
      border-radius:999px;
      background:rgba(255,255,255,0.12);
      border:1px solid rgba(255,255,255,0.14);
      color:white;
      font-size:12px;
      font-weight:600;
    }
    .hero-grid, .summary-grid, .kpi-grid, .chart-grid, .intel-grid, .trust-grid, .decision-grid {
      display:grid;
      gap:14px;
    }
    .hero-panel {
      border-radius:22px;
      padding:16px;
      background:rgba(255,255,255,0.10);
      border:1px solid rgba(255,255,255,0.14);
    }
    .hero-panel h3 {
      margin:0;
      color:white;
    }
    .hero-stat {
      display:grid;
      grid-template-columns:1fr auto;
      gap:12px;
      border-top:1px solid rgba(255,255,255,0.14);
      padding:12px 0;
    }
    .hero-stat:first-of-type {
      border-top:0;
      padding-top:0;
    }
    .hero-stat strong {
      font-size:14px;
      color:white;
    }
    .hero-stat span {
      font-size:22px;
      font-weight:900;
      color:white;
    }
    .section {
      background:var(--panel);
      border-radius:24px;
      border:1px solid rgba(16,40,79,0.08);
      box-shadow:0 18px 36px rgba(16,40,79,0.06);
      padding:24px;
    }
    .section-head {
      display:flex;
      justify-content:space-between;
      align-items:flex-end;
      gap:16px;
      margin-bottom:16px;
    }
    .section-head h2 {
      margin:0;
      font-size:26px;
      line-height:1.12;
      color:var(--navy);
    }
    .section-head p {
      margin:6px 0 0;
      color:var(--slate);
      font-size:14px;
      line-height:1.5;
    }
    .summary-grid {
      grid-template-columns:repeat(4, minmax(0, 1fr));
    }
    .kpi-grid {
      grid-template-columns:repeat(6, minmax(0, 1fr));
    }
    .decision-grid {
      grid-template-columns:repeat(3, minmax(0, 1fr));
    }
    .summary-card, .kpi-card, .chart-card, .trust-card {
      border:1px solid rgba(16,40,79,0.08);
      border-radius:18px;
      padding:16px;
      background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,248,253,0.96));
    }
    .summary-card h3, .chart-card h3, .trust-card h3 {
      margin:0;
      font-size:18px;
      color:var(--navy);
    }
    .summary-card p, .trust-card p, .chart-card p {
      margin:8px 0 0;
      color:var(--slate);
      font-size:13px;
      line-height:1.55;
    }
    .summary-value {
      margin-top:10px;
      font-size:20px;
      font-weight:700;
      color:var(--navy);
    }
    .num {
      width:30px;
      height:30px;
      border-radius:999px;
      background:var(--navy);
      color:white;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      font-weight:900;
      margin-bottom:12px;
    }
    .kpi-top {
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:flex-start;
      margin-bottom:10px;
    }
    .kpi-value {
      font-size:30px;
      line-height:1.06;
      font-weight:700;
      color:var(--navy);
      margin-bottom:6px;
    }
    .kpi-target, .kpi-note {
      margin:0;
      font-size:12px;
      line-height:1.45;
      color:var(--slate);
    }
    .status-pill {
      display:inline-flex;
      align-items:center;
      padding:4px 9px;
      border-radius:999px;
      background:var(--blue-soft);
      font-size:10px;
      font-weight:700;
      letter-spacing:0.06em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    .badge {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:5px 10px;
      border-radius:999px;
      font-size:10px;
      font-weight:900;
      letter-spacing:0.06em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    .critical {
      background:rgba(255,227,227,1);
      color:var(--red);
      border:1px solid rgba(183,28,28,0.25);
    }
    .watch {
      background:rgba(255,242,207,1);
      color:var(--amber);
      border:1px solid rgba(185,120,0,0.25);
    }
    .healthy {
      background:rgba(223,247,239,1);
      color:var(--green);
      border:1px solid rgba(0,122,96,0.25);
    }
    .neutral {
      background:rgba(234,241,255,1);
      color:var(--navy);
      border:1px solid rgba(43,103,208,0.16);
    }
    .alert {
      margin-top:16px;
      display:grid;
      grid-template-columns:auto 1fr;
      gap:14px;
      padding:18px 20px;
      border-radius:22px;
      border:1px solid rgba(183,28,28,0.25);
      background:linear-gradient(90deg, rgba(255,227,227,1), #fff 72%);
      color:var(--navy);
      font-size:14px;
      line-height:1.55;
    }
    .alert.watch-bg {
      border-color:rgba(185,120,0,0.25);
      background:linear-gradient(90deg, rgba(255,242,207,1), #fff 72%);
    }
    .alert.blue-bg {
      border-color:rgba(43,103,208,0.22);
      background:linear-gradient(90deg, rgba(234,241,255,1), #fff 72%);
    }
    .chart-grid {
      grid-template-columns:repeat(12, minmax(0, 1fr));
    }
    .span-8 { grid-column:span 8; }
    .span-6 { grid-column:span 6; }
    .span-4 { grid-column:span 4; }
    .span-12 { grid-column:span 12; }
    .chart-svg { width:100%; height:auto; display:block; margin-top:10px; }
    .legend {
      display:flex;
      flex-wrap:wrap;
      gap:14px;
      margin-top:12px;
      font-size:12px;
      color:var(--slate);
    }
    .legend span::before {
      content:"";
      width:10px;
      height:10px;
      display:inline-block;
      margin-right:6px;
      border-radius:99px;
      vertical-align:middle;
      background:currentColor;
    }
    .intel-grid {
      grid-template-columns:repeat(4, minmax(0, 1fr));
    }
    .progress-row {
      display:grid;
      gap:6px;
      margin-bottom:12px;
    }
    .progress-top {
      display:flex;
      justify-content:space-between;
      gap:10px;
      align-items:center;
    }
    .progress-top strong { font-size:14px; color:var(--navy); }
    .progress-top span, .progress-meta { font-size:12px; color:var(--slate); }
    .progress-track {
      height:10px;
      border-radius:999px;
      background:rgba(16,40,79,0.08);
      overflow:hidden;
    }
    .progress-fill {
      display:block;
      height:100%;
      border-radius:inherit;
      background:linear-gradient(90deg, rgba(43,103,208,0.94), rgba(96,151,243,0.84));
    }
    .table-wrap {
      overflow:auto;
      border:1px solid rgba(16,40,79,0.08);
      border-radius:18px;
    }
    table {
      width:100%;
      border-collapse:collapse;
      min-width:900px;
    }
    th, td {
      text-align:left;
      padding:12px 14px;
      border-bottom:1px solid rgba(16,40,79,0.08);
      font-size:13px;
      vertical-align:top;
    }
    th {
      font-size:11px;
      letter-spacing:0.08em;
      text-transform:uppercase;
      color:var(--slate);
      background:rgba(244,247,252,0.92);
    }
    tr:last-child td { border-bottom:none; }
    .empty-chart {
      padding:24px;
      border:1px dashed rgba(16,40,79,0.16);
      border-radius:16px;
      text-align:center;
      color:var(--slate);
      font-size:13px;
    }
    .talk-track {
      border-left:5px solid var(--blue);
      padding:16px 18px;
      border-radius:18px;
      background:#f7faff;
      color:var(--navy);
      font-size:15px;
      line-height:1.62;
      font-weight:650;
      margin-top:16px;
    }
    .talk-track blockquote {
      margin:0;
    }
    .trust-grid {
      grid-template-columns:repeat(2, minmax(0, 1fr));
    }
    .trust-list, ul {
      margin:10px 0 0;
      padding-left:18px;
      color:var(--slate);
      font-size:13px;
      line-height:1.55;
    }
    .source-grid {
      display:grid;
      gap:10px;
      margin-top:10px;
    }
    .source-row {
      display:grid;
      grid-template-columns:2fr 1fr 100px;
      gap:12px;
      align-items:center;
      padding:10px 12px;
      border-radius:14px;
      background:rgba(244,247,252,0.92);
      border:1px solid rgba(16,40,79,0.06);
    }
    .source-row strong {
      color:var(--navy);
      font-size:13px;
    }
    .source-row span {
      color:var(--slate);
      font-size:12px;
    }
    .footer-note {
      text-align:center;
      font-size:12px;
      color:var(--slate);
      padding-bottom:12px;
    }
    @media (max-width: 1100px) {
      .hero-split, .summary-grid, .decision-grid, .trust-grid, .intel-grid, .kpi-grid {
        grid-template-columns:repeat(2, minmax(0, 1fr));
      }
      .span-8, .span-6, .span-4, .span-12 {
        grid-column:span 12;
      }
    }
    @media (max-width: 720px) {
      body { padding:18px; }
      .section-head {
        flex-direction:column;
        align-items:flex-start;
      }
      .hero-split, .summary-grid, .decision-grid, .trust-grid, .intel-grid, .kpi-grid {
        grid-template-columns:1fr;
      }
      .source-row {
        grid-template-columns:1fr;
      }
    }
    @media print {
      body { padding:0; background:white; }
      .report { max-width:none; }
      .section, .hero { box-shadow:none; }
    }
  </style>
</head>
<body>
  <main class="report">
    <section class="hero">
      <div class="hero-split">
        <div>
          <p class="eyebrow">Revenue Cycle Management</p>
          <h1>${escapeHtml(executiveCover.title ?? "From Cash Risk to Recovery Execution")}</h1>
          <p>${escapeHtml(executiveCover.subtitle ?? "Revenue Cycle board pack unavailable.")}</p>
          <p>${escapeHtml(executiveCover.message ?? "Board-pack narrative unavailable.")}</p>
          <div class="pill-row">
            <span class="pill">Generated ${escapeHtml(generatedAt)}</span>
            <span class="pill">Currency ${escapeHtml(currencyCode)}</span>
            <span class="pill">${escapeHtml(requestLabel || "Default live scope")}</span>
            <span class="pill">Enhanced narrative view</span>
          </div>
        </div>
        <aside class="hero-panel">
          <h3>Board-level message</h3>
          ${(executiveCover.hero_cards ?? [])
            .map(
              (card) => `
            <div class="hero-stat">
              <strong>${escapeHtml(card.label ?? "Metric")}</strong>
              <span>${escapeHtml(card.formatted_value ?? "Metric unavailable")}</span>
            </div>
          `,
            )
            .join("")}
        </aside>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Executive Storyline</p>
          <h2>${escapeHtml(storyline.title ?? "The business problem is cash conversion, not dashboard reporting")}</h2>
          <p>${escapeHtml(storyline.subtitle ?? "The board pack moves from exposure to action and into governed decision making.")}</p>
        </div>
      </div>
      <div class="summary-grid">
        ${(storyline.cards ?? [])
          .map(
            (card, index) => `
          <article class="summary-card">
            <span class="num">${index + 1}</span>
            <h3>${escapeHtml(card.title ?? "Story card")}</h3>
            ${
              card.metric_value
                ? `<div class="summary-value">${escapeHtml(card.metric_value)}</div>`
                : ""
            }
            ${
              card.metric_label
                ? `<p>${escapeHtml(card.metric_label)}</p>`
                : ""
            }
            <p>${escapeHtml(card.message ?? "")}</p>
          </article>
        `,
          )
          .join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Screen 1 - CFO Position</p>
          <h2>Cash Command - where is hospital revenue stuck?</h2>
          <p>${escapeHtml(cashSectionSubtitle)}</p>
        </div>
        <span class="badge ${cashSeverity}">${escapeHtml(statusLabel(cash.headline?.severity))}</span>
      </div>
      <div class="alert">
        <span class="badge ${cashSeverity}">Main message</span>
        <div><strong>Cash Command diagnoses the financial problem.</strong> ${escapeHtml(cashAlertMessage.replace("Cash Command diagnoses the financial problem. ", ""))}</div>
      </div>
      <div class="kpi-grid">
        ${buildKpiCards(
          cashKpis.map((item: CashCommandKpi) => ({
            label: item.label,
            formatted_value:
              item.unit === "currency"
                ? formatSarCompact(item.value, currencyCode)
                : item.unit === "percent"
                  ? formatPercent(item.value)
                  : item.unit === "days"
                    ? formatDays(item.value)
                    : formatCount(item.value),
            interpretation: item.interpretation,
            target_label: item.target_label,
            status: item.status,
          })),
        )}
      </div>
      <div class="chart-grid" style="margin-top:16px">
        <article class="chart-card span-8">
          <p class="eyebrow" style="color:var(--slate)">Collections vs Charges</p>
          <h3>Monthly charges, posted cash, and expected collections</h3>
          <p>The financial story starts with the gap between what was billed, what posted, and what is still expected to arrive.</p>
          ${svgLineChart(cash.charts?.cash_vs_charges ?? [], [
            { key: "charges", color: "rgba(16,40,79,0.72)" },
            { key: "cash_collected", color: "rgba(43,103,208,0.96)" },
            { key: "expected_collections", color: "rgba(0,122,96,0.92)", dashed: true },
          ])}
          <div class="legend">
            <span style="color:rgba(16,40,79,0.72)">Charges</span>
            <span style="color:rgba(43,103,208,0.96)">Cash collected</span>
            <span style="color:rgba(0,122,96,0.92)">Expected collections</span>
          </div>
        </article>
        <article class="chart-card span-4">
          <p class="eyebrow" style="color:var(--slate)">Aging Buckets</p>
          <h3>Where unpaid balances are getting older</h3>
          <p>Average payment days are ${escapeHtml(formatDays(arDaysKpi?.value))} and rejected claim rate is ${escapeHtml(formatPercent(denialRateKpi?.value))}.</p>
          ${svgBarChart(cash.charts?.ar_aging_buckets ?? [], "value", (row) => agingColor(row.risk_band), 420, 220)}
        </article>
        <article class="chart-card span-6">
          <p class="eyebrow" style="color:var(--slate)">Rejected Claims and Recovery Pipeline</p>
          <h3>Rejected claim value versus expected recovery</h3>
          <p>Collection rate is ${escapeHtml(formatPercent(collectionRateKpi?.value))}, so converting rejected claims into recovery matters immediately.</p>
          ${svgBarChart(cash.charts?.denial_recovery_pipeline ?? [], "denied_value", () => "rgba(183,28,28,0.86)", 560, 220)}
        </article>
        <article class="chart-card span-6">
          <p class="eyebrow" style="color:var(--slate)">Revenue Risk Concentration</p>
          <h3>Where financial exposure is concentrated</h3>
          <div>
            ${(cash.risk_concentration ?? [])
              .map(
                (row) => `
              <div class="progress-row">
                <div class="progress-top">
                  <strong>${escapeHtml(row.label)}</strong>
                  <span>${escapeHtml(formatSarCompact(row.amount, currencyCode))}</span>
                </div>
                <div class="progress-meta">${escapeHtml(`${formatCount(row.claims)} claims${row.note ? ` | ${row.note}` : ""}`)}</div>
                <div class="progress-track"><span class="progress-fill" style="width:${Math.max(10, Math.round(Number(row.share_pct ?? 0)))}%"></span></div>
              </div>
            `,
              )
              .join("") || `<div class="empty-chart">No risk concentration data available.</div>`}
          </div>
        </article>
      </div>
      <div class="talk-track">
        <blockquote>Demo script: "${escapeHtml(cashTalkTrack)}"</blockquote>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Screen 2 - Recovery Execution</p>
          <h2>Recovery Queue - what should the team work first?</h2>
          <p>${escapeHtml(recoverySectionSubtitle)}</p>
        </div>
        <span class="badge ${queueSeverity}">${escapeHtml(statusLabel(queue.headline?.severity))}</span>
      </div>
      <div class="alert watch-bg">
        <span class="badge ${queueSeverity}">Main message</span>
        <div><strong>The recovery opportunity is real, and execution pressure is building this week.</strong> ${escapeHtml(recoveryAlertStrip)}</div>
      </div>
      <div class="kpi-grid" style="margin-top:16px">
        ${buildKpiCards(queueKpis)}
      </div>
      <div class="intel-grid" style="margin-top:16px">
        <article class="chart-card">
          <p class="eyebrow" style="color:var(--slate)">Recovery Mix by Issue</p>
          <h3>Which issue types hold the most value</h3>
          ${progressList(issueMix, "recoverable_value", currencyCode)}
        </article>
        <article class="chart-card">
          <p class="eyebrow" style="color:var(--slate)">Recovery Value by Insurer</p>
          <h3>Where expected recovery is concentrated</h3>
          ${progressList(payerRecovery, "expected_recovery", currencyCode)}
        </article>
        <article class="chart-card">
          <p class="eyebrow" style="color:var(--slate)">Workload by Owner</p>
          <h3>Effort concentration by team</h3>
          ${progressList(ownerWorkload, "effort_hours", currencyCode)}
        </article>
        <article class="chart-card">
          <p class="eyebrow" style="color:var(--slate)">Due Window / SLA Risk</p>
          <h3>Operational urgency mix</h3>
          ${progressList(
            dueWindow.map((row) => ({
              label: row.label,
              count: row.count,
              recoverable_value: row.recoverable_value,
              expected_recovery: row.expected_recovery,
              formatted_expected_recovery: row.formatted_expected_recovery,
              formatted_recoverable_value: row.formatted_value,
            })),
            "recoverable_value",
            currencyCode,
          )}
        </article>
      </div>
      <div class="chart-card span-12" style="margin-top:16px">
        <div class="section-head" style="margin-bottom:10px">
          <div>
            <p class="eyebrow" style="color:var(--slate)">Ranked Action Table</p>
            <h2 style="font-size:22px">Top queue items to work first</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Claim</th>
                <th>Insurer</th>
                <th>Issue</th>
                <th>Priority</th>
                <th>Recoverable</th>
                <th>Expected</th>
                <th>Effort</th>
                <th>Score</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Deadline Risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                topActions.length === 0
                  ? `<tr><td colspan="12">No live recovery work items are available for the selected scope.</td></tr>`
                  : topActions
                      .map(
                        (item) => `
                    <tr>
                      <td>${escapeHtml(item.claim_ref ?? "-")}</td>
                      <td>${escapeHtml(item.payer_label ?? item.payer ?? "-")}</td>
                      <td>${escapeHtml(item.issue_label ?? item.issue_type ?? "-")}</td>
                      <td>${escapeHtml(item.priority ?? "-")}</td>
                      <td>${escapeHtml(item.formatted_recoverable_value ?? formatSarCompact(item.recoverable_value, currencyCode))}</td>
                      <td>${escapeHtml(item.formatted_expected_recovery ?? formatSarCompact(item.expected_recovery, currencyCode))}</td>
                      <td>${escapeHtml(item.formatted_effort_hours ?? item.formatted_effort ?? formatHours(item.effort_hours))}</td>
                      <td>${escapeHtml(item.formatted_priority_score ?? "-")}</td>
                      <td>${escapeHtml(item.owner_label ?? item.owner ?? "-")}</td>
                      <td>${escapeHtml(shortDate(item.due_date))}</td>
                      <td>${escapeHtml(item.sla_risk ?? "-")}</td>
                      <td>${escapeHtml(item.status_label ?? item.status ?? "-")}</td>
                    </tr>
                  `,
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
      <div class="talk-track">
        <blockquote>Demo script: "${escapeHtml(recoveryTalkTrack)}"</blockquote>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Product Maturity Layer</p>
          <h2>${escapeHtml(decisionLayer.title ?? "Decision Queue - the next layer after execution ranking")}</h2>
          <p>${escapeHtml(decisionLayer.subtitle ?? decisionLayer.message ?? "Decision workflow status unavailable.")}</p>
        </div>
        <span class="badge ${decisionSeverity}">${escapeHtml(decisionLayer.workflow_configured ? statusLabel(decisionPayload.headline?.severity) : "Next build")}</span>
      </div>
      <div class="kpi-grid">
        ${buildKpiCards(decisionKpis)}
      </div>
      <div class="decision-grid" style="margin-top:16px">
        ${(decisionLayer.cards ?? [])
          .map(
            (card) => `
          <article class="summary-card">
            <h3>${escapeHtml(card.title ?? "Decision stage")}</h3>
            <p>${escapeHtml(card.message ?? "No decision-stage message available.")}</p>
          </article>
        `,
          )
          .join("")}
      </div>
      <div class="alert blue-bg">
        <span class="badge neutral">Positioning</span>
        <div><strong>Demo this release as cash recovery execution.</strong> Position the decision queue as the next release: governed intervention, approval, and outcome measurement.</div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Board Talk Track</p>
          <h2>One-minute executive narrative</h2>
          <p>This script is generated from the same live board-pack payload used for the sections above.</p>
        </div>
      </div>
      <div class="talk-track">
        <blockquote>${escapeHtml(boardPack.board_talk_track ?? "Board talk track unavailable.")}</blockquote>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Data Trust</p>
          <h2>Source coverage, freshness, and metric conditions</h2>
          <p>Data-trust details appear only here so the board story stays executive-first while still exposing coverage, freshness, definitions, and known limitations.</p>
        </div>
      </div>
      <div class="trust-grid">
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Generation Scope</p>
          <h3>What this report used</h3>
          <p>Generated ${escapeHtml(generatedAt)} | Currency ${escapeHtml(currencyCode)} | ${escapeHtml(requestLabel || "Default live scope")}</p>
          <ul class="trust-list">
            ${
              filterEntries.length === 0
                ? `<li>No scope filters were applied.</li>`
                : filterEntries
                    .map(
                      ([key, value]) =>
                        `<li><strong>${escapeHtml(key)}</strong>: ${escapeHtml(Array.isArray(value) ? value.join(", ") : String(value))}</li>`,
                    )
                    .join("")
            }
          </ul>
        </article>
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Source Freshness</p>
          <h3>Section freshness signals</h3>
          <ul class="trust-list">
            ${
              sourceFreshness.length === 0
                ? `<li>No freshness signals were returned.</li>`
                : sourceFreshness
                    .map(
                      (item) =>
                        `<li><strong>${escapeHtml(item.label)}</strong>: ${escapeHtml(item.status ?? "unknown")}</li>`,
                    )
                    .join("")
            }
          </ul>
        </article>
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Source Tables and Views</p>
          <h3>Technical lineage at report time</h3>
          <div class="source-grid">
            ${
              sourceTables.length === 0
                ? `<div class="empty-chart">No source-table lineage was returned.</div>`
                : sourceTables
                    .map(
                      (source) => `
                    <div class="source-row">
                      <strong>${escapeHtml(source.table)}</strong>
                      <span>${escapeHtml(source.role ?? "role unavailable")}</span>
                      <span>${escapeHtml(source.loaded === false ? "not loaded" : "loaded")}</span>
                    </div>
                  `,
                    )
                    .join("")
            }
          </div>
        </article>
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Metric Definitions</p>
          <h3>Live calculation rules</h3>
          <ul class="trust-list">
            ${
              metricDefinitions.length === 0
                ? `<li>No metric definitions were returned.</li>`
                : metricDefinitions
                    .map(
                      (item) =>
                        `<li><strong>${escapeHtml(item.label)}</strong>: ${escapeHtml(item.definition)}</li>`,
                    )
                    .join("")
            }
          </ul>
        </article>
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Unavailable or Missing Metrics</p>
          <h3>Safe fallbacks only</h3>
          <ul class="trust-list">
            ${
              [...new Set([...missingMetrics, ...unavailableFields])].length === 0
                ? `<li>All requested metrics were populated for this scope.</li>`
                : [...new Set([...missingMetrics, ...unavailableFields])]
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join("")
            }
          </ul>
        </article>
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Warnings and Limitations</p>
          <h3>Known caveats</h3>
          <ul class="trust-list">
            ${
              [...warnings, ...limitations].length === 0
                ? `<li>No warnings or limitations were returned.</li>`
                : [...warnings, ...limitations]
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join("")
            }
          </ul>
        </article>
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Scoring Logic</p>
          <h3>How queue ranking is explained</h3>
          <ul class="trust-list">
            ${
              scoringLogic.length === 0
                ? `<li>No scoring logic notes were returned.</li>`
                : scoringLogic.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
            }
          </ul>
        </article>
      </div>
    </section>

    <p class="footer-note">OpenCare Revenue Cycle Management board pack · Generated ${escapeHtml(generatedAt)}</p>
  </main>
</body>
</html>`;
}
