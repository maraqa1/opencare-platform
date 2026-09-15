import { industryProfiles, resolveIndustryQuestions, type IndustryProfileId } from "./module01IndustryProfiles";
import { seedDatasetOptions, type CustomerContext, type QuestionState, type SeedDatasetLevel } from "./module01SeedData";

const fictionalOrganizations: Record<IndustryProfileId, { name: string; scope: string; priority: string }> = {
  "cross-industry": { name: "Example Meridian Services", scope: "shared business services and operational reporting", priority: "consistent service measures and accountable reporting" },
  healthcare: { name: "Example Cedar Health", scope: "patient appointments, clinical services and care coordination", priority: "patient access and care quality" },
  manufacturing: { name: "Example Prism Manufacturing", scope: "production lines, materials and product quality", priority: "production yield and defect reduction" },
  banking: { name: "Example Harbor Bank", scope: "deposit accounts, lending and payment operations", priority: "credit risk visibility and payment reconciliation" },
  "real-estate": { name: "Example Mosaic Properties", scope: "properties, leases and tenant services", priority: "lease reporting and property performance" },
  utilities: { name: "Example Beacon Utilities", scope: "meters, network maintenance and outage response", priority: "network reliability and outage resolution" },
};

type SeedTopic = { subject: string; evidence: string; action: string };

const domainTopics: Record<number, SeedTopic> = {
  1: { subject: "strategy and business value", evidence: "a strategy roadmap and benefits register", action: "Link priority initiatives to measurable outcomes, accountable sponsors and review dates" },
  2: { subject: "data governance", evidence: "an ownership matrix and decision log", action: "Confirm decision rights, accountable owners and issue escalation routes" },
  3: { subject: "data architecture", evidence: "a system inventory and interface map", action: "Document authoritative sources, interface dependencies and architecture review decisions" },
  4: { subject: "data quality and master records", evidence: "validation rules and an exception register", action: "Define acceptance thresholds, reconcile master records and assign defect resolution owners" },
  5: { subject: "metadata and lineage", evidence: "a glossary and source-to-report mapping", action: "Record approved definitions, transformation logic and dataset ownership" },
  6: { subject: "reporting and analytics", evidence: "indicator definitions and reconciliation samples", action: "Reconcile report measures to source data and document refresh timing and limitations" },
  7: { subject: "AI readiness", evidence: "a use-case assessment and validation plan", action: "Assess data suitability, model risks, human oversight and fallback arrangements before deployment" },
  8: { subject: "tools and platforms", evidence: "a platform inventory and access configuration sample", action: "Review platform ownership, integration controls and operational support responsibilities" },
  9: { subject: "people and capabilities", evidence: "a role matrix and capability assessment", action: "Assign delivery responsibilities and address role-specific capability gaps" },
  10: { subject: "privacy and security", evidence: "an access matrix and retention control checklist", action: "Review permitted use, access restrictions, retention and unresolved control exceptions" },
  11: { subject: "data sources and flows", evidence: "a source register and transfer schedule", action: "Confirm source ownership, transfer methods, refresh schedules and failure handling" },
  12: { subject: "decision enablement and adoption", evidence: "a decision-use log and adoption measures", action: "Track use of approved data in decisions and assign owners for adoption gaps" },
  13: { subject: "delivery and value measurement", evidence: "a delivery backlog and benefits review log", action: "Sequence remediation with owners, dependencies, milestones and measurable outcomes" },
};

const questionTopics: Record<string, SeedTopic> = {
  q014: domainTopics[3],
  q025: { subject: "record identification", evidence: "identifier mappings and duplicate-resolution examples", action: "Define stable identifiers, review cross-system mappings and record duplicate-resolution controls" },
  q047: { subject: "predictive data readiness", evidence: "a historical data profile and temporal validation plan", action: "Assess historical coverage, missing values and representative holdout data before model validation" },
  q059: domainTopics[10],
  q088: domainTopics[4],
  q089: domainTopics[5],
  q090: domainTopics[6],
  q091: domainTopics[7],
  q094: domainTopics[10],
};

function emptyAnswer(): QuestionState {
  return { score: null, evidenceStrength: "none", evidenceAvailable: "", notes: "", actionPlan: "" };
}

