// Canonical API types for all 6 RCM views
// Derived from the live backend response shapes in RevenueCycleConsole and RCMDashboard

export type RCMMeta = {
  empty?: boolean;
  message?: string | null;
};

// ─── CASH COMMAND (operational — action cards) ───────────────────────────────

export type ActionItem = {
  opportunity_id?: string | null;
  issue_type?: string | null;
  issue_reason?: string | null;
  claim_id?: string | null;
  payer_id?: string | null;
  department_id?: string | null;
  recoverable_amount?: number | null;
  expected_recovery_amount?: number | null;
  priority_score?: number | null;
  due_date?: string | null;
  owner_team?: string | null;
  owner_user_id?: string | null;
  status?: string | null;
  next_step?: string | null;
  evidence_summary?: string | null;
};

export type CashCommandStatus = "critical" | "watch" | "healthy" | "unknown";
export type CashCommandUnit = "currency" | "percent" | "days" | "count";

export type CashCommandMetric = {
  label: string;
  value?: number | null;
  unit: CashCommandUnit;
};

export type CashCommandKpi = {
  key: string;
  label: string;
  value?: number | null;
  unit: CashCommandUnit;
  status: CashCommandStatus;
  target_label?: string | null;
  interpretation?: string | null;
};

export type CashCommandStage = {
  stage_number: number;
  key: string;
  title: string;
  status: CashCommandStatus;
  why_it_matters?: string | null;
  metrics: CashCommandMetric[];
};

export type CashCommandRiskRow = {
  key: string;
  label: string;
  amount: number;
  claims: number;
  share_pct?: number | null;
  status: CashCommandStatus;
  note?: string | null;
};

export type CashCommandGroupedAction = {
  priority?: string | null;
  issue_type?: string | null;
  payer_id?: string | null;
  department_id?: string | null;
  owner?: string | null;
  due_bucket?: string | null;
  claims?: number | null;
  recoverable_amount?: number | null;
  expected_recovery?: number | null;
  earliest_due_date?: string | null;
  action?: string | null;
};

export type CashCommandPayload = {
  as_of?: string | null;
  currency?: string | null;
  period?: {
    date_from?: string | null;
    date_to?: string | null;
    label?: string | null;
  };
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  headline?: {
    severity?: CashCommandStatus;
    message?: string | null;
    metrics?: CashCommandMetric[];
  };
  kpis?: CashCommandKpi[];
  journey?: {
    stages?: CashCommandStage[];
  };
  risk_concentration?: CashCommandRiskRow[];
  charts?: {
    cash_vs_charges?: Array<{
      month: string;
      charges: number;
      cash_collected: number;
      expected_collections: number;
      denied_value?: number;
      expected_recovery?: number;
    }>;
    ar_aging_buckets?: Array<{ bucket: string; value: number; risk_band: string }>;
    denial_recovery_pipeline?: Array<{ month: string; denied_value: number; expected_recovery: number }>;
    payer_performance?: Array<{
      payer: string;
      collection_rate_pct?: number | null;
      denial_rate_pct?: number | null;
      avg_days_to_pay?: number | null;
      ar_exposure?: number | null;
      risk_score?: number | null;
      status?: CashCommandStatus;
    }>;
    leakage_by_payer?: Array<{
      payer: string;
      leakage_amount: number;
      share_pct?: number | null;
    }>;
    cash_gap_to_charges?: number | null;
    ar_total?: number | null;
    ar_over_90?: number | null;
  };
  actions?: {
    grouped?: CashCommandGroupedAction[];
    deadlines_at_risk?: ActionItem[];
  };
  data_quality?: {
    trust_label?: string | null;
    sources_loaded?: number | null;
    total_sources?: number | null;
    generated_at?: string | null;
    filters_applied?: {
      date_from?: string | null;
      date_to?: string | null;
      payer?: string[];
      department?: string[];
      claim_status?: string[];
    };
    unsupported_filters?: string[];
    source_tables?: Array<{ table: string; role: string; loaded: boolean }>;
    missing_metrics?: Array<{ label: string; reason: string }>;
    warnings?: string[];
    limitations?: string[];
  };
  recoverable_cash_7d?: number | null;
  recoverable_cash_14d?: number | null;
  cash_at_risk?: number | null;
  expected_collections?: number | null;
  top_actions?: ActionItem[];
  expiring_opportunities?: ActionItem[];
  dashboard?: CashDashboardPayload | null;
};

