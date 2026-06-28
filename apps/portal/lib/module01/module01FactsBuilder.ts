const missing = "Not provided in diagnostic input.";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : missing;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return missing;
}

function priorityWeight(value: unknown) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("critical")) return 0;
  if (normalized.includes("high")) return 1;
  if (normalized.includes("medium")) return 2;
  if (normalized.includes("watch") || normalized.includes("low")) return 3;
  return 4;
}

function normalizeDomain(entry: unknown) {
  const item = asRecord(entry);
  const gap = numberOrNull(item.gap ?? item.avgGap ?? item.gap_to_target);
  return {
    domain: firstText(item.domain, item.name, item.nameEn, item.domain_name),
    score: numberOrNull(item.score ?? item.avgScore ?? item.maturity),
    gap,
    priority: firstText(item.priority, item.severity),
    rootCauseRank: numberOrNull(item.rootCauseRank ?? item.root_cause_rank),
    evidenceIds: asArray(item.evidenceIds ?? item.evidence_ids).filter((value): value is string => typeof value === "string"),
  };
}

function buildEvidenceIndex(responses: unknown[]) {
  return responses.reduce<Record<string, AnyRecord>>((index, response) => {
    const item = asRecord(response);
    const evidenceId = firstText(item.evidence_id, item.evidenceId);
    if (evidenceId !== missing) {
      index[evidenceId] = item;
    }
    return index;
  }, {});
}

function arrayOrMissing(values: unknown[]) {
  return values.length > 0 ? values : [missing];
}

