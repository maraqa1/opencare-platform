"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RCMNavTabs } from "../layout/RCMNavTabs";
import { RCMPageHeader } from "../layout/RCMPageHeader";
import { EmptyView, ErrorView, LoadingView, StaleBanner } from "../shared/ViewStates";
import { useRCMFetch } from "../useRCMFetch";
import type {
  RCMDecision,
  RCMDecisionQueueDataQuality,
  RCMDecisionQueuePayload,
  RCMDecisionWorkspacePayload,
  RecoveryQueueKpi,
  RecoveryQueueRollup,
} from "../types";
import { shortDate, timestamp } from "@/lib/format";
import styles from "./RecoveryQueue.module.css";

type DraftFilters = {
  decision_type: string;
  payer: string;
  approval_role: string;
  owner: string;
  priority: string;
  decision_status: string;
  due_window: string;
  min_expected_recovery: string;
  confidence_min: string;
  search: string;
  sort_by: string;
};

const FILTER_KEYS: Array<keyof DraftFilters> = [
  "decision_type",
  "payer",
  "approval_role",
  "owner",
  "priority",
  "decision_status",
  "due_window",
  "min_expected_recovery",
  "confidence_min",
  "search",
  "sort_by",
];

const DEFAULT_FILTERS: DraftFilters = {
  decision_type: "",
  payer: "",
  approval_role: "",
  owner: "",
  priority: "",
  decision_status: "",
  due_window: "",
  min_expected_recovery: "",
  confidence_min: "",
  search: "",
  sort_by: "decision_score",
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

function widthPercent(value: number, max: number) {
  if (!max) return 0;
  return Math.max(8, Math.min(100, (value / max) * 100));
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
  const labels: Record<keyof DraftFilters, string> = {
    decision_type: "Decision Type",
    payer: "Payer",
    approval_role: "Approval Role",
    owner: "Owner",
    priority: "Priority",
    decision_status: "Status",
    due_window: "Due Window",
    min_expected_recovery: "Min Recovery",
    confidence_min: "Min Confidence",
    search: "Search",
    sort_by: "Sort",
  };
  return `${labels[key]}: ${key === "sort_by" ? prettyValue(value) : value}`;
}

function buildScopeLabel(filters: DraftFilters) {
  const active = FILTER_KEYS.filter((key) => filters[key] && filters[key] !== DEFAULT_FILTERS[key]);
  if (active.length === 0) return "All governed decisions";
  return active.map((key) => filterChipLabel(key, filters[key])).join(" | ");
}

function filtersFromSearchParams(searchParams: URLSearchParams): DraftFilters {
  return {
    decision_type: searchParams.get("decision_type") ?? "",
    payer: searchParams.get("payer") ?? "",
    approval_role: searchParams.get("approval_role") ?? "",
    owner: searchParams.get("owner") ?? "",
    priority: searchParams.get("priority") ?? "",
    decision_status: searchParams.get("decision_status") ?? "",
    due_window: searchParams.get("due_window") ?? "",
    min_expected_recovery: searchParams.get("min_expected_recovery") ?? "",
    confidence_min: searchParams.get("confidence_min") ?? "",
    search: searchParams.get("search") ?? "",
    sort_by: searchParams.get("sort_by") ?? DEFAULT_FILTERS.sort_by,
  };
}

function KpiCard({ item }: { item: RecoveryQueueKpi }) {
  return (
    <article className={styles.kpiCard}>
      <div className={styles.kpiHeader}>
        <p className={styles.kpiLabel}>{item.label}</p>
        <span className={severityClass(item.status)}>{prettyValue(String(item.status ?? "unknown"))}</span>
      </div>
      <p className={styles.kpiValue}>{item.formatted_value ?? "-"}</p>
      {item.target_label && <p className={styles.kpiBenchmark}>{item.target_label}</p>}
      {item.interpretation && <p className={styles.kpiInterpretation}>{item.interpretation}</p>}
    </article>
  );
}

function RollupPanel({
  title,
  subtitle,
  rows,
  currencyCode,
}: {
  title: string;
  subtitle: string;
  rows: RecoveryQueueRollup[];
  currencyCode: string;
}) {
  const maxCount = Math.max(0, ...rows.map((row) => Number(row.count ?? 0)));
  return (
    <article className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <h3>{title}</h3>
          <span>{subtitle}</span>
        </div>
      </div>
      <div className={styles.rollupList}>
        {rows.length === 0 ? (
          <p className={styles.sectionSubtext}>No matching decisions for this lens.</p>
        ) : (
          rows.map((row) => (
            <div className={styles.rollupRow} key={row.label}>
              <div className={styles.rollupTop}>
                <strong>{row.label}</strong>
                <span>{row.count ?? 0}</span>
              </div>
              <div className={styles.rollupMeta}>
                <span>{row.formatted_expected_recovery ?? formatSarCompact(row.expected_recovery, currencyCode)}</span>
              </div>
              <div className={styles.rollupTrack}>
                <span className={styles.rollupFill} style={{ width: `${widthPercent(Number(row.count ?? 0), maxCount)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function DataTrustDrawer({
  open,
  onClose,
  dataQuality,
}: {
  open: boolean;
  onClose: () => void;
  dataQuality?: RCMDecisionQueueDataQuality;
}) {
  if (!open) return null;
  return (
    <div className={styles.drawerScrim} onClick={onClose}>
      <aside className={styles.drawer} onClick={(event) => event.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerEyebrow}>Data Trust</p>
            <h3>Decision Queue contract</h3>
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
          <strong>Scoring logic</strong>
          <ul>
            {(dataQuality?.scoring_logic ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className={styles.drawerSection}>
          <strong>Decision thresholds</strong>
          <ul>
            {(dataQuality?.decision_thresholds ?? []).map((entry) => (
              <li key={entry.label}>{`${entry.label}: ${entry.value}`}</li>
            ))}
          </ul>
        </div>
        <div className={styles.drawerSection}>
          <strong>Confidence logic</strong>
          <ul>
            {(dataQuality?.confidence_logic ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className={styles.drawerSection}>
          <strong>Approval rules</strong>
          <ul>
            {(dataQuality?.approval_rules ?? []).map((item) => <li key={item}>{item}</li>)}
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
          <strong>Unsupported filters</strong>
          <ul>
            {(dataQuality?.unsupported_filters ?? []).length === 0 ? (
              <li>No unsupported filters reported.</li>
            ) : (
              (dataQuality?.unsupported_filters ?? []).map((item) => <li key={item}>{prettyValue(item)}</li>)
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

function DecisionDrawer({
  open,
  loading,
  error,
  workspace,
  onClose,
  onAction,
}: {
  open: boolean;
  loading: boolean;
  error: string;
  workspace: RCMDecisionWorkspacePayload | null;
  onClose: () => void;
  onAction: (action: "approve" | "reject" | "revise" | "dispatch" | "escalate" | "note" | "assign") => void;
}) {
  if (!open) return null;
  const decision = workspace?.decision;
  return (
    <div className={styles.drawerScrim} onClick={onClose}>
      <aside className={styles.drawer} onClick={(event) => event.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerEyebrow}>Decision Workspace</p>
            <h3>{decision?.decision_id ?? "Loading decision..."}</h3>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} />
        ) : !decision ? (
          <EmptyView message="The selected decision could not be loaded." />
        ) : (
          <>
            <div className={styles.detailGrid}>
              <div>
                <span>Recommended action</span>
                <strong>{decision.recommended_action ?? "Review decision"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{decision.decision_status_label ?? "Recommended"}</strong>
              </div>
              <div>
                <span>Expected recovery</span>
                <strong>{decision.formatted_expected_recovery ?? "-"}</strong>
              </div>
              <div>
                <span>Expected ROI / hour</span>
                <strong>{decision.formatted_expected_roi_per_hour ?? "-"}</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{decision.formatted_confidence ?? "-"}</strong>
              </div>
              <div>
                <span>Approval</span>
                <strong>{decision.approval_required ? decision.approval_role ?? "Required" : "Not required"}</strong>
              </div>
              <div>
                <span>Recommended owner</span>
                <strong>{decision.recommended_owner ?? "Unassigned"}</strong>
              </div>
              <div>
                <span>Channel</span>
                <strong>{decision.recommended_channel ?? "Manual handoff"}</strong>
              </div>
            </div>
            <div className={styles.drawerSection}>
              <strong>Recommendation</strong>
              <p>{decision.decision_reason ?? "No recommendation narrative loaded."}</p>
            </div>
            <div className={styles.drawerSection}>
              <strong>Risk of inaction</strong>
              <p>{decision.risk_of_inaction ?? "No risk narrative loaded."}</p>
            </div>
            <div className={styles.drawerSection}>
              <strong>Evidence</strong>
              <ul>
                <li>{`Source item: ${decision.source_item_id ?? "Unavailable"}`}</li>
                <li>{`Payer: ${decision.payer ?? "Unavailable"}`}</li>
                <li>{`Issue: ${decision.issue_label ?? decision.issue_type ?? "Unavailable"}`}</li>
                <li>{`Due date: ${decision.due_at ? shortDate(decision.due_at) : "No due date"}`}</li>
                <li>{`Evidence: ${decision.source_evidence ?? "No evidence summary loaded."}`}</li>
              </ul>
            </div>
            <div className={styles.drawerSection}>
              <strong>Comparable cases</strong>
              <ul>
                {(decision.comparable_case_support ?? []).map((entry) => (
                  <li key={`${entry.case_group}-${entry.sample_size}`}>{`${entry.case_group ?? "Comparable cases"} - ${Math.round(Number(entry.success_rate ?? 0) * 100)}% success across ${entry.sample_size ?? 0} cases`}</li>
                ))}
              </ul>
            </div>
            <div className={styles.drawerActions}>
              {(["approve", "revise", "reject", "escalate", "dispatch", "note", "assign"] as const).map((action) => {
                const state = decision.available_actions?.[action];
                const enabled = Boolean(state?.enabled);
                return (
                  <button
                    key={action}
                    type="button"
                    className={enabled ? styles.primaryButton : styles.disabledButton}
                    disabled={!enabled}
                    title={state?.reason ?? state?.message ?? ""}
                    onClick={() => enabled && onAction(action)}
                  >
                    {prettyValue(action)}
                  </button>
                );
              })}
            </div>
            <p className={styles.drawerNote}>
              {decision.manual_action_required
                ? "Dispatch is persisted and audited, but downstream handoff remains manual until workflow integration is connected."
                : "Only API-backed decision actions are enabled."}
            </p>
            <div className={styles.drawerSection}>
              <strong>Audit trail</strong>
              <ul>
                {(workspace?.audit_trail ?? []).length === 0 ? (
                  <li>No audit events recorded yet.</li>
                ) : (
                  (workspace?.audit_trail ?? []).map((entry) => (
                    <li key={`${entry.id}-${entry.created_at}`}>{`${timestamp(entry.created_at)} - ${prettyValue(String(entry.action ?? "review"))} by ${entry.performed_by ?? "system"}${entry.notes ? ` - ${entry.notes}` : ""}`}</li>
                  ))
                )}
              </ul>
            </div>
            <div className={styles.drawerSection}>
              <strong>Outcome review</strong>
              <p>{String(workspace?.outcome_review?.reason ?? "Outcome measurement will appear here once actual recovery is recorded.")}</p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export function DecisionQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedFilters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(appliedFilters);
  const [selectedDecision, setSelectedDecision] = useState<RCMDecision | null>(null);
  const [workspace, setWorkspace] = useState<RCMDecisionWorkspacePayload | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [trustOpen, setTrustOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  const apiParams = useMemo(() => {
    const entries = Object.entries(appliedFilters).filter(([key, value]) => value && value !== DEFAULT_FILTERS[key as keyof DraftFilters]);
    return Object.fromEntries(entries);
  }, [appliedFilters]);

  const { data, loading, error, stale, refetch } =
    useRCMFetch<RCMDecisionQueuePayload>("decision-queue", apiParams);

  useEffect(() => {
    if (!loading) setIsApplying(false);
  }, [loading]);

  const decisions = data?.decisions ?? [];
  const filterOptions = data?.filter_options ?? {};
  const scopeLabel = buildScopeLabel(appliedFilters);
  const currencyCode = data?.currency ?? "SAR";
  const decisionIdParam = searchParams.get("decision_id");

  useEffect(() => {
    if (!decisionIdParam || decisions.length === 0) return;
    const match = decisions.find((decision) => decision.decision_id === decisionIdParam || String(decision.id ?? "") === decisionIdParam);
    if (match) {
      setSelectedDecision(match);
    }
  }, [decisionIdParam, decisions]);

  useEffect(() => {
    if (!selectedDecision?.id) {
      setWorkspace(null);
      return;
    }
    let cancelled = false;
    async function loadWorkspace() {
      setWorkspaceLoading(true);
      setWorkspaceError("");
      try {
        const response = await fetch(`/api/portal/api/v1/rcm/decisions/${selectedDecision.id}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as RCMDecisionWorkspacePayload;
        if (!cancelled) setWorkspace(payload);
      } catch (err) {
        if (!cancelled) {
          setWorkspace(null);
          setWorkspaceError(err instanceof Error ? err.message : "Unable to load decision workspace.");
        }
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    }
    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [selectedDecision?.id]);

  function applyFilters() {
    setIsApplying(true);
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((key) => {
      const value = draftFilters[key];
      if (value && value !== DEFAULT_FILTERS[key]) params.set(key, value);
    });
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  function resetFilters() {
    setIsApplying(true);
    setDraftFilters(DEFAULT_FILTERS);
    router.replace(pathname);
  }

  function openDecision(decision: RCMDecision) {
    setSelectedDecision(decision);
  }

  async function runAction(action: "approve" | "reject" | "revise" | "dispatch" | "escalate" | "note" | "assign") {
    if (!selectedDecision?.id) return;
    const body: Record<string, unknown> = {};
    if (action === "reject" || action === "note") {
      const notes = window.prompt(action === "reject" ? "Reason is required for rejection:" : "Add audit note:");
      if (!notes?.trim()) return;
      if (action === "reject") {
        body.reason = notes.trim();
      } else {
        body.notes = notes.trim();
      }
    }
    if (action === "revise") {
      const reason = window.prompt("Revise the recommendation narrative:", workspace?.decision?.decision_reason ?? "");
      if (!reason?.trim()) return;
      body.decision_reason = reason.trim();
      body.notes = "Recommendation revised from Decision Queue.";
    }
    if (action === "assign") {
      const owner = window.prompt("Assign to owner/team:", workspace?.decision?.recommended_owner ?? "");
      if (!owner?.trim()) return;
      body.recommended_owner = owner.trim();
      body.assignee_user = owner.trim();
      body.notes = "Owner assignment updated from Decision Queue.";
    }
    if (action === "dispatch") {
      body.notes = "Dispatched from Decision Queue. Manual downstream handoff required.";
    }

    const response = await fetch(`/api/portal/api/v1/rcm/decisions/${selectedDecision.id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const payload = await response.json() as { detail?: string };
        detail = payload.detail ?? detail;
      } catch {
        // keep fallback
      }
      setActionMessage(`Decision update failed: ${detail}`);
      return;
    }

    const updated = await response.json() as RCMDecision;
    setSelectedDecision(updated);
    setActionMessage(`${updated.decision_id ?? "Decision"} updated via ${prettyValue(action)}.`);
    refetch();
  }

  const headerActions = (
    <div className={styles.headerActions}>
      <button type="button" className={styles.secondaryButton} onClick={() => refetch()}>
        Refresh
      </button>
      <Link href="/use-cases/revenue-cycle-management/recovery-queue" className={styles.secondaryButton}>
        Open Recovery Queue
      </Link>
      <button type="button" className={styles.primaryButton} onClick={() => setTrustOpen(true)}>
        Open Data Trust
      </button>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.navWrap}>
        <RCMNavTabs active="decision-queue" />
      </div>

      <RCMPageHeader
        eyebrow="USE CASE WORKSPACE"
        title="Decision Queue - Governed Recovery Interventions"
        subtitle="Curated recovery decisions requiring approval, routing, escalation, or policy judgement before execution."
        badges={[
          { label: `Freshness: ${data?.data_freshness?.status ?? "unknown"}`, color: stale ? "amber" : "green" },
          { label: "Live decision queue", color: "blue" },
        ]}
        contextLine="Recovery Queue shows the full recoverable backlog. Decision Queue shows only the governed subset that requires a human or policy decision."
        actions={headerActions}
      />

      {stale && <StaleBanner />}
      {actionMessage && (
        <div className={styles.sectionCard}>
          <p className={styles.sectionSubtext} style={{ margin: 0 }}>{actionMessage}</p>
        </div>
      )}
      {loading && <LoadingView />}
      {!loading && error && <ErrorView message={error} />}
      {!loading && !error && data?.meta?.empty && (
        <EmptyView
          message={data?.meta?.message ?? "The recovery backlog is available, but no decision subset matches the current filters."}
        />
      )}

      {!loading && !error && !data?.meta?.empty && (
        <>
          <section className={`${styles.storyStrip} ${storyStripSeverityClass(data?.headline?.severity)}`}>
            <div>
              <div className={styles.storyHeader}>
                <span className={styles.storyEyebrow}>Governed subset of the recovery backlog</span>
                <span className={severityClass(data?.headline?.severity)}>{prettyValue(String(data?.headline?.severity ?? "watch"))}</span>
              </div>
              <p className={styles.storyMessage}>{data?.headline?.message}</p>
              <p className={styles.storyNarrative}>
                Decision Queue isolates only the interventions that need approval, routing, escalation, or explicit policy judgement.
                Operators continue to work the full Recovery Queue while supervisors resolve this governed subset.
              </p>
              <button type="button" className={styles.storyAction} onClick={() => setTrustOpen(true)}>
                Review scoring and approval rules
              </button>
            </div>
            <div className={styles.storyMetrics}>
              <article className={styles.metricCard}>
                <span>Governed decisions</span>
                <strong>{data?.headline?.decision_count ?? decisions.length}</strong>
              </article>
              <article className={styles.metricCard}>
                <span>Approval required</span>
                <strong>{data?.headline?.approval_required_count ?? 0}</strong>
              </article>
              <article className={styles.metricCard}>
                <span>Expected recovery</span>
                <strong>{formatSarCompact(data?.headline?.expected_recovery, currencyCode)}</strong>
              </article>
              <article className={styles.metricCard}>
                <span>High confidence</span>
                <strong>{data?.headline?.high_confidence_count ?? 0}</strong>
              </article>
            </div>
          </section>

          <section className={styles.kpiGrid}>
            {(data?.kpis ?? []).map((item) => (
              <KpiCard key={item.id} item={item} />
            ))}
          </section>

          <section className={styles.intelligenceGrid}>
            <RollupPanel title="Decisions by Type" subtitle="Routing and intervention mix" rows={data?.decision_mix?.by_decision_type ?? []} currencyCode={currencyCode} />
            <RollupPanel title="By Approval Role" subtitle="Who needs to authorise next" rows={data?.decision_mix?.by_approval_role ?? []} currencyCode={currencyCode} />
            <RollupPanel title="By Payer" subtitle="Cash exposure under decision" rows={data?.decision_mix?.by_payer ?? []} currencyCode={currencyCode} />
            <RollupPanel title="Status Mix" subtitle="Review, approval, and dispatch state" rows={data?.decision_mix?.by_status ?? []} currencyCode={currencyCode} />
          </section>

          <section className={styles.controlCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Control Bar</p>
                <h3>Governed decision filters</h3>
                <p className={styles.sectionSubtext}>Filter by decision type, payer, approval role, confidence, or value before opening the workspace.</p>
              </div>
              <div className={styles.sectionMeta}>
                <span>{scopeLabel}</span>
                <span>{`Generated ${timestamp(data?.generated_at)}`}</span>
              </div>
            </div>
            <div className={styles.controlsGrid}>
              {([
                { key: "decision_type", label: "Decision Type" },
                { key: "payer", label: "Payer" },
                { key: "approval_role", label: "Approval Role" },
                { key: "owner", label: "Owner" },
                { key: "priority", label: "Priority" },
                { key: "decision_status", label: "Status" },
                { key: "due_window", label: "Due Window" },
                { key: "sort_by", label: "Sort By" },
              ] as Array<{ key: keyof DraftFilters; label: string }>).map(({ key, label }) => (
                <label className={styles.controlField} key={key}>
                  <span>{label}</span>
                  <select
                    value={draftFilters[key]}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, [key]: event.target.value }))}
                  >
                    <option value="">All</option>
                    {(filterOptions[key] ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    {key === "sort_by" && (
                      <>
                        <option value="decision_score">Decision Score</option>
                        <option value="expected_recovery">Expected Recovery</option>
                        <option value="confidence">Confidence</option>
                        <option value="due_date">Due Date</option>
                        <option value="approval_role">Approval Role</option>
                      </>
                    )}
                  </select>
                </label>
              ))}
              <label className={styles.controlField}>
                <span>Min Expected Recovery</span>
                <input
                  value={draftFilters.min_expected_recovery}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, min_expected_recovery: event.target.value }))}
                  placeholder="3000"
                />
              </label>
              <label className={styles.controlField}>
                <span>Min Confidence</span>
                <input
                  value={draftFilters.confidence_min}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, confidence_min: event.target.value }))}
                  placeholder="0.75"
                />
              </label>
              <label className={styles.controlField} style={{ gridColumn: "span 2" }}>
                <span>Search</span>
                <input
                  value={draftFilters.search}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search decision, claim, payer, action, or approval role"
                />
              </label>
            </div>
            <div className={styles.controlActions}>
              <button type="button" className={styles.primaryButton} onClick={applyFilters} disabled={isApplying}>
                {isApplying ? "Applying..." : "Apply filters"}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={resetFilters} disabled={isApplying}>
                Reset
              </button>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Decision Table</p>
                <h3>Curated recovery decisions</h3>
                <p className={styles.sectionSubtext}>Open any row to review the recommendation, evidence, comparable cases, command actions, and audit trail.</p>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Decision</th>
                    <th>Source Item</th>
                    <th>Payer</th>
                    <th>Recommended Action</th>
                    <th>Why Now</th>
                    <th>Expected Recovery</th>
                    <th>Confidence</th>
                    <th>Due Pressure</th>
                    <th>Approval Required</th>
                    <th>Approval Role</th>
                    <th>Status</th>
                    <th>Decide</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((decision) => (
                    <tr key={decision.decision_id} onClick={() => openDecision(decision)}>
                      <td>
                        <button type="button" className={styles.rowLink} onClick={() => openDecision(decision)}>
                          {decision.decision_id ?? "--"}
                        </button>
                      </td>
                      <td>{decision.source_label ?? decision.source_item_id ?? "--"}</td>
                      <td>{decision.payer ?? "Unknown payer"}</td>
                      <td>{decision.recommended_action ?? "Review decision"}</td>
                      <td style={{ minWidth: 260 }}>{decision.why_now ?? "-"}</td>
                      <td>{decision.formatted_expected_recovery ?? "-"}</td>
                      <td>
                        <span className={severityClass((decision.confidence ?? 0) >= 0.75 ? "healthy" : (decision.confidence ?? 0) >= 0.58 ? "watch" : "critical")}>
                          {decision.formatted_confidence ?? "-"}
                        </span>
                      </td>
                      <td>
                        <span className={priorityClass(decision.priority)}>{decision.due_pressure ?? "Future"}</span>
                      </td>
                      <td>
                        <span className={decision.approval_required ? `${styles.badge} ${styles.badgeWatch}` : `${styles.badge} ${styles.badgeHealthy}`}>
                          {decision.approval_required ? "Required" : "Not required"}
                        </span>
                      </td>
                      <td>{decision.approval_role ?? "-"}</td>
                      <td>
                        <span className={severityClass(decision.decision_status === "approved" || decision.decision_status === "dispatched" ? "healthy" : decision.decision_status === "rejected" ? "critical" : "watch")}>
                          {decision.decision_status_label ?? "Recommended"}
                        </span>
                      </td>
                      <td>
                        <button type="button" className={styles.secondaryButton} onClick={() => openDecision(decision)}>
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <DecisionDrawer
        open={Boolean(selectedDecision)}
        loading={workspaceLoading}
        error={workspaceError}
        workspace={workspace}
        onClose={() => setSelectedDecision(null)}
        onAction={runAction}
      />
      <DataTrustDrawer open={trustOpen} onClose={() => setTrustOpen(false)} dataQuality={data?.data_quality} />
    </div>
  );
}