export type RcmJourneyRiskClass = "healthy" | "watch" | "critical" | "unavailable";

export type RcmJourneyMetric = {
  label: string;
  value?: number | null;
  unit?: CashCommandUnit | string | null;
  formatted_value: string;
  available: boolean;
};

export type RcmJourneyStage = {
  stage_id: string;
  stage_order: number;
  stage_name: string;
  stage_note: string;
  risk_class: RcmJourneyRiskClass;
  status: string;
  metrics: RcmJourneyMetric[];
  risk_note?: string | null;
};

export type RcmJourneyRiskChip = {
  label: string;
  formatted_value: string;
  risk_class: RcmJourneyRiskClass;
};

export type RcmJourneyResponse = {
  generated_at?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  stages: RcmJourneyStage[];
  risk_concentration: RcmJourneyRiskChip[];
  data_quality: {
    warnings: string[];
    source_tables: string[];
    missing_metrics: string[];
  };
};

// ─── CASH COMMAND (executive dashboard — charts) ─────────────────────────────

export type CashDashboardKPIs = {
  total_cash_collected?: number;
  total_cash_collected_delta_pct?: number;
  denial_rate_pct?: number;
  denial_rate_delta_pp?: number;
  leakage_recovered?: number;
  leakage_recovered_pct_gross?: number;
  claims_in_pipeline?: number;
  claims_require_action?: number;
};

export type CashDashboardPayload = {
  subtitle?: string;
  status?: { label?: string; value?: number; target?: string; band?: string };
  kpis?: CashDashboardKPIs;
  cash_vs_charge_series?: Array<{ month: string; charges: number; collections: number }>;
  ar_aging_buckets?: Array<{ bucket: string; value: number; risk_band: string }>;
};

export type CashCommandDashboardResponse = {
  meta?: RCMMeta;
  dashboard?: CashDashboardPayload | null;
};

// ─── RECOVERY QUEUE ──────────────────────────────────────────────────────────

export type RecoveryQueueItem = ActionItem & {
  issue_reason?: string | null;
  encounter_id?: string | null;
  effort_hours?: number | null;
  priority_score?: number | null;
  source_system?: string | null;
  owner?: string | null;
  decision_status?: string | null;
  outcome_status?: string | null;
  claim_ref?: string | null;
  currency?: string | null;
  recoverable_value?: number | null;
  expected_recovery?: number | null;
  formatted_recoverable_value?: string | null;
  formatted_expected_recovery?: string | null;
  formatted_effort?: string | null;
  formatted_effort_hours?: string | null;
  formatted_priority_score?: string | null;
  priority?: string | null;
  priority_label?: string | null;
  owner_key?: string | null;
  owner_label?: string | null;
  payer?: string | null;
  payer_label?: string | null;
  issue_label?: string | null;
  status_key?: string | null;
  status_label?: string | null;
  detected_date?: string | null;
  days_to_due?: number | null;
  sla_risk?: string | null;
  root_cause?: string | null;
  source_evidence?: string | null;
  timeline?: Array<{ label?: string; value?: string | null } | string>;
  next_action?: string | null;
  decision_id?: number | null;
  linked_decision_id?: string | null;
  decision_required?: boolean | null;
  can_promote_to_decision?: boolean | null;
  decision_reason?: string | null;
  recommended_decision_action?: string | null;
  decision_priority?: string | null;
  decision_confidence?: number | null;
  approval_required?: boolean | null;
  approval_role?: string | null;
};

export type RecoveryQueueHeadlineMetric = {
  label: string;
  value?: number | null;
  formatted_value?: string | null;
};

export type RecoveryQueueKpi = {
  id: string;
  label: string;
  value?: number | null;
  formatted_value?: string | null;
  status?: "critical" | "watch" | "healthy" | "unknown" | string;
  interpretation?: string | null;
  target_label?: string | null;
  benchmark?: string | null;
};

export type RecoveryQueueRollup = {
  label: string;
  count?: number | null;
  recoverable_value?: number | null;
  expected_recovery?: number | null;
  effort_hours?: number | null;
  formatted_value?: string | null;
  formatted_recoverable_value?: string | null;
  formatted_expected_recovery?: string | null;
  formatted_effort_hours?: string | null;
};

