import type {
  CashCommandKpi,
  CashCommandPayload,
  RecoveryQueueKpi,
  RecoveryQueuePayload,
  RecoveryQueueRollup,
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

function buildKpiCards(kpis: Array<{ label?: string | null; formatted_value?: string | null; interpretation?: string | null; target_label?: string | null; status?: string | null }>) {
  return kpis
    .map((kpi) => `
      <article class="kpi-card">
        <div class="kpi-top">
          <p class="eyebrow">${escapeHtml(kpi.label ?? "KPI")}</p>
          <span class="status-pill">${escapeHtml(kpi.status ?? "unknown")}</span>
        </div>
        <div class="kpi-value">${escapeHtml(kpi.formatted_value ?? "-")}</div>
        <p class="kpi-target">${escapeHtml(kpi.target_label ?? "")}</p>
        <p class="kpi-note">${escapeHtml(kpi.interpretation ?? "")}</p>
      </article>
    `)
    .join("");
}

export function buildRevenueCycleBoardPack({
  cash,
  queue,
  requestLabel,
}: {
  cash: CashCommandPayload;
  queue: RecoveryQueuePayload;
  requestLabel?: string;
}) {
  const narrative = buildNarrative(cash, queue);
  const currencyCode = queue.currency ?? cash.currency ?? "SAR";
  const cashKpis = cash.kpis ?? [];
  const queueKpis = queue.kpis ?? [];
  const topActions = (queue.queue_items ?? queue.items ?? []).slice(0, 12);
  const issueMix = queue.intelligence?.issue_mix ?? [];
  const payerRecovery = queue.intelligence?.payer_recovery ?? [];
  const ownerWorkload = queue.intelligence?.owner_workload ?? [];
  const dueWindow = queue.intelligence?.due_window ?? [];
  const generatedAt = timestamp(queue.generated_at ?? cash.as_of ?? new Date().toISOString());
  const trustSources = [
    ...(cash.data_quality?.source_tables ?? []).map((source) => source.table),
    ...((queue.data_quality?.source_tables ?? []).map((source) => source.table)),
  ];
  const uniqueSources = [...new Set(trustSources)];
  const collectionRateKpi = kpiByKey(cashKpis, "collection_rate");
  const denialRateKpi = kpiByKey(cashKpis, "denial_rate");
  const arDaysKpi = kpiByKey(cashKpis, "ar_days");

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
      --line:#dbe3f2;
      --panel:#ffffff;
      --bg:#f4f7fb;
    }
    * { box-sizing:border-box; }
    body {
      margin:0;
      font-family: "Segoe UI", Arial, sans-serif;
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
      padding:28px 30px;
      border-radius:26px;
      background:
        radial-gradient(circle at top right, rgba(147,187,255,0.18), transparent 34%),
        linear-gradient(135deg, rgba(13,39,82,0.98), rgba(31,91,177,0.92));
      color:white;
      box-shadow:0 24px 48px rgba(16,40,79,0.16);
    }
    .hero-top {
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:16px;
      margin-bottom:18px;
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
      font-size:34px;
      line-height:1.08;
    }
    .hero p {
      margin:10px 0 0;
      font-size:15px;
      line-height:1.6;
      max-width:880px;
      color:rgba(255,255,255,0.88);
    }
    .pill-row, .meta-row {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
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
    .summary-grid, .kpi-grid, .chart-grid, .intel-grid, .trust-grid {
      display:grid;
      gap:14px;
    }
    .summary-grid {
      grid-template-columns:repeat(3, minmax(0, 1fr));
    }
    .summary-card, .kpi-card, .chart-card, .trust-card {
      border:1px solid rgba(16,40,79,0.08);
      border-radius:18px;
      padding:16px;
      background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,248,253,0.96));
    }
    .summary-card h3, .chart-card h3 {
      margin:0;
      font-size:18px;
      color:var(--navy);
    }
    .summary-card p, .trust-card p {
      margin:8px 0 0;
      color:var(--slate);
      font-size:13px;
      line-height:1.55;
    }
    .kpi-grid {
      grid-template-columns:repeat(6, minmax(0, 1fr));
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
      color:var(--navy);
      font-size:10px;
      font-weight:700;
      letter-spacing:0.06em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    .chart-grid {
      grid-template-columns:repeat(12, minmax(0, 1fr));
    }
    .span-8 { grid-column:span 8; }
    .span-6 { grid-column:span 6; }
    .span-4 { grid-column:span 4; }
    .span-12 { grid-column:span 12; }
    .chart-card p {
      margin:4px 0 0;
      font-size:13px;
      color:var(--slate);
    }
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
    .progress-row { display:grid; gap:6px; margin-bottom:12px; }
    .progress-top, .table-head {
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
    .trust-grid {
      grid-template-columns:repeat(2, minmax(0, 1fr));
    }
    ul {
      margin:10px 0 0;
      padding-left:18px;
      color:var(--slate);
      font-size:13px;
      line-height:1.55;
    }
    .footer-note {
      text-align:center;
      font-size:12px;
      color:var(--slate);
      padding-bottom:12px;
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
      <div class="hero-top">
        <div>
          <p class="eyebrow">Revenue Cycle Management</p>
          <h1>Cash Overview to Recovery Work Queue Board Pack</h1>
          <p>${escapeHtml(narrative.summary)}</p>
        </div>
        <div class="pill-row">
          <span class="pill">Generated ${escapeHtml(generatedAt)}</span>
          <span class="pill">Currency ${escapeHtml(currencyCode)}</span>
          <span class="pill">${escapeHtml(requestLabel || "Default executive scope")}</span>
        </div>
      </div>
      <div class="summary-grid">
        <article class="summary-card">
          <p class="eyebrow">Cash Risk</p>
          <h3>${escapeHtml(formatSarCompact(cash.cash_at_risk, currencyCode))}</h3>
          <p>${escapeHtml(narrative.cashStory)}</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Execution Queue</p>
          <h3>${escapeHtml(queueKpiById(queue.kpis, "recoverable_queue_value")?.formatted_value ?? "-")}</h3>
          <p>${escapeHtml(narrative.queueStory)}</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Operating Translation</p>
          <h3>${escapeHtml(queueKpiById(queue.kpis, "expected_recovery")?.formatted_value ?? "-")}</h3>
          <p>${escapeHtml(narrative.execution)}</p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Screen 1</p>
          <h2>Cash Overview</h2>
          <p>${escapeHtml(cash.headline?.message ?? "Cash overview narrative unavailable.")}</p>
        </div>
      </div>
      <div class="kpi-grid">
        ${buildKpiCards(cashKpis.map((item) => ({
          label: item.label,
          formatted_value:
            item.unit === "currency"
              ? formatSarCompact(item.value, currencyCode)
              : item.unit === "percent"
              ? `${item.value?.toFixed(1) ?? "-"}%`
              : item.unit === "days"
              ? `${Math.round(item.value ?? 0)} days`
              : formatCount(item.value),
          interpretation: item.interpretation,
          target_label: item.target_label,
          status: item.status,
        })))}
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
          <p class="eyebrow" style="color:var(--slate)">Unpaid Balance Aging</p>
          <h3>Where unpaid balances are getting older</h3>
          <p>Average payment days ${escapeHtml(arDaysKpi ? `${Math.round(arDaysKpi.value ?? 0)}d` : "-")} and rejected claim rate ${escapeHtml(denialRateKpi ? `${denialRateKpi.value?.toFixed(1) ?? "-"}%` : "-")} define the pressure posture.</p>
          ${svgBarChart(cash.charts?.ar_aging_buckets ?? [], "value", (row) => agingColor(row.risk_band), 420, 220)}
        </article>
        <article class="chart-card span-6">
          <p class="eyebrow" style="color:var(--slate)">Rejected Claims & Recovery Pipeline</p>
          <h3>Rejected claim value versus recoverable value</h3>
          <p>Collection rate ${escapeHtml(collectionRateKpi ? `${collectionRateKpi.value?.toFixed(1) ?? "-"}%` : "-")} only improves when rejected-claim value is converted into real recovery.</p>
          ${svgBarChart(cash.charts?.denial_recovery_pipeline ?? [], "denied_value", () => "rgba(183,28,28,0.86)", 560, 220)}
        </article>
        <article class="chart-card span-6">
          <p class="eyebrow" style="color:var(--slate)">Revenue Loss by Insurer</p>
          <h3>Where commercial revenue loss is concentrated</h3>
          <div>${(cash.charts?.leakage_by_payer ?? [])
            .slice(0, 5)
            .map((row) => `
              <div class="progress-row">
                <div class="progress-top">
                  <strong>${escapeHtml(String(row.payer ?? "Unknown"))}</strong>
                  <span>${escapeHtml(formatSarCompact(row.leakage_amount, currencyCode))}</span>
                </div>
                <div class="progress-meta">${escapeHtml(`${Number(row.share_pct ?? 0).toFixed(1)}% of visible leakage`)}</div>
                <div class="progress-track"><span class="progress-fill" style="width:${Math.max(10, Math.round(Number(row.share_pct ?? 0)))}%"></span></div>
              </div>
            `)
            .join("")}</div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Screen 2</p>
          <h2>Recovery Work Queue</h2>
          <p>${escapeHtml(queue.story ?? queue.headline?.message ?? "Recovery work queue narrative unavailable.")}</p>
        </div>
      </div>
      <div class="kpi-grid">
        ${buildKpiCards(queueKpis)}
      </div>
      <div class="intel-grid" style="margin-top:16px">
        <article class="chart-card">
          <p class="eyebrow" style="color:var(--slate)">Issue Mix</p>
          <h3>Recovery value by issue type</h3>
          ${progressList(issueMix, "recoverable_value", currencyCode)}
        </article>
        <article class="chart-card">
          <p class="eyebrow" style="color:var(--slate)">Insurer Recovery</p>
          <h3>Expected recovery by insurer</h3>
          ${progressList(payerRecovery, "expected_recovery", currencyCode)}
        </article>
        <article class="chart-card">
          <p class="eyebrow" style="color:var(--slate)">Owner Workload</p>
          <h3>Effort concentration by owner</h3>
          ${progressList(ownerWorkload, "effort_hours", currencyCode)}
        </article>
        <article class="chart-card">
          <p class="eyebrow" style="color:var(--slate)">Due Window</p>
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
            <p class="eyebrow" style="color:var(--slate)">Top Actions</p>
            <h2 style="font-size:22px">Ranked queue items to work first</h2>
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
              ${topActions
                .map((item) => `
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
                `)
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow" style="color:var(--slate)">Data Trust</p>
          <h2>Source coverage and reporting conditions</h2>
          <p>This board pack is generated from the same live payloads as the RCM screens, so the narrative, KPI cards, queue logic, and trust conditions stay aligned.</p>
        </div>
      </div>
      <div class="trust-grid">
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Sources used</p>
          <ul>${uniqueSources.map((source) => `<li>${escapeHtml(source)}</li>`).join("")}</ul>
        </article>
        <article class="trust-card">
          <p class="eyebrow" style="color:var(--slate)">Queue limitations</p>
          <ul>${(queue.data_quality?.limitations ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
      </div>
    </section>

    <p class="footer-note">OpenCare Revenue Cycle Management board pack · Generated ${escapeHtml(generatedAt)}</p>
  </main>
</body>
</html>`;
}
