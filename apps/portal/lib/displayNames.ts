const ISSUE_TYPE_LABELS: Record<string, string> = {
  late_submission_risk: "Late submission risk",
  denial_coding_error: "Coding error denial",
  denial_clinical: "Clinical denial",
  denial_eligibility: "Eligibility denial",
  denial_appeal_priority: "Denial appeal priority",
  payer_underpayment_review: "Underpayment review",
  underpayment: "Underpayment",
  missing_authorization: "Missing authorisation",
  unbilled_encounter: "Unbilled encounter",
  unbilled_encounters: "Unbilled encounters",
  denied_not_appealed: "Denied claims not yet appealed",
  undercoding: "Undercoding",
  underpayments: "Underpayments",
  writeoffs: "Write-offs",
  late_submissions: "Late submissions",
  recover_cash_this_week: "Recover cash this week",
  coding_backlog_escalation: "Coding backlog escalation",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  submitted: "Submitted",
  in_appeal: "In Appeal",
  appeal_pending: "Appeal Pending",
  in_progress: "In Progress",
  under_review: "Under Review",
  escalated: "Escalated",
  completed: "Completed",
  resolved: "Resolved",
  dismissed: "Dismissed",
  expired: "Expired",
  closed: "Closed",
  write_off_risk: "Write-off Risk",
};

const OWNER_LABELS: Record<string, string> = {
  "j.mitchell": "J. Mitchell - Denials",
  "s.okafor": "S. Okafor - AR",
  "t.brennan": "T. Brennan - Coding",
  "revenue.integrity": "Revenue Integrity Team",
  "payer.relations": "Payer Relations Team",
  "denials.lead": "Denials Lead",
  "coding.lead": "Coding Lead",
  "patient.access": "Patient Access Team",
  "finance.control": "Finance Control",
};

const PAYER_LABELS: Record<string, string> = {
  BCBS: "BlueCross BlueShield",
  UHC: "United Health",
  MCR: "Medicare",
  MCD: "Medicaid MCO",
  AETNA: "Aetna Commercial",
  HUM: "Humana PPO",
  "PAYER-A": "BlueCross BlueShield",
  "PAYER-B": "United Health",
  "PAYER-C": "Medicare",
  "PAYER-D": "Medicaid MCO",
};

const DEPARTMENT_LABELS: Record<string, string> = {
  "WARD-ED": "Emergency Department",
  "WARD-ORTH": "Orthopaedics",
  "WARD-CARD": "Cardiology",
  "WARD-SURG": "General Surgery",
  "WARD-ONC": "Oncology",
  "WARD-MED": "General Medicine",
  "WARD-OB": "Obstetrics",
};

const LEAKAGE_GUIDANCE: Record<string, string> = {
  denied_not_appealed: "~65% recoverable via appeal - highest ROI category",
  late_submissions: "Preventable with submission deadline tracking",
  underpayments: "Requires EOB audit against contracted rates",
  unbilled_encounters: "Trace to department - charge capture failure",
  writeoffs: "Separate charity care from recoverable bad debt",
  missing_authorization: "Preventable at point of registration",
  undercoding: "Requires CDI and coding team review",
};

const RECOVERABILITY: Record<string, string> = {
  denied_not_appealed: "High",
  late_submissions: "Medium",
  underpayments: "High",
  unbilled_encounters: "High",
  writeoffs: "Low",
  missing_authorization: "Medium",
  undercoding: "Medium",
};

const NEXT_STEPS: Record<string, string> = {
  late_submission_risk:  "Submit claim before filing deadline",
  denial_coding_error:   "Correct CPT/ICD code and resubmit",
  denial_clinical:       "Obtain clinical documentation and appeal",
  underpayment:          "Request EOB and log underpayment dispute",
  denial_eligibility:    "Verify eligibility and resubmit",
  missing_authorization: "Obtain retroactive authorisation",
  unbilled_encounter:    "Route to charge capture for billing",
};

// Direct object exports for component-level use
export { ISSUE_TYPE_LABELS, OWNER_LABELS, LEAKAGE_GUIDANCE, RECOVERABILITY, NEXT_STEPS };

function prettifyToken(value?: string | null) {
  return (value ?? "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function issueTypeLabel(value?: string | null) {
  if (!value) return "";
  return ISSUE_TYPE_LABELS[value] ?? prettifyToken(value);
}

export function statusLabel(value?: string | null) {
  if (!value) return "";
  return STATUS_LABELS[value] ?? prettifyToken(value);
}

export function ownerLabel(value?: string | null) {
  if (!value) return "Unassigned";
  return OWNER_LABELS[value] ?? prettifyToken(value);
}

export function payerLabel(value?: string | null) {
  if (!value) return "Payer pending";
  return PAYER_LABELS[value] ?? value;
}

export function departmentLabel(value?: string | null) {
  if (!value) return "Department pending";
  return DEPARTMENT_LABELS[value] ?? value;
}

export function leakageGuidance(value?: string | null) {
  if (!value) return "";
  return LEAKAGE_GUIDANCE[value] ?? "";
}

export function leakageRecoverability(value?: string | null) {
  if (!value) return "";
  return RECOVERABILITY[value] ?? "";
}

export function genericLabel(value?: string | null) {
  return prettifyToken(value);
}
