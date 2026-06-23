"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RCMNavTabs } from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { EmptyView, ErrorView, LoadingView, StaleBanner } from "../shared/ViewStates";
import { useRCMFetch } from "../useRCMFetch";
import type {
  RecoveryQueueDataQuality,
  RecoveryQueueGroupedCard,
  RecoveryQueueItem,
  RecoveryQueueKpi,
  RecoveryQueuePayload,
  RecoveryQueueRollup,
} from "../types";
import { shortDate, timestamp } from "@/lib/format";
import styles from "./RecoveryQueue.module.css";

type DraftFilters = {
  issue_type: string;
  payer: string;
  owner: string;
  status: string;
  priority: string;
  due_window: string;
  min_value: string;
  search: string;
  sort_by: string;
  group_by: string;
  view: "table" | "grouped_cards";
};

const FILTER_KEYS: Array<keyof DraftFilters> = [
  "issue_type",
  "payer",
  "owner",
  "status",
  "priority",
  "due_window",
  "min_value",
  "search",
  "sort_by",
  "group_by",
  "view",
];

const DEFAULT_FILTERS: DraftFilters = {
  issue_type: "",
  payer: "",
  owner: "",
  status: "",
  priority: "",
  due_window: "",
  min_value: "",
  search: "",
  sort_by: "priority_score",
  group_by: "none",
  view: "table",
};

function formatSar(value?: number | null, digits = 0, currencyCode = "SAR") {
  if (value == null) return "-";
  return `${currencyCode} ${new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}`;
}

