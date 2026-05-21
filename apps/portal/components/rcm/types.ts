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
  claim_id?: string | null;
  payer_id?: string | null;
  department_id?: string | null;
  recoverable_amount?: number | null;
  expected_recovery_amount?: number | null;
  due_date?: string | null;
  owner_team?: string | null;
  owner_user_id?: string | null;
  status?: string | null;
  next_step?: string | null;
  evidence_summary?: string | null;
};

export type CashCommandPayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  recoverable_cash_7d?: number | null;
  recoverable_cash_14d?: number | null;
  cash_at_risk?: number | null;
  expected_collections?: number | null;
  top_actions?: ActionItem[];
  expiring_opportunities?: ActionItem[];
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
};

export type RecoveryQueuePayload = {
  as_of?: string | null;
  data_freshness?: { seconds?: number | null; status?: string | null };
  meta?: RCMMeta;
  total?: number;
  items?: RecoveryQueueItem[];
};

// ─── PAYER CONTROL ───────────────────────────────────────────────────────────

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
