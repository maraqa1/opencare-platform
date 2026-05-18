export type TrustStatus = "trusted" | "in_progress" | "needs_review" | "degraded" | "unknown";
export type Classification = "public" | "internal" | "confidential" | "restricted";
export type Sensitivity = "low" | "medium" | "high";
export type Severity = "low" | "medium" | "high" | "critical";
export type SignalStatus = "pass" | "warn" | "fail" | "unknown";
export type EvidenceState = "loaded" | "unknown" | "not_configured" | "not_instrumented" | "no_evidence_loaded";

export type EvidenceSource = {
  source_id: string;
  source_type: string;
  state: EvidenceState;
  detail?: string | null;
};

export type GovernanceSignal = {
  name: "freshness" | "quality" | "ownership" | "coverage";
  status: SignalStatus;
  evidence: EvidenceSource;
};

export type UseCaseGovernanceRecord = {
  slug: string;
  name: string;
  domain?: string | null;
  maturity?: string | null;
  owner?: string | null;
  steward?: string | null;
  trust_status: TrustStatus;
  signals: GovernanceSignal[];
};

export type MetricGovernanceRecord = {
  id: string;
  use_case_slug: string;
  name: string;
  definition?: string | null;
  formula?: string | null;
  owner?: string | null;
  source_table_id?: string | null;
  consumers: string[];
  trust_status: TrustStatus;
  evidence: EvidenceSource[];
};

export type AttributeRecord = {
  id: string;
  table_id: string;
  name: string;
  business_name?: string | null;
  data_type?: string | null;
  description?: string | null;
  source_table?: string | null;
  source_system?: string | null;
  classification: Classification | "unknown";
  sensitivity: Sensitivity | "unknown";
  policy_id?: string | null;
  policy_version?: string | null;
  matched_rule?: string | null;
  owner?: string | null;
  steward?: string | null;
  review_status: string;
  reviewer?: string | null;
  last_reviewed?: string | null;
  active_exception?: Record<string, unknown> | null;
  consumers: string[];
  lineage_route?: string | null;
  history: Record<string, unknown>[];
  evidence: EvidenceSource;
};

export type TableGovernanceRecord = {
  id: string;
  use_case_slug: string;
  name: string;
  schema_name?: string | null;
  table_name?: string | null;
  owner?: string | null;
  steward?: string | null;
  consumers: string[];
  trust_status: TrustStatus;
  attributes: AttributeRecord[];
  evidence: EvidenceSource[];
};

export type IssueRecord = {
  id: string;
  issue_type: string;
  status: "open" | "assigned" | "resolved" | "ignored";
  severity: Severity;
  use_case_slug?: string | null;
  impacted_asset_id?: string | null;
  title: string;
  description?: string | null;
  assigned_owner?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PolicyRecord = {
  policy_id: string;
  name: string;
  version: string;
  status: "draft" | "active" | "retired" | "superseded";
  owner?: string | null;
  standard_or_framework?: string | null;
  scope: string[];
  rules: Record<string, unknown>[];
  evidence: EvidenceSource;
};

export type AuditEvent = {
  id?: string | null;
  actor: string;
  role: string;
  event_type: string;
  target_type: string;
  target_id: string;
  use_case_slug?: string | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  reason?: string | null;
  request_id?: string | null;
  approval_chain: Record<string, unknown>[];
  timestamp?: string | null;
};

export type ExceptionRecord = {
  id: string;
  target_type: string;
  target_id: string;
  owner: string;
  reason: string;
  expiry_date: string;
  status: "active" | "expired" | "revoked";
  evidence: EvidenceSource;
};

export type EvidencePackDescriptor = {
  id: string;
  name: string;
  description: string;
  state: EvidenceState;
  evidence_sources: EvidenceSource[];
};