export function buildModule01Facts(input: unknown) {
  const root = asRecord(input);
  const enterprise = asRecord(root.enterprise_context ?? root.enterpriseContext);
  const customer = asRecord(root.customer_context ?? root.customerContext);
  const summary = asRecord(root.summary);
  const dependencyGraph = asRecord(root.dependency_graph ?? root.dependencyGraph);
  const domainRollup = asArray(root.domain_rollup ?? root.domainRollup ?? root.topGapDomains).map(normalizeDomain);
  const strongestDomains = asArray(root.strongestDomains ?? root.strongest_domains).map(normalizeDomain);
  const responses = asArray(root.responses);
  const useCases = asArray(root.candidate_use_cases ?? root.candidateUseCases);
  const totalQuestions = numberOrNull(root.totalQuestions ?? summary.totalQuestions ?? summary.total_questions);
  const scoredQuestionsCount = numberOrNull(root.scoredQuestions ?? summary.scoredQuestionsCount ?? summary.scored_questions_count);
  const evidenceBackedCount = numberOrNull(root.evidenceBackedItems ?? summary.evidenceBackedCount ?? summary.evidence_backed_count);
  const computedEvidenceCoveragePct = totalQuestions && evidenceBackedCount !== null
    ? Math.round((evidenceBackedCount / totalQuestions) * 100)
    : null;
  const suppliedCriticalDomains = asArray(summary.criticalDomains ?? summary.critical_domains)
    .map((value) => typeof value === "string" ? value : firstText(asRecord(value).domain, asRecord(value).name))
    .filter((value) => value !== missing);
  const topPriorityDomains = [...domainRollup].sort((left, right) =>
    priorityWeight(left.priority) - priorityWeight(right.priority)
    || ((right.gap ?? -1) - (left.gap ?? -1))
    || ((left.rootCauseRank ?? 999) - (right.rootCauseRank ?? 999))
  );

  const common = {
    clientName: firstText(customer.clientName, customer.customerName, customer.name),
    sector: firstText(customer.sector, customer.industry),
    businessDomain: firstText(customer.businessDomain, customer.business_domain),
    audience: firstText(customer.audience, customer.reportAudience, customer.targetAudience),
    purpose: firstText(customer.purpose, customer.reportPurpose),
    overallMaturity: numberOrNull(summary.overallMaturity ?? summary.overallScore ?? root.overallScore),
    overallGap: numberOrNull(summary.overallGap ?? root.overallGap),
    maturityBand: firstText(summary.maturityBand, summary.maturity_label, summary.maturityLabel),
    questionsScored: firstText(
      summary.questionsScored,
      summary.questions_scored,
      scoredQuestionsCount !== null && totalQuestions !== null ? `${scoredQuestionsCount}/${totalQuestions}` : undefined,
    ),
    evidenceBacked: firstText(
      summary.evidenceBacked,
      summary.evidence_backed,
      evidenceBackedCount !== null && totalQuestions !== null ? `${evidenceBackedCount}/${totalQuestions}` : undefined,
    ),
    evidenceCoveragePct: numberOrNull(summary.evidenceCoveragePct ?? summary.evidence_coverage_pct ?? root.evidenceCoveragePct) ?? computedEvidenceCoveragePct,
    criticalDomains: arrayOrMissing(suppliedCriticalDomains.length > 0
      ? suppliedCriticalDomains
      : topPriorityDomains.slice(0, 3).map((domain) => domain.domain).filter((domain) => domain !== missing)),
    topRootCauses: arrayOrMissing(asArray(
      summary.topRootCauses
      ?? summary.top_root_causes
      ?? summary.rootCauseRanking
      ?? summary.root_cause_ranking
      ?? dependencyGraph.topRootCauses
      ?? dependencyGraph.top_root_causes
      ?? dependencyGraph.rootCauseRanking
      ?? dependencyGraph.root_cause_ranking,
    )),
    topPriorityDomains,
    strongestDomains: strongestDomains.slice(0, 3),
    useCases,
    evidenceItems: buildEvidenceIndex(responses),
    technologyLandscape: firstText(enterprise.technologyLandscape, enterprise.technology_landscape),
    painPoints: firstText(enterprise.painPoints, enterprise.pain_points),
    executiveExpectations: firstText(enterprise.executiveExpectations, enterprise.executive_expectations),
    regulatoryContext: firstText(enterprise.regulatoryContext, enterprise.regulatory_context),
  };

  return {
    executiveSummaryFacts: {
      clientName: common.clientName,
      sector: common.sector,
      businessDomain: common.businessDomain,
      purpose: common.purpose,
      overallMaturity: common.overallMaturity,
      maturityBand: common.maturityBand,
      criticalDomains: common.criticalDomains,
      evidenceCoveragePct: common.evidenceCoveragePct,
    },
    boardScorecardFacts: {
      clientName: common.clientName,
      audience: common.audience,
      overallMaturity: common.overallMaturity,
      overallGap: common.overallGap,
      maturityBand: common.maturityBand,
      questionsScored: common.questionsScored,
      evidenceBacked: common.evidenceBacked,
      evidenceCoveragePct: common.evidenceCoveragePct,
      strongestDomains: common.strongestDomains,
      weakestDomains: common.topPriorityDomains.slice(0, 3),
      criticalDomains: common.criticalDomains,
      topPriorityDomains: common.topPriorityDomains.slice(0, 5),
    },
    overallSynthesisFacts: {
      clientName: common.clientName,
      businessDomain: common.businessDomain,
      criticalDomains: common.criticalDomains,
      topRootCauses: common.topRootCauses,
      painPoints: common.painPoints,
      executiveExpectations: common.executiveExpectations,
    },
    materialFindingsFacts: {
      clientName: common.clientName,
      topPriorityDomains: common.topPriorityDomains.slice(0, 5),
      evidenceItems: common.evidenceItems,
    },
    domainActionPlanFacts: {
      clientName: common.clientName,
      topPriorityDomains: common.topPriorityDomains.slice(0, 5),
      topRootCauses: common.topRootCauses,
    },
    aiReadinessFacts: {
      clientName: common.clientName,
      overallMaturity: common.overallMaturity,
      evidenceCoveragePct: common.evidenceCoveragePct,
      useCases: common.useCases,
      regulatoryContext: common.regulatoryContext,
    },
    roadmapFacts: {
      clientName: common.clientName,
      topPriorityDomains: common.topPriorityDomains.slice(0, 5),
      useCases: common.useCases,
      technologyLandscape: common.technologyLandscape,
    },
    boardDecisionsFacts: {
      clientName: common.clientName,
      audience: common.audience,
      purpose: common.purpose,
      topPriorityDomains: common.topPriorityDomains.slice(0, 5),
      useCases: common.useCases,
    },
  };
}

export const module01MissingFact = missing;