export type RecoveryQueueGroupedCard = {
  key?: string;
  group_key?: string;
  label?: string;
  group_label?: string;
  group_by?: string;
  count?: number;
  claims?: number;
  recoverable_value?: number;
  expected_recovery?: number;
  effort_hours?: number;
  formatted_value?: string | null;
  formatted_recoverable_value?: string | null;
  formatted_expected_recovery?: string | null;
  formatted_effort_hours?: string | null;
  high_priority_items?: number;
  overdue_items?: number;
  top_payer?: string | null;
  top_owner?: string | null;
  due_pressure?: string | null;
  priority_mix?: Record<string, number>;
  sample_items?: Array<{
    claim_ref?: string | null;
    recoverable_value?: number | null;
    expected_recovery?: number | null;
    priority?: string | null;
    status?: string | null;
  }>;
};

export type RecoveryQueuePayload = {
  as_of?: string | null;
  generated_at?: string | null;
  currency?: string | null;
  period?: {
    date_from?: string | null;
    date_to?: string | null;
    label?: string | null;
  };
  filters_applied?: Record<string, unknown>;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  headline?: {
    severity?: "critical" | "watch" | "healthy" | "unknown" | string;
    message?: string | null;
    metrics?: RecoveryQueueHeadlineMetric[];
  };
  story?: string | null;
  kpis?: RecoveryQueueKpi[];
  intelligence?: {
    issue_mix?: RecoveryQueueRollup[];
    payer_recovery?: RecoveryQueueRollup[];
    owner_workload?: RecoveryQueueRollup[];
    due_window?: Array<{
      label: string;
      count?: number | null;
      recoverable_value?: number | null;
      formatted_value?: string | null;
      expected_recovery?: number | null;
      formatted_expected_recovery?: string | null;
    }>;
  };
  total?: number;
  items?: RecoveryQueueItem[];
  queue_items?: RecoveryQueueItem[];
  grouped_queue?: RecoveryQueueGroupedCard[];
  filter_options?: Record<string, Array<{ value: string; label: string }>>;
  data_quality?: {
    generated_at?: string | null;
    currency?: string | null;
    sources_loaded?: number | null;
    total_sources?: number | null;
    source_tables?: Array<{ table: string; role?: string; loaded?: boolean }>;
    filters_applied?: Record<string, unknown>;
    metric_definitions?: Array<{ label: string; definition: string }>;
    missing_metrics?: Array<{ label: string; reason: string }>;
    warnings?: string[];
    limitations?: string[];
  };
  dashboard?: {
    denial_pipeline?: Array<Record<string, unknown>>;
    action_cards?: Array<{
      label: string;
      amount: number;
      subtext?: string | null;
      button_label?: string | null;
      href?: string | null;
    }>;
  } | null;
};

// ─── PAYER CONTROL ───────────────────────────────────────────────────────────

export type RecoveryQueueDataQuality = NonNullable<RecoveryQueuePayload["data_quality"]>;

export type RCMDecisionActionState = {
  enabled: boolean;
  message?: string | null;
  reason?: string | null;
};