function formatSarCompact(value?: number | null, currencyCode = "SAR") {
  if (value == null) return "-";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${currencyCode} ${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${currencyCode} ${(value / 1_000).toFixed(1)}K`;
  return formatSar(value, 0, currencyCode);
}

function formatHours(value?: number | null) {
  if (value == null) return "-";
  return `${value.toFixed(1)}h`.replace(".0h", "h");
}

function formatDaysToDue(value?: number | null) {
  if (value == null) return "No due date";
  if (value < 0) return `${Math.abs(value)}d overdue`;
  if (value === 0) return "Due today";
  return `${value}d`;
}

function severityClass(value?: string | null) {
  switch (value) {
    case "critical":
      return `${styles.badge} ${styles.badgeCritical}`;
    case "watch":
      return `${styles.badge} ${styles.badgeWatch}`;
    case "healthy":
      return `${styles.badge} ${styles.badgeHealthy}`;
    default:
      return `${styles.badge} ${styles.badgeNeutral}`;
  }
}

function priorityClass(value?: string | null) {
  switch ((value ?? "").toLowerCase()) {
    case "critical":
      return `${styles.badge} ${styles.badgeCritical}`;
    case "high":
      return `${styles.badge} ${styles.badgeWatch}`;
    case "medium":
      return `${styles.badge} ${styles.badgeInfo}`;
    default:
      return `${styles.badge} ${styles.badgeNeutral}`;
  }
}

function dueWindowClass(value?: string | null) {
  switch (value) {
    case "Overdue":
      return `${styles.badge} ${styles.badgeCritical}`;
    case "Due Today":
    case "Due This Week":
      return `${styles.badge} ${styles.badgeWatch}`;
    case "Future":
      return `${styles.badge} ${styles.badgeHealthy}`;
    default:
      return `${styles.badge} ${styles.badgeNeutral}`;
  }
}

function statusClass(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("progress") || normalized.includes("review")) {
    return `${styles.badge} ${styles.badgeWatch}`;
  }
  if (normalized.includes("assign")) {
    return `${styles.badge} ${styles.badgeInfo}`;
  }
  if (normalized.includes("complete") || normalized.includes("close") || normalized.includes("resolve")) {
    return `${styles.badge} ${styles.badgeHealthy}`;
  }
  return `${styles.badge} ${styles.badgeNeutral}`;
}

function widthPercent(value: number, max: number) {
  if (!max) return 0;
  return Math.max(8, Math.min(100, (value / max) * 100));
}

function prettyValue(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatUnknownValue(value: unknown) {
  if (value == null) return "All";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "All";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") return value.trim() ? value : "All";
  return String(value);
}

function storyStripSeverityClass(value?: string | null) {
  switch (value) {
    case "critical":
      return styles.storyStripCritical;
    case "watch":
      return styles.storyStripWatch;
    case "healthy":
      return styles.storyStripHealthy;
    default:
      return "";
  }
}

function filterChipLabel(key: keyof DraftFilters, value: string) {
  const formatters: Partial<Record<keyof DraftFilters, (raw: string) => string>> = {
    sort_by: prettyValue,
    group_by: (raw) => (raw === "none" ? "None" : prettyValue(raw)),
    view: (raw) => (raw === "grouped_cards" ? "Grouped Cards" : "Table"),
  };
  const labels: Record<keyof DraftFilters, string> = {
    issue_type: "Issue",
    payer: "Payer",
    owner: "Owner",
    status: "Status",
    priority: "Priority",
    due_window: "Due Window",
    min_value: "Min Value",
    search: "Search",
    sort_by: "Sort",
    group_by: "Group",
    view: "View",
  };
  const formatter = formatters[key];
  return `${labels[key]}: ${formatter ? formatter(value) : value}`;
}

function buildScopeLabel(filters: DraftFilters) {
  const active = FILTER_KEYS.filter((key) => filters[key] && filters[key] !== DEFAULT_FILTERS[key]);
  if (active.length === 0) return "All queue items";
  return active.map((key) => filterChipLabel(key, filters[key])).join(" | ");
}

function filtersFromSearchParams(searchParams: URLSearchParams): DraftFilters {
  return {
    issue_type: searchParams.get("issue_type") ?? "",
    payer: searchParams.get("payer") ?? "",
    owner: searchParams.get("owner") ?? "",
    status: searchParams.get("status") ?? "",
    priority: searchParams.get("priority") ?? "",
    due_window: searchParams.get("due_window") ?? "",
    min_value: searchParams.get("min_value") ?? "",
    search: searchParams.get("search") ?? "",
    sort_by: searchParams.get("sort_by") ?? DEFAULT_FILTERS.sort_by,
    group_by: searchParams.get("group_by") ?? DEFAULT_FILTERS.group_by,
    view: searchParams.get("view") === "grouped_cards" ? "grouped_cards" : "table",
  };
}

function downloadQueueCsv(items: RecoveryQueueItem[]) {
  const header = [
    "Claim",
    "Payer",
    "Recovery Issue",
    "Priority",
    "Recoverable Value",
    "Expected Recovery",
    "Effort",
    "Priority Score",
    "Owner",
    "Due Date",
    "SLA Risk",
    "Status",
    "Next Action",
  ];
  const rows = items.map((item) => [
    item.claim_ref ?? "",
    item.payer_label ?? "",
    item.issue_label ?? "",
    item.priority ?? "",
    item.formatted_recoverable_value ?? "",
    item.formatted_expected_recovery ?? "",
    item.formatted_effort_hours ?? "",
    item.formatted_priority_score ?? "",
    item.owner_label ?? "",
    item.due_date ?? "",
    item.sla_risk ?? "",
    item.status_label ?? "",
    item.next_action ?? "",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "recovery-queue.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.controlField}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{`All ${label.toLowerCase()}`}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function KpiCard({ item }: { item: RecoveryQueueKpi }) {
  return (
    <article className={styles.kpiCard}>
      <div className={styles.kpiHeader}>
        <p className={styles.kpiLabel}>{item.label}</p>
        <span className={severityClass(item.status)}>{item.status ?? "unknown"}</span>
      </div>
      <p className={styles.kpiValue}>{item.formatted_value ?? "-"}</p>
      <p className={styles.kpiBenchmark}>{item.benchmark ?? item.target_label ?? "No benchmark configured"}</p>
      <p className={styles.kpiInterpretation}>{item.interpretation ?? "No interpretation available."}</p>
    </article>
  );
}

function RollupList({
  rows,
  kind,
  currencyCode,
}: {
  rows: RecoveryQueueRollup[];
  kind: "issue" | "payer" | "owner";
  currencyCode: string;
}) {
  const maxValue = Math.max(
    0,
    ...rows.map((row) =>
      kind === "owner" ? Number(row.effort_hours ?? 0) : Number(row.expected_recovery ?? 0),
    ),
  );

  return (
    <div className={styles.rollupList}>
      {rows.map((row) => {
        const metricValue =
          kind === "owner" ? Number(row.effort_hours ?? 0) : Number(row.expected_recovery ?? 0);
        return (
          <div className={styles.rollupRow} key={row.label}>
            <div className={styles.rollupTop}>
              <strong>{row.label}</strong>
              <span>
                {kind === "owner"
                  ? row.formatted_effort_hours ?? formatHours(row.effort_hours)
                  : row.formatted_expected_recovery ?? formatSarCompact(row.expected_recovery, currencyCode)}
              </span>
            </div>
            <div className={styles.rollupMeta}>
              <span>{row.count ?? 0} items</span>
              {kind !== "owner" && (
                <span>{row.formatted_recoverable_value ?? row.formatted_value ?? formatSarCompact(row.recoverable_value, currencyCode)} recoverable</span>
              )}
              {kind === "owner" && (
                <span>{row.formatted_expected_recovery ?? formatSarCompact(row.expected_recovery, currencyCode)} expected</span>
              )}
            </div>
            <div className={styles.rollupTrack}>
              <span className={styles.rollupFill} style={{ width: `${widthPercent(metricValue, maxValue)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DueWindowPanel({
  rows,
  currencyCode,
}: {
  rows: Array<{ label: string; count?: number | null; recoverable_value?: number | null; formatted_value?: string | null; expected_recovery?: number | null; formatted_expected_recovery?: string | null }>;
  currencyCode: string;
}) {
  const maxCount = Math.max(0, ...rows.map((row) => Number(row.count ?? 0)));
  return (
    <div className={styles.rollupList}>
      {rows.map((row) => (
        <div className={styles.rollupRow} key={row.label}>
          <div className={styles.rollupTop}>
            <strong>{row.label}</strong>
            <span>{row.count ?? 0}</span>
          </div>
          <div className={styles.rollupMeta}>
            <span>{row.formatted_expected_recovery ?? row.formatted_value ?? formatSarCompact(row.expected_recovery ?? row.recoverable_value, currencyCode)}</span>
          </div>
          <div className={styles.rollupTrack}>
            <span className={styles.rollupFill} style={{ width: `${widthPercent(Number(row.count ?? 0), maxCount)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView({
  items,
  onSelect,
}: {
  items: RecoveryQueueItem[];
  onSelect: (item: RecoveryQueueItem) => void;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Claim</th>
            <th>Payer</th>
            <th>Recovery Issue</th>
            <th>Priority</th>
            <th>Recoverable Value</th>
            <th>Expected Recovery</th>
            <th>Effort</th>
            <th>Priority Score</th>
            <th>Owner</th>
            <th>Due Date</th>
            <th>Days to Due</th>
            <th>SLA Risk</th>
            <th>Status</th>
            <th>Decision</th>
            <th>Next Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.claim_ref}-${item.opportunity_id}`} onClick={() => onSelect(item)}>
              <td>
                <button type="button" className={styles.rowLink} onClick={() => onSelect(item)}>
                  {item.claim_ref ?? "--"}
                </button>
              </td>
              <td>{item.payer_label ?? "Payer pending"}</td>
              <td>{item.issue_label ?? "Issue pending"}</td>
              <td>
                <span className={priorityClass(item.priority)}>{item.priority ?? "Routine"}</span>
              </td>
              <td>{item.formatted_recoverable_value ?? "-"}</td>
              <td>{item.formatted_expected_recovery ?? "-"}</td>
              <td>{item.formatted_effort_hours ?? item.formatted_effort ?? "-"}</td>
              <td>{item.formatted_priority_score ?? "-"}</td>
              <td>{item.owner_label ?? "Unassigned"}</td>
              <td>{item.due_date ? shortDate(item.due_date) : "No due date"}</td>
              <td>{formatDaysToDue(item.days_to_due)}</td>
              <td>
                <span className={dueWindowClass(item.sla_risk)}>{item.sla_risk ?? "No due date"}</span>
              </td>
              <td>
                <span className={statusClass(item.status_label)}>{item.status_label ?? "Open"}</span>
              </td>
              <td>
                {item.decision_id && item.linked_decision_id ? (
                  <Link
                    href={`/use-cases/revenue-cycle-management/decision-queue?decision_id=${item.linked_decision_id}`}
                    className={styles.rowLink}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {item.linked_decision_id}
                  </Link>
                ) : item.decision_required ? (
                  <span className={priorityClass(item.decision_priority)}>{item.can_promote_to_decision ? "Decision required" : "Decision linked"}</span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeNeutral}`}>Routine</span>
                )}
              </td>
              <td>{item.next_action ?? "Review work item"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupedCardsView({
  groups,
  onSelect,
}: {
  groups: RecoveryQueueGroupedCard[];
  onSelect: (claimRef?: string | null) => void;
}) {
  return (
    <div className={styles.groupGrid}>
      {groups.map((group) => (
        <article className={styles.groupCard} key={group.group_key ?? group.key}>
          <div className={styles.groupTop}>
            <div>
              <p className={styles.groupLabel}>{group.group_label ?? group.label}</p>
              <p className={styles.groupMeta}>{group.claims ?? group.count} claims</p>
            </div>
            <span className={styles.groupByPill}>{group.group_by}</span>
          </div>
          <div className={styles.groupMetrics}>
            <div>
              <span>Recoverable</span>
              <strong>{group.formatted_recoverable_value ?? group.formatted_value}</strong>
            </div>
            <div>
              <span>Expected</span>
              <strong>{group.formatted_expected_recovery}</strong>
            </div>
            <div>
              <span>Effort</span>
              <strong>{group.formatted_effort_hours}</strong>
            </div>
          </div>
          <div className={styles.groupDetails}>
            <span>{`Top payer: ${group.top_payer ?? "Pending"}`}</span>
            <span>{`Top owner: ${group.top_owner ?? "Pending"}`}</span>
            <span>{`Due pressure: ${group.due_pressure ?? "Future"}`}</span>
          </div>
          <div className={styles.groupSamples}>
            {(group.sample_items ?? []).map((sample) => (
              <button
                key={`${group.group_key}-${sample.claim_ref}`}
                type="button"
                className={styles.sampleRow}
                onClick={() => onSelect(sample.claim_ref)}
              >
                <span>{sample.claim_ref}</span>
                <span>{sample.priority}</span>
                <span>{sample.status}</span>
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function DataTrustDrawer({
  open,
  onClose,
  dataQuality,
}: {
  open: boolean;
  onClose: () => void;
  dataQuality?: RecoveryQueueDataQuality;
}) {
  if (!open) return null;
  return (
    <div className={styles.drawerScrim} onClick={onClose}>
      <aside className={styles.drawer} onClick={(event) => event.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerEyebrow}>Data Trust</p>
            <h3>Recovery Queue data contract</h3>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
        <div className={styles.drawerSection}>
          <strong>Generated</strong>
          <span>{timestamp(dataQuality?.generated_at)}</span>
        </div>
        <div className={styles.drawerSection}>
          <strong>Currency</strong>
          <span>{dataQuality?.currency ?? "SAR"}</span>
        </div>
        <div className={styles.drawerSection}>
          <strong>Sources</strong>
          <ul>
            {(dataQuality?.source_tables ?? []).map((source) => (
              <li key={source.table}>{`${source.table} - ${source.role}`}</li>
            ))}
          </ul>
        </div>
        <div className={styles.drawerSection}>
          <strong>Filters applied</strong>
          <ul>
            {Object.entries(dataQuality?.filters_applied ?? {}).length === 0 ? (
              <li>No filters applied.</li>
            ) : (
              Object.entries(dataQuality?.filters_applied ?? {}).map(([key, value]) => (
                <li key={key}>{`${prettyValue(key)}: ${formatUnknownValue(value)}`}</li>
              ))
            )}
          </ul>
        </div>
        <div className={styles.drawerSection}>
          <strong>Metric definitions</strong>
          <ul>
            {(dataQuality?.metric_definitions ?? []).length === 0 ? (
              <li>No metric definitions loaded.</li>
            ) : (
              (dataQuality?.metric_definitions ?? []).map((metric) => (
                <li key={metric.label}>{`${metric.label}: ${metric.definition}`}</li>
              ))
            )}
          </ul>
        </div>
        <div className={styles.drawerSection}>
          <strong>Missing metrics</strong>
          <ul>
            {(dataQuality?.missing_metrics ?? []).length === 0 ? (
              <li>No missing metrics reported.</li>
            ) : (
              (dataQuality?.missing_metrics ?? []).map((metric) => (
                <li key={metric.label}>{`${metric.label}: ${metric.reason}`}</li>
              ))
            )}
          </ul>
        </div>
        <div className={styles.drawerSection}>
          <strong>Warnings</strong>
          <ul>
            {(dataQuality?.warnings ?? []).length === 0 ? (
              <li>No warnings reported.</li>
            ) : (
              (dataQuality?.warnings ?? []).map((warning) => <li key={warning}>{warning}</li>)
            )}
          </ul>
        </div>
        <div className={styles.drawerSection}>
          <strong>Known limitations</strong>
          <ul>
            {(dataQuality?.limitations ?? []).length === 0 ? (
              <li>No limitations reported.</li>
            ) : (
              (dataQuality?.limitations ?? []).map((limitation) => <li key={limitation}>{limitation}</li>)
            )}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function DetailDrawer({
  item,
  onClose,
  onPromote,
}: {
  item: RecoveryQueueItem | null;
  onClose: () => void;
  onPromote: (item: RecoveryQueueItem) => void;
}) {
  if (!item) return null;
  return (
    <div className={styles.drawerScrim} onClick={onClose}>
      <aside className={styles.drawer} onClick={(event) => event.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerEyebrow}>Recovery Action Detail</p>
            <h3>{item.claim_ref ?? "Claim detail"}</h3>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
        <div className={styles.detailGrid}>
          <div>
            <span>Priority</span>
            <strong>{item.priority ?? "Routine"}</strong>
          </div>
          <div>
            <span>Priority score</span>
            <strong>{item.formatted_priority_score ?? "-"}</strong>
          </div>
          <div>
            <span>Payer</span>
            <strong>{item.payer_label ?? "Payer pending"}</strong>
          </div>
          <div>
            <span>Recovery issue</span>
            <strong>{item.issue_label ?? "Issue pending"}</strong>
          </div>
          <div>
            <span>Recoverable value</span>
            <strong>{item.formatted_recoverable_value ?? "-"}</strong>
          </div>
          <div>
            <span>Expected recovery</span>
            <strong>{item.formatted_expected_recovery ?? "-"}</strong>
          </div>
          <div>
            <span>Effort</span>
            <strong>{item.formatted_effort_hours ?? item.formatted_effort ?? "-"}</strong>
          </div>
          <div>
            <span>Due date</span>
            <strong>{item.due_date ? shortDate(item.due_date) : "No due date"}</strong>
          </div>
          <div>
            <span>SLA risk</span>
            <strong>{item.sla_risk ?? "No due date"}</strong>
          </div>
          <div>
            <span>Days to due</span>
            <strong>{formatDaysToDue(item.days_to_due)}</strong>
          </div>
          <div>
            <span>Owner</span>
            <strong>{item.owner_label ?? "Unassigned"}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{item.status_label ?? "Open"}</strong>
          </div>
          <div>
            <span>Next action</span>
            <strong>{item.next_action ?? "Review work item"}</strong>
          </div>
        </div>
        <div className={styles.drawerSection}>
          <strong>Root cause</strong>
          <p>{item.root_cause ?? "No root cause narrative loaded for this action."}</p>
        </div>
        <div className={styles.drawerSection}>
          <strong>Source evidence</strong>
          <p>{item.source_evidence ?? "No evidence summary loaded."}</p>
        </div>
        <div className={styles.drawerSection}>
          <strong>Governed decision signal</strong>
          <p>{item.decision_reason ?? "This work item currently stays in the operational backlog and does not need a governed decision."}</p>
        </div>
        <div className={styles.drawerSection}>
          <strong>Timeline</strong>
          <ul>
            {(item.timeline ?? []).length === 0 ? (
              <li>No timeline events loaded.</li>
            ) : (
              (item.timeline ?? []).map((entry, index) => (
                <li key={typeof entry === "string" ? entry : `${entry.label ?? "timeline"}-${entry.value ?? index}`}>
                  {typeof entry === "string" ? entry : `${entry.label ?? "Event"}: ${entry.value ?? "Unavailable"}`}
                </li>
              ))
            )}
          </ul>
        </div>
        <div className={styles.drawerActions}>
          {item.decision_id && item.linked_decision_id ? (
            <Link href={`/use-cases/revenue-cycle-management/decision-queue?decision_id=${item.linked_decision_id}`} className={styles.primaryLink}>
              Open {item.linked_decision_id}
            </Link>
          ) : item.can_promote_to_decision ? (
            <button type="button" className={styles.primaryButton} onClick={() => onPromote(item)}>
              Promote to Decision
            </button>
          ) : null}
          {["Start action", "Mark in progress", "Add note", "Assign owner", "Open payer control"].map((label) => (
            <button
              key={label}
              type="button"
              className={styles.disabledButton}
              disabled
              title="Action workflow not configured"
            >
              {label}
            </button>
          ))}
        </div>
        <p className={styles.drawerNote}>Action workflow not configured</p>
      </aside>
    </div>
  );
}

export function RecoveryQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedFilters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(appliedFilters);
  const [selectedItem, setSelectedItem] = useState<RecoveryQueueItem | null>(null);
  const [trustOpen, setTrustOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState("");

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  const apiParams = useMemo(() => {
    const entries = Object.entries(appliedFilters).filter(([key, value]) => {
      if (!value) return false;
      if (value === DEFAULT_FILTERS[key as keyof DraftFilters]) return false;
      return true;
    });
    return Object.fromEntries(entries);
  }, [appliedFilters]);

  const { data, loading, error, stale, refetch } =
    useRCMFetch<RecoveryQueuePayload>("recovery-queue", apiParams);

  useEffect(() => {
    if (!loading) {
      setIsApplying(false);
    }
  }, [loading]);

  const queueItems = data?.queue_items ?? data?.items ?? [];
  const groupedQueue = data?.grouped_queue ?? [];
  const currencyCode = data?.currency ?? "SAR";
  const filterOptions = data?.filter_options ?? {};
  const scopeLabel = buildScopeLabel(appliedFilters);
  const freshnessLabel = `${data?.data_freshness?.status ?? "unknown"}`;
  const sourceCount = `${data?.data_quality?.sources_loaded ?? 0}/${data?.data_quality?.total_sources ?? 0}`;
  const reportHref = useMemo(() => {
    const query = searchParams.toString();
    return query ? `/api/v1/revenue-cycle/board-pack?${query}` : "/api/v1/revenue-cycle/board-pack";
  }, [searchParams]);

  const selectedFromGroup = (claimRef?: string | null) => {
    const matched = queueItems.find((item) => item.claim_ref === claimRef) ?? null;
    setSelectedItem(matched);
  };

  const promoteToDecision = async (item: RecoveryQueueItem) => {
    const sourceId = item.opportunity_id ?? item.claim_ref ?? item.claim_id;
    if (!sourceId) {
      setWorkflowMessage("Unable to promote this recovery item because no source id is available.");
      return;
    }
    const response = await fetch(`/api/portal/api/v1/rcm/recovery-items/${encodeURIComponent(sourceId)}/promote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ performed_by: "portal_user", performed_by_role: "rcm_supervisor" }),
    });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const payload = await response.json() as { detail?: string };
        detail = payload.detail ?? detail;
      } catch {
        // Keep fallback detail.
      }
      setWorkflowMessage(`Decision promotion failed: ${detail}`);
      return;
    }
    const payload = await response.json() as { decision?: { decision_id?: string | null } };
    setWorkflowMessage(`Promoted ${item.claim_ref ?? sourceId} into the governed Decision Queue.`);
    refetch();
    router.push(
      `/use-cases/revenue-cycle-management/decision-queue${payload.decision?.decision_id ? `?decision_id=${payload.decision.decision_id}` : ""}`,
    );
  };

  const applyFilters = () => {
    setIsApplying(true);
    const nextFilters = {
      ...draftFilters,
      group_by:
        draftFilters.view === "grouped_cards" && draftFilters.group_by === "none"
          ? "issue_type"
          : draftFilters.group_by,
    };
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((key) => {
      const value = nextFilters[key];
      if (value && value !== DEFAULT_FILTERS[key]) {
        params.set(key, value);
      }
    });
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  const resetFilters = () => {
    setIsApplying(true);
    setDraftFilters(DEFAULT_FILTERS);
    router.replace(pathname);
  };

  const headerActions = (
    <div className={styles.headerActions}>
      <button type="button" className={styles.secondaryButton} onClick={() => refetch()}>
        Refresh
      </button>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={() => downloadQueueCsv(queueItems)}
        disabled={queueItems.length === 0}
      >
        Export queue
      </button>
      <button type="button" className={styles.secondaryButton} onClick={() => setTrustOpen(true)}>
        Open Data Trust
      </button>
      <a href={reportHref} className={styles.secondaryButton}>
        Download Board Pack
      </a>
      <Link href="/use-cases/revenue-cycle-management/cash-command" className={styles.primaryLink}>
        View Cash Command
      </Link>
    </div>
  );

  return (
    <div className={styles.page}>
      <RCMPageHeader
        eyebrow="Revenue Cycle Management"
        title="Recovery Queue - Cash Recovery Execution Board"
        subtitle="Ranked operating queue for revenue recovery actions prioritised by value, urgency, payer risk, due date, and expected cash per effort hour."
        contextLine={`Period: ${data?.period?.label ?? "Active scope"} | Scope: ${scopeLabel} | Refreshed: ${timestamp(data?.generated_at ?? data?.as_of)}`}
        badges={[
          { label: `Freshness: ${freshnessLabel}`, color: stale ? "amber" : "green" },
          { label: `Sources loaded: ${sourceCount}`, color: "blue" },
          { label: `Currency: ${currencyCode}`, color: "gray" },
        ]}
        actions={headerActions}
      />
      <div className={styles.navWrap}>
        <RCMNavTabs active="recovery-queue" />
      </div>

      {stale && <StaleBanner />}
      {workflowMessage && (
        <section className={styles.sectionCard}>
          <p className={styles.sectionSubtext} style={{ margin: 0 }}>{workflowMessage}</p>
        </section>
      )}
      {loading && <LoadingView />}
      {error && <ErrorView message={error} onRetry={refetch} />}
      {data?.meta?.empty && !loading && !error && (
        <EmptyView message={data.meta.message ?? "The recovery queue will populate when cash opportunities are loaded."} />
      )}

      {!loading && !error && !data?.meta?.empty && (
        <>
          <section className={`${styles.storyStrip} ${storyStripSeverityClass(data?.headline?.severity)}`}>
            <div>
              <div className={styles.storyHeader}>
                <span className={styles.storyEyebrow}>Executive Story</span>
                <span className={severityClass(data?.headline?.severity)}>{prettyValue(data?.headline?.severity ?? "healthy")}</span>
              </div>
              <p className={styles.storyMessage}>{data?.headline?.message ?? "Recovery queue narrative unavailable."}</p>
              <p className={styles.storyNarrative}>{data?.story ?? "No narrative available."}</p>
              <button type="button" className={styles.storyAction} onClick={() => setTrustOpen(true)}>
                Open Data Trust
              </button>
            </div>
            <div className={styles.storyMetrics}>
              {(data?.headline?.metrics ?? []).map((metric) => (
                <div className={styles.metricCard} key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.formatted_value ?? "-"}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.kpiGrid}>
            {(data?.kpis ?? []).map((item) => (
              <KpiCard key={item.id} item={item} />
            ))}
          </section>

          <section className={styles.intelligenceGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>Recovery Mix by Issue Type</h3>
                <span>Value + count</span>
              </div>
              <RollupList rows={data?.intelligence?.issue_mix ?? []} kind="issue" currencyCode={currencyCode} />
            </article>
            <article className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>Recovery Value by Payer</h3>
                <span>Top payers</span>
              </div>
              <RollupList rows={data?.intelligence?.payer_recovery ?? []} kind="payer" currencyCode={currencyCode} />
            </article>
            <article className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>Workload by Owner</h3>
                <span>Count + effort</span>
              </div>
              <RollupList rows={data?.intelligence?.owner_workload ?? []} kind="owner" currencyCode={currencyCode} />
            </article>
            <article className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>Due Window / SLA Risk</h3>
                <span>Pressure view</span>
              </div>
              <DueWindowPanel rows={data?.intelligence?.due_window ?? []} currencyCode={currencyCode} />
            </article>
          </section>

          <section className={styles.controlCard}>
            <div className={styles.controlsGrid}>
              <FilterSelect
                label="Issue Type"
                value={draftFilters.issue_type}
                options={filterOptions.issue_type ?? []}
                onChange={(value) => setDraftFilters((current) => ({ ...current, issue_type: value }))}
              />
              <FilterSelect
                label="Payer"
                value={draftFilters.payer}
                options={filterOptions.payer ?? []}
                onChange={(value) => setDraftFilters((current) => ({ ...current, payer: value }))}
              />
              <FilterSelect
                label="Owner"
                value={draftFilters.owner}
                options={filterOptions.owner ?? []}
                onChange={(value) => setDraftFilters((current) => ({ ...current, owner: value }))}
              />
              <FilterSelect
                label="Status"
                value={draftFilters.status}
                options={filterOptions.status ?? []}
                onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))}
              />
              <FilterSelect
                label="Priority"
                value={draftFilters.priority}
                options={filterOptions.priority ?? []}
                onChange={(value) => setDraftFilters((current) => ({ ...current, priority: value }))}
              />
              <FilterSelect
                label="Due Window"
                value={draftFilters.due_window}
                options={filterOptions.due_window ?? []}
                onChange={(value) => setDraftFilters((current) => ({ ...current, due_window: value }))}
              />
              <label className={styles.controlField}>
                <span>Minimum Value</span>
                <input
                  value={draftFilters.min_value}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, min_value: event.target.value }))}
                  placeholder="5000"
                />
              </label>
              <label className={styles.controlField}>
                <span>Search claim reference</span>
                <input
                  value={draftFilters.search}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="CLAIM-001"
                />
              </label>
              <FilterSelect
                label="Sort"
                value={draftFilters.sort_by}
                options={[
                  { value: "priority_score", label: "Priority Score" },
                  { value: "recoverable_value", label: "Recoverable Value" },
                  { value: "expected_recovery", label: "Expected Recovery" },
                  { value: "due_date", label: "Due Date" },
                  { value: "effort_hours", label: "Effort Hours" },
                  { value: "payer", label: "Payer" },
                ]}
                onChange={(value) => setDraftFilters((current) => ({ ...current, sort_by: value }))}
              />
              <FilterSelect
                label="Group"
                value={draftFilters.group_by}
                options={[
                  { value: "none", label: "None" },
                  { value: "issue_type", label: "Issue Type" },
                  { value: "payer", label: "Payer" },
                  { value: "owner", label: "Owner" },
                  { value: "due_window", label: "Due Window" },
                  { value: "status", label: "Status" },
                ]}
                onChange={(value) => setDraftFilters((current) => ({ ...current, group_by: value }))}
              />
              <FilterSelect
                label="View"
                value={draftFilters.view}
                options={[
                  { value: "table", label: "Table" },
                  { value: "grouped_cards", label: "Grouped Cards" },
                ]}
                onChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    view: value === "grouped_cards" ? "grouped_cards" : "table",
                  }))
                }
              />
            </div>
            <div className={styles.controlActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={applyFilters}
                disabled={loading || isApplying}
              >
                {isApplying ? "Applying..." : "Apply filters"}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={resetFilters}>
                Reset filters
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => refetch()}>
                Refresh
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => downloadQueueCsv(queueItems)}
                disabled={queueItems.length === 0}
              >
                Export visible queue
              </button>
            </div>
            <div className={styles.appliedChips}>
              {FILTER_KEYS.filter(
                (key) => appliedFilters[key] && appliedFilters[key] !== DEFAULT_FILTERS[key],
              ).map((key) => (
                <span className={styles.filterChip} key={key}>
                  {filterChipLabel(key, appliedFilters[key])}
                </span>
              ))}
              {FILTER_KEYS.every(
                (key) => !appliedFilters[key] || appliedFilters[key] === DEFAULT_FILTERS[key],
              ) && <span className={styles.filterChip}>Default executive queue view</span>}
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Recovery Actions Story</p>
                <h3>Ranked queue and grouped recovery patterns</h3>
                <p className={styles.sectionSubtext}>{data?.story ?? "No recovery queue narrative available."}</p>
              </div>
              <div className={styles.sectionMeta}>
                <span>{`${queueItems.length} visible items`}</span>
                <span>{formatSarCompact(queueItems.reduce((sum, item) => sum + Number(item.expected_recovery ?? 0), 0), currencyCode)} expected</span>
              </div>
            </div>
            {appliedFilters.view === "grouped_cards" ? (
              <GroupedCardsView groups={groupedQueue} onSelect={selectedFromGroup} />
            ) : (
              <TableView items={queueItems} onSelect={setSelectedItem} />
            )}
          </section>
        </>
      )}

      <DetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} onPromote={promoteToDecision} />
      <DataTrustDrawer open={trustOpen} onClose={() => setTrustOpen(false)} dataQuality={data?.data_quality} />
    </div>
  );
}