export function emptyIndustryAnswers(id: IndustryProfileId, functions: string[] = []): Record<string, QuestionState> {
  return Object.fromEntries(resolveIndustryQuestions(id, functions).map((question) => [question.id, emptyAnswer()]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownValue(record: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

function validAnswer(raw: unknown): QuestionState {
  const result = emptyAnswer();
  if (!isRecord(raw)) return result;
  const score = ownValue(raw, "score");
  if (typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 4) result.score = score;
  const strength = ownValue(raw, "evidenceStrength");
  if (strength === "none" || strength === "interview" || strength === "documented" || strength === "system" || strength === "audited") {
    result.evidenceStrength = strength;
  }
  for (const key of ["evidenceAvailable", "notes", "actionPlan"] as const) {
    const value = ownValue(raw, key);
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

/** Restore known question IDs only; legacy fields are not coerced or inferred. */
export function validateIndustryAnswers(id: IndustryProfileId, raw: unknown, functions: string[] = []): Record<string, QuestionState> {
  return Object.fromEntries(resolveIndustryQuestions(id, functions).map((question) => [
    question.id, validAnswer(isRecord(raw) ? ownValue(raw, question.id) : undefined),
  ]));
}

function isAnswered(answer: QuestionState): boolean {
  return answer.score !== null || answer.evidenceStrength !== "none"
    || [answer.evidenceAvailable, answer.notes, answer.actionPlan].some((value) => value.trim().length > 0);
}

export function migrateIndustryAnswers(
  from: IndustryProfileId,
  to: IndustryProfileId,
  answers: Record<string, QuestionState>,
): { answers: Record<string, QuestionState>; retainedIds: string[]; reviewIds: string[]; archivedAnswers: Record<string, QuestionState> } {
  const next = emptyIndustryAnswers(to);
  const source = new Map(resolveIndustryQuestions(from).map((question) => [question.id, question.variantKey]));
  const target = new Map(resolveIndustryQuestions(to).map((question) => [question.id, question.variantKey]));
  const retainedIds: string[] = [];
  const reviewIds: string[] = [];
  const archivedAnswers: Record<string, QuestionState> = {};
  for (const [id, variantKey] of source) {
    if (!Object.hasOwn(answers, id)) continue;
    const original = answers[id];
    if (target.has(id) && target.get(id) === variantKey) {
      next[id] = { ...original };
      retainedIds.push(id);
    } else {
      archivedAnswers[id] = { ...original };
      if (target.has(id) && isAnswered(original)) reviewIds.push(id);
    }
  }
  return { answers: next, retainedIds, reviewIds, archivedAnswers };
}

export function buildIndustrySeed(
  industryId: IndustryProfileId,
  level: SeedDatasetLevel,
  functions: string[] = [],
): { customerContext: CustomerContext; answers: Record<string, QuestionState> } {
  const dataset = seedDatasetOptions.find((option) => option.id === level);
  if (!dataset) throw new Error(`Unknown seed dataset level: ${level}`);
  const organization = fictionalOrganizations[industryId];
  const profile = industryProfiles.find((candidate) => candidate.id === industryId);
  if (!profile || !organization) throw new Error(`Unknown industry profile: ${industryId}`);
  const customerContext: CustomerContext = {
    customerName: `${organization.name} (fictional)`,
    businessDomain: profile.labelEn,
    operatingScope: `Fictional demonstration organization covering ${organization.scope}.`,
    strategicPriorities: `Synthetic priorities: ${organization.priority}.`,
    currentPainPoints: `Synthetic scenario: inconsistent definitions and incomplete ownership across ${organization.scope}.`,
    targetAudience: "Executive sponsors, data owners, analysts and governance leads.",
    reportPurpose: "Fictional assessment demonstration only. Synthetic content is not validated evidence or proof of assurance.",
  };
  const coreVariants = new Map(resolveIndustryQuestions("cross-industry").map((question) => [question.id, question.variantKey]));
  const strengths: QuestionState["evidenceStrength"][] = level === "interview-light"
    ? ["none", "interview", "interview", "none"]
    : level === "evidence-enriched"
      ? ["interview", "documented", "system", "documented"]
      : ["documented", "system", "system", "documented"];
  const answers = Object.fromEntries(resolveIndustryQuestions(industryId, functions).map((question, index) => {
    // Core variants can be shared by only a subset of sectors and must still stay neutral.
    const core = coreVariants.get(question.id) === question.variantKey;
    const topic = question.functionId ? {
      subject: `${question.functionLabel}: ${domainTopics[question.domainId].subject}`,
      evidence: question.evidenceRequired,
      action: `Assign the ${question.functionLabel} owner to validate the requested evidence and resolve ${domainTopics[question.domainId].subject} gaps`,
    } : questionTopics[question.id] ?? domainTopics[question.domainId];
    const scope = core ? "" : ` Scope: ${organization.scope}.`;
    const evidenceStrength = strengths[index % strengths.length];
    const artefact = evidenceStrength === "none" ? `No supporting artefact is supplied for ${topic.subject}; the evidence request covers ${topic.evidence}`
      : evidenceStrength === "interview" ? `An invented interview summary discusses ${topic.evidence}; no artefact has been verified`
        : evidenceStrength === "documented" ? `An invented document pack illustrates ${topic.evidence}; these are not verified records`
          : `An invented system extract accompanies ${topic.evidence}; no live system has been inspected`;
    const observation = level === "interview-light" ? "Ownership and evidence completeness remain unconfirmed"
      : level === "evidence-enriched" ? "Sample documentation is available in the scenario, with unresolved completeness and reconciliation gaps"
        : "The scenario includes a prepared review pack, but operational effectiveness and independent assurance remain unverified";
    return [question.id, {
      score: Math.max(0, Math.min(4, 1 + index % 3 + dataset.scoreShift)),
      evidenceStrength,
      evidenceAvailable: `Synthetic fictional evidence: ${artefact}.${scope} No independent assurance is asserted.`,
      notes: `Synthetic fictional assessment of ${topic.subject}. ${observation}.${scope}`,
      actionPlan: `Synthetic action plan: ${topic.action}; record the responsible owner and follow-up date.${scope}`,
    } satisfies QuestionState];
  }));
  return { customerContext, answers };
}