export type RCMDecision = {
  id?: number | null;
  decision_id?: string | null;
  source_item_id?: string | null;
  source_type?: string | null;
  source_label?: string | null;
  payer?: string | null;
  payer_id?: string | null;
  decision_type?: string | null;
  decision_type_label?: string | null;
  recommended_action?: string | null;
  decision_reason?: string | null;
  why_now?: string | null;
  expected_recovery?: number | null;
  formatted_expected_recovery?: string | null;
  expected_effort_hours?: number | null;
  formatted_expected_effort_hours?: string | null;
  expected_roi_per_hour?: number | null;
  formatted_expected_roi_per_hour?: string | null;
  decision_score?: number | null;
  formatted_decision_score?: string | null;
  priority?: string | null;
  priority_label?: string | null;
  confidence?: number | null;
  formatted_confidence?: string | null;
  confidence_detail?: string | null;
  due_pressure?: string | null;
  due_at?: string | null;
  risk_of_inaction?: string | null;
  approval_required?: boolean | null;
  approval_role?: string | null;
  decision_status?: string | null;
  decision_status_label?: string | null;
  outcome_status?: string | null;
  recommended_owner?: string | null;
  recommended_channel?: string | null;
  assignee_user?: string | null;
  assignee_email?: string | null;
  manual_action_required?: boolean | null;
  auto_dispatch_eligible?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  dispatched_at?: string | null;
  closed_at?: string | null;
  generated_by?: string | null;
  claim_ref?: string | null;
  issue_type?: string | null;
  issue_label?: string | null;
  root_cause?: string | null;
  source_evidence?: string | null;
  timeline?: Array<{ label?: string; value?: string | null } | string>;
  comparable_case_support?: Array<{
    case_group?: string | null;
    success_rate?: number | null;
    sample_size?: number | null;
    source?: string | null;
  }>;
  scoring_breakdown?: {
    decision_score?: number | null;
    priority_score?: number | null;
    urgency_multiplier?: number | null;
    policy_weight?: number | null;
    confidence_weight?: number | null;
    recoverability_probability?: number | null;
  };
  notification_status?: {
    sent_count?: number | null;
    failed_count?: number | null;
    skipped_count?: number | null;
  };
  audit_event_count?: number | null;
  last_log_at?: string | null;
  available_actions?: Partial<Record<"approve" | "reject" | "revise" | "dispatch" | "escalate" | "note" | "assign", RCMDecisionActionState>>;
};

export type RCMDecisionQueueDataQuality = {
  generated_at?: string | null;
  currency?: string | null;
  source_tables?: Array<{ table: string; role?: string; loaded?: boolean }>;
  filters_applied?: Record<string, unknown>;
  scoring_logic?: string[];
  decision_thresholds?: Array<{ label: string; value: string }>;
  confidence_logic?: string[];
  approval_rules?: string[];
  missing_fields?: Array<{ label?: string; reason?: string } | string>;
  warnings?: string[];
  unsupported_filters?: string[];
  limitations?: string[];
};

export type RCMDecisionQueuePayload = {
  generated_at?: string | null;
  currency?: string | null;
  period?: {
    date_from?: string | null;
    date_to?: string | null;
    label?: string | null;
  };
  filters_applied?: Record<string, unknown>;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  headline?: {
    severity?: "critical" | "watch" | "healthy" | "unknown" | string;
    message?: string | null;
    decision_count?: number | null;
    approval_required_count?: number | null;
    expected_recovery?: number | null;
    high_confidence_count?: number | null;
  };
  kpis?: RecoveryQueueKpi[];
  decision_mix?: {
    by_decision_type?: RecoveryQueueRollup[];
    by_approval_role?: RecoveryQueueRollup[];
    by_payer?: RecoveryQueueRollup[];
    by_status?: RecoveryQueueRollup[];
  };
  decisions?: RCMDecision[];
  filter_options?: Record<string, Array<{ value: string; label: string }>>;
  data_quality?: RCMDecisionQueueDataQuality;
  outcome_review?: {
    enabled?: boolean | null;
    reason?: string | null;
  };
};

export type RevenueCycleBoardPackStatus =
  | "critical"
  | "watch"
  | "healthy"
  | "unknown"
  | string;

export type RevenueCycleBoardPackCard = {
  title?: string | null;
  metric_label?: string | null;
  metric_value?: string | null;
  message?: string | null;
  status?: RevenueCycleBoardPackStatus;
};

export type RevenueCycleBoardPackKpi = {
  label?: string | null;
  formatted_value?: string | null;
  interpretation?: string | null;
  target_label?: string | null;
  status?: RevenueCycleBoardPackStatus;
};

export type RevenueCycleBoardPackPayload = {
  generated_at?: string | null;
  currency?: string | null;
  period?: {
    date_from?: string | null;
    date_to?: string | null;
    label?: string | null;
  };
  filters_applied?: Record<string, unknown>;
  meta?: RCMMeta & {
    use_case?: string | null;
    section?: string | null;
  };
  executive_cover?: {
    title?: string | null;
    subtitle?: string | null;
    message?: string | null;
    hero_cards?: RevenueCycleBoardPackKpi[];
  };
  storyline?: {
    title?: string | null;
    subtitle?: string | null;
    cards?: RevenueCycleBoardPackCard[];
  };
  cash_command?: CashCommandPayload;
  recovery_queue?: RecoveryQueuePayload;
  decision_layer?: {
    workflow_configured?: boolean;
    title?: string | null;
    subtitle?: string | null;
    message?: string | null;
    kpis?: RevenueCycleBoardPackKpi[];
    cards?: RevenueCycleBoardPackCard[];
    payload?: RCMDecisionQueuePayload;
  };
  board_talk_track?: string | null;
  data_trust?: {
    generated_at?: string | null;
    period?: {
      date_from?: string | null;
      date_to?: string | null;
      label?: string | null;
    };
    currency?: string | null;
    filters_applied?: Record<string, unknown>;
    source_tables?: Array<{ table: string; role?: string | null; loaded?: boolean | null }>;
    source_freshness?: Array<{ label: string; status?: string | null }>;
    metric_definitions?: Array<{ label: string; definition: string }>;
    missing_metrics?: string[];
    unavailable_fields?: string[];
    warnings?: string[];
    limitations?: string[];
    scoring_logic?: string[];
  };
};

export type RCMDecisionWorkspacePayload = {
  generated_at?: string | null;
  decision?: RCMDecision | null;
  audit_trail?: Array<{
    id?: number | null;
    previous_state?: string | null;
    new_state?: string | null;
    action?: string | null;
    performed_by?: string | null;
    performed_by_role?: string | null;
    reason?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at?: string | null;
  }>;
  notifications?: Array<{
    id?: number | null;
    notification_type?: string | null;
    channel?: string | null;
    recipient_email?: string | null;
    recipient_team?: string | null;
    recipient_user?: string | null;
    subject?: string | null;
    sent_at?: string | null;
    delivery_status?: string | null;
    error_message?: string | null;
  }>;
  outcome_review?: {
    enabled?: boolean | null;
    reason?: string | null;
    [key: string]: unknown;
  } | null;
};

export type PayerControlItem = {
  payer_id?: string | null;
  gross_billed?: number | null;
  contracted_amount?: number | null;
  paid_amount?: number | null;
  underpayment_amount?: number | null;
  contract_rate_pct?: number | null;
  actual_collection_rate?: number | null;
  payment_sla_days?: number | null;
  actual_payment_days?: number | null;
  sla_breach_count?: number | null;
  contract_breach_flag?: boolean | null;
  renegotiation_flag?: boolean | null;
};

export type PayerControlPayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  summary?: {
    total_underpayment?: number | null;
    sla_breaches?: number | null;
    breach_flag_count?: number | null;
  };
  items?: PayerControlItem[];
};

// ─── LEAKAGE ─────────────────────────────────────────────────────────────────

export type LeakageRow = {
  leakage_type?: string | null;
  item_count?: number | null;
  leakage_amount?: number | null;
  last_detected_at?: string | null;
};

export type LeakagePayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  totals?: Record<string, number>;
  breakdown?: LeakageRow[];
};

// ─── TEAM PERFORMANCE ────────────────────────────────────────────────────────

export type TeamPerformanceRow = {
  owner_team?: string | null;
  owner_user_id?: string | null;
  assigned_count?: number | null;
  completed_count?: number | null;
  in_progress_count?: number | null;
  expected_recovery?: number | null;
  actual_recovery?: number | null;
  recovery_variance_pct?: number | null;
  avg_resolution_hours?: number | null;
  sla_target_hours?: number | null;
  overdue_count?: number | null;
};

export type TeamPerformancePayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  period?: string;
  summary?: {
    assigned?: number | null;
    completed?: number | null;
    expected_recovery?: number | null;
    actual_recovery?: number | null;
  };
  items?: TeamPerformanceRow[];
};

// ─── EXECUTIVE NARRATIVE ─────────────────────────────────────────────────────

export type NarrativePayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  headline?: string | null;
  key_drivers?: string[];
  cash_impact?: {
    recoverable_cash_7d?: number | null;
    recoverable_cash_14d?: number | null;
    cash_at_risk?: number | null;
    expected_collections?: number | null;
  } | null;
  recommended_actions?: Array<{
    action?: string | null;
    owner?: string | null;
    expected_recovery?: number | null;
    opportunity_id?: string | null;
    issue_type?: string | null;
  }>;
  risks?: Array<{
    risk?: string | null;
    payer?: string | null;
    cash_impact?: number | null;
    severity?: "critical" | "watch" | null;
  }>;
  next_steps?: string[];
};
