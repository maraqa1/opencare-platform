"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  dataAiDiagnosticDomains,
  dataAiDiagnosticQuestions,
  dataAiReportPrompts,
  type DataAiDiagnosticQuestion,
} from "@/lib/data-ai-diagnostic";
import {
  buildDiagnosticStrategyHandoff,
  clearLatestDiagnosticStrategyHandoff,
  saveLatestDiagnosticStrategyHandoff,
} from "@/lib/data-ai-diagnostic-handoff";
import {
  emptyCustomerContext,
  seedDatasetOptions,
  type CustomerContext,
  type EvidenceStrength,
  type QuestionState,
  type SeedDatasetLevel,
} from "@/lib/module01/module01SeedData";
import {
  getIndustryProfile, industryProfiles, isIndustryProfileId, INDUSTRY_PROFILE_VERSION,
  resolveIndustryDomains, resolveIndustryQuestions, type IndustryProfileId,
} from "@/lib/module01/module01IndustryProfiles";
import {
  buildIndustrySeed, emptyIndustryAnswers, migrateIndustryAnswers, validateIndustryAnswers,
} from "@/lib/module01/module01IndustryAssessment";
import "./industry-profile.css";
import DiscoveryEditor, { ArchitectureDiagram } from "./discovery-editor";
import { emptyDiscovery, normaliseDiscovery, type Discovery } from "@/lib/module01/module01Discovery";
import { industryFunctions, normaliseFunctions, FUNCTION_CATALOGUE_VERSION, type FunctionalFinding } from "@/lib/module01/module01FunctionalDomains";

type ActiveTab = "capture" | "dashboard" | "gartner" | "gaps" | "report" | "evidence";

type GeneratedConsultingReport = {
  discovery?: Discovery;
  functionalFindings?: FunctionalFinding[];
  executiveSummary?: string;
  overallAdvisoryNarrative?: string;
  boardScorecardNarrative?: string;
  headlineAssessment?: string;
  readinessThesis?: string;
  boardMessage?: string;
  boardAsks?: string[];
  capabilityPillarAssessment?: string[];
  materialFindings?: string[];
  domainActionPlan?: string[];
  priorityGapRegister?: string[];
  recommendedDecisions?: string[];
  ninetyDayPlan?: string[];
  roadmapPhases?: string[];
  aiReadinessGate?: string;
  aiGateProceed?: string[];
  aiGatePilotWithControls?: string[];
  aiGateHold?: string[];
  risks?: string[];
  nextSteps?: string[];
};

type DiagnosticReportApiResponse = {
  status?: string;
  message?: string;
  report?: GeneratedConsultingReport;
  markdownReport?: string;
  markdownReportSource?: "llm" | "fallback";
  markdownReportMetadata?: {
    source?: "llm" | "fallback";
    model?: string;
    durationMs?: number;
    error?: string;
    inputTokenEstimate?: number;
  };
  model?: string;
  gateway?: string;
  details?: string[];
  fallback?: boolean;
  repaired?: boolean;
  sectionFallbacks?: string[];
  repairedSections?: string[];
  fieldFallbacks?: string[];
  enrichedFields?: string[];
  generationMetadata?: {
    mode?: string;
    fields?: Record<string, {
      status?: string;
      model?: string;
      durationMs?: number;
      validationStatus?: string;
      retryAttempted?: boolean;
      fallbackUsed?: boolean;
      responseLength?: number;
      rawResponseLength?: number;
      sanitizedResponseLength?: number;
      generatedAt?: string;
      rejectionReason?: string;
      ai2FieldValidationStatus?: string;
      ai2RejectionReason?: string;
      ai2FallbackUsed?: boolean;
      ai2RetrievalMode?: string;
      ai2CitationCount?: number;
    }>;
    markdownReport?: {
      source?: "llm" | "fallback";
      model?: string;
      durationMs?: number;
      error?: string;
      inputTokenEstimate?: number;
    };
    sections?: Record<string, {
      source?: string;
      attempts?: number;
      validJson?: boolean;
      repaired?: boolean;
      error?: string;
    }>;
  };
};

type AiEnrichmentFieldStatus = NonNullable<NonNullable<DiagnosticReportApiResponse["generationMetadata"]>["fields"]>[string];

type MarkdownBlock =
  | { type: "h1" | "h2" | "h3" | "p"; text: string }
  | { type: "ul" | "ol"; items: string[] };

type DomainSummary = {
  id: number;
  nameEn: string;
  nameAr: string;
  total: number;
  scored: number;
  avgScore: number | null;
  avgGap: number | null;
  priority: "critical" | "high" | "medium" | "watch" | "not_scored";
};

type GartnerPillar = {
  id: number;
  name: string;
  shortName: string;
  description: string;
  domainIds: number[];
  decisionQuestion: string;
  managementAction: string;
};

type GartnerPillarSummary = GartnerPillar & {
  total: number;
  scored: number;
  avgScore: number | null;
  avgGap: number | null;
  evidenceBacked: number;
  evidenceCoveragePct: number;
  priority: DomainSummary["priority"];
};

const tabs: Array<{ id: ActiveTab; label: string }> = [
  { id: "capture", label: "Data capture" },
  { id: "dashboard", label: "Maturity dashboard" },
  { id: "gartner", label: "Capability pillars" },
  { id: "gaps", label: "Gap matrix" },
  { id: "report", label: "AI report" },
  { id: "evidence", label: "Evidence model" },
];

const gartnerPillars = [
  {
    id: 1,
    name: "Strategy & Business Outcomes",
    shortName: "Strategy",
    description: "Connect data, analytics, and AI work to measurable business outcomes, funded priorities, and executive decisions.",
    domainIds: [1, 13],
    decisionQuestion: "Are data and AI initiatives tied to value, ownership, roadmap, and benefits measurement?",
    managementAction: "Confirm executive sponsorship, value cases, funding route, and benefits tracking.",
  },
  {
    id: 2,
    name: "Governance & Operating Model",
    shortName: "Governance",
    description: "Define decision rights, policy, ownership, stewardship, risk controls, and accountable operating cadence.",
    domainIds: [2, 10],
    decisionQuestion: "Are ownership, policy, privacy, security, and decision rights clear enough to scale safely?",
    managementAction: "Stand up data council cadence, RACI, policy controls, and approval workflows.",
  },
  {
    id: 3,
    name: "Data Management & Quality",
    shortName: "Data quality",
    description: "Control critical data, quality, master data, metadata, lineage, source flows, and evidence of trust.",
    domainIds: [4, 5, 11],
    decisionQuestion: "Can the organisation prove the data is complete, understood, traceable, and fit for use?",
    managementAction: "Prioritise critical data elements, DQ rules, lineage, catalogue, and issue management.",
  },
  {
    id: 4,
    name: "Architecture & Platforms",
    shortName: "Architecture",
    description: "Provide scalable architecture, integration, platforms, tooling, and runtime foundations for analytics and AI.",
    domainIds: [3, 8],
    decisionQuestion: "Can the platform support governed ingestion, modelling, analytics, AI runtime, and operational scale?",
    managementAction: "Confirm target architecture, integration pattern, tooling standards, and platform roadmap.",
  },
  {
    id: 5,
    name: "Analytics, AI & Decisioning",
    shortName: "Analytics & AI",
    description: "Turn governed data into dashboards, diagnostics, predictions, AI use cases, and human-approved decisions.",
    domainIds: [6, 7],
    decisionQuestion: "Which dashboards, models, and AI use cases can proceed now, pilot with controls, or hold?",
    managementAction: "Create the AI use-case gate, model-risk controls, dashboard certification, and decision logs.",
  },
  {
    id: 6,
    name: "People, Skills & Adoption",
    shortName: "People",
    description: "Build data literacy, operating roles, change adoption, training impact, and sustained behavioural change.",
    domainIds: [9, 12],
    decisionQuestion: "Do teams have the roles, skills, incentives, and training evidence needed to operate the model?",
    managementAction: "Map roles, training needs, champions, adoption plan, and capability transfer evidence.",
  },
  {
    id: 7,
    name: "Execution, Risk & Continuous Improvement",
    shortName: "Execution",
    description: "Manage delivery, risk, remediation, audit evidence, value realisation, and continuous improvement loops.",
    domainIds: [13, 2, 10],
    decisionQuestion: "Is there a repeatable mechanism to close gaps, escalate risks, and prove value improvement?",
    managementAction: "Create action queue, risk escalation, benefits review, and quarterly maturity refresh.",
  },
] satisfies GartnerPillar[];

const priorityLabels = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  watch: "Watch",
  not_scored: "Needs data",
} satisfies Record<DomainSummary["priority"], string>;

const scoreOptions = [
  { value: null, label: "No data", shortLabel: "NA", description: "No score assigned yet." },
  { value: 0, label: "0 - absent", shortLabel: "0", description: "No capability exists, or no evidence can be produced." },
  { value: 1, label: "1 - ad hoc", shortLabel: "1", description: "Informal, person-dependent, or interview-only practice." },
  { value: 2, label: "2 - defined", shortLabel: "2", description: "Documented or partially implemented, but inconsistent adoption." },
  { value: 3, label: "3 - managed", shortLabel: "3", description: "Implemented, repeatable, owner-led, and supported by evidence." },
  { value: 4, label: "4 - optimised", shortLabel: "4", description: "Governed, measured, reviewed, and continuously improved." },
] satisfies Array<{ value: number | null; label: string; shortLabel: string; description: string }>;

const evidenceStrengthOptions = [
  { value: "none", label: "No evidence", cap: 1, description: "No artifact or confirmation is available." },
  { value: "interview", label: "Interview only", cap: 2, description: "Claim or workshop response without an approved artifact." },
  { value: "documented", label: "Documented", cap: 3, description: "Approved policy, procedure, plan, RACI, or report sample." },
  { value: "system", label: "System evidence", cap: 4, description: "Dashboard, platform record, lineage, workflow, or telemetry evidence." },
  { value: "audited", label: "Audited", cap: 4, description: "Evidence has review history, controls, audit trail, or measured outcomes." },
] satisfies Array<{ value: EvidenceStrength; label: string; cap: number; description: string }>;

function initialState() {
  return Object.fromEntries(
    dataAiDiagnosticQuestions.map((question) => [
      question.id,
      {
        score: question.score,
        evidenceStrength: "none",
        evidenceAvailable: question.evidenceAvailable,
        notes: question.notes,
        actionPlan: question.actionPlan,
      } satisfies QuestionState,
    ]),
  ) as Record<string, QuestionState>;
}

function scoreGap(question: DataAiDiagnosticQuestion, state: QuestionState) {
  if (state.score === null) {
    return null;
  }
  return Math.max(question.target - state.score, 0);
}

function priorityForGap(gap: number | null): DomainSummary["priority"] {
  if (gap === null) return "not_scored";
  if (gap >= 3) return "critical";
  if (gap >= 2) return "high";
  if (gap >= 1) return "medium";
  return "watch";
}

function formatScore(value: number | null) {
  return value === null ? "No data" : value.toFixed(1);
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normaliseGeneratedReport(report: unknown): GeneratedConsultingReport {
  if (!report || typeof report !== "object") {
    return {};
  }
  const candidate = report as Record<string, unknown>;
  return {
    discovery: candidate.discovery ? normaliseDiscovery(candidate.discovery) : undefined,
    executiveSummary: asText(candidate.executiveSummary),
    overallAdvisoryNarrative: asText(candidate.overallAdvisoryNarrative),
    boardScorecardNarrative: asText(candidate.boardScorecardNarrative),
    headlineAssessment: asText(candidate.headlineAssessment),
    readinessThesis: asText(candidate.readinessThesis),
    boardMessage: asText(candidate.boardMessage),
    boardAsks: asStringList(candidate.boardAsks),
    capabilityPillarAssessment: asStringList(candidate.capabilityPillarAssessment ?? candidate.gartnerPillarAssessment),
    materialFindings: asStringList(candidate.materialFindings),
    domainActionPlan: asStringList(candidate.domainActionPlan),
    priorityGapRegister: asStringList(candidate.priorityGapRegister),
    recommendedDecisions: asStringList(candidate.recommendedDecisions),
    ninetyDayPlan: asStringList(candidate.ninetyDayPlan),
    roadmapPhases: asStringList(candidate.roadmapPhases),
    aiReadinessGate: asText(candidate.aiReadinessGate),
    aiGateProceed: asStringList(candidate.aiGateProceed),
    aiGatePilotWithControls: asStringList(candidate.aiGatePilotWithControls),
    aiGateHold: asStringList(candidate.aiGateHold),
    risks: asStringList(candidate.risks),
    nextSteps: asStringList(candidate.nextSteps),
  };
}

function scoreWidth(value: number | null) {
  if (value === null) return "0%";
  return `${Math.max(0, Math.min(100, (value / 4) * 100))}%`;
}

function buildDomainSummaries(
  stateByQuestion: Record<string, QuestionState>,
  questionSet: DataAiDiagnosticQuestion[] = dataAiDiagnosticQuestions,
  domains = dataAiDiagnosticDomains,
): DomainSummary[] {
  return domains.map((domain) => {
    const questions = questionSet.filter((question) => question.domainId === domain.id);
    const scored = questions.filter((question) => stateByQuestion[question.id]?.score !== null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (stateByQuestion[question.id]?.score ?? 0), 0) / scored.length
        : null;
    const avgGap =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (scoreGap(question, stateByQuestion[question.id]) ?? 0), 0) / scored.length
        : null;
    return {
      ...domain,
      total: questions.length,
      scored: scored.length,
      avgScore,
      avgGap,
      priority: priorityForGap(avgGap),
    };
  });
}

function buildGartnerPillarSummaries(
  stateByQuestion: Record<string, QuestionState>,
  questionSet: DataAiDiagnosticQuestion[] = dataAiDiagnosticQuestions,
): GartnerPillarSummary[] {
  return gartnerPillars.map((pillar) => {
    const questions = questionSet.filter((question) => pillar.domainIds.includes(question.domainId));
    const scored = questions.filter((question) => stateByQuestion[question.id]?.score !== null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (stateByQuestion[question.id]?.score ?? 0), 0) / scored.length
        : null;
    const avgGap =
      scored.length > 0
        ? scored.reduce((sum, question) => sum + (scoreGap(question, stateByQuestion[question.id]) ?? 0), 0) / scored.length
        : null;
    const evidenceBacked = questions.filter((question) => {
      const state = stateByQuestion[question.id];
      return state?.score !== null && state.evidenceStrength !== "none" && state.evidenceAvailable.trim();
    }).length;
    return {
      ...pillar,
      total: questions.length,
      scored: scored.length,
      avgScore,
      avgGap,
      evidenceBacked,
      evidenceCoveragePct: questions.length ? Math.round((evidenceBacked / questions.length) * 100) : 0,
      priority: priorityForGap(avgGap),
    };
  });
}

function statusForQuestion(question: DataAiDiagnosticQuestion, state: QuestionState) {
  return priorityForGap(scoreGap(question, state));
}

function evidenceCap(strength: EvidenceStrength) {
  return evidenceStrengthOptions.find((option) => option.value === strength)?.cap ?? 1;
}

function evidenceWarning(state: QuestionState) {
  if (state.score === null) {
    return "";
  }
  const cap = evidenceCap(state.evidenceStrength);
  if (state.score > cap) {
    return `Evidence strength usually supports a maximum score of ${cap}. Add stronger evidence or lower the score.`;
  }
  if (state.score >= 3 && !state.evidenceAvailable.trim()) {
    return "Scores 3-4 should include the specific evidence artifact, owner confirmation, or system record.";
  }
  return "";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function maturityLabel(value: number | null) {
  if (value === null) return "Not assessed";
  if (value < 1) return "Absent";
  if (value < 2) return "Ad hoc";
  if (value < 3) return "Defined";
  if (value < 3.6) return "Managed";
  return "Optimised";
}

function maturityProfilePhrase(value: number | null) {
  const label = maturityLabel(value).toLowerCase();
  if (label === "ad hoc" || label === "absent" || label === "optimised") {
    return `an ${label}`;
  }
  return `a ${label}`;
}

function domainActionForSummary(summary: DomainSummary) {
  const name = summary.nameEn.toLowerCase();
  const gap = summary.avgGap === null ? "unknown gap" : `${summary.avgGap.toFixed(1)} gap`;
  const prefix = `${summary.nameEn} (${gap}):`;

  if (summary.priority === "not_scored") {
    return `${prefix} capture baseline score, evidence note, evidence strength, and accountable owner before this domain is used in the report.`;
  }
  if (name.includes("quality") || name.includes("master")) {
    return `${prefix} appoint data-quality owner, define critical data elements, publish validation rules, log defects, and track monthly remediation closure.`;
  }
  if (name.includes("source") || name.includes("flow")) {
    return `${prefix} certify critical source inventory, system owners, refresh cadence, lineage, and unsupported manual exchanges before approving new reporting or AI use cases.`;
  }
  if (name.includes("strategy") || name.includes("business value")) {
    return `${prefix} confirm strategic data outcomes, value cases, prioritisation criteria, and the decision route for funding and sequencing initiatives.`;
  }
  if (name.includes("execution") || name.includes("roadmap") || name.includes("value measurement")) {
    return `${prefix} convert gaps into a benefits-led roadmap with initiative owners, dependencies, milestones, funding route, and steering committee cadence.`;
  }
  if (name.includes("people") || name.includes("capabil") || name.includes("training")) {
    return `${prefix} define role-based capability paths for owners, stewards, analysts, and AI users, tied to operating responsibilities.`;
  }
  if (name.includes("governance") || name.includes("operating model")) {
    return `${prefix} approve data-council decision rights, RACI, policy ownership, issue escalation, and evidence approval workflow.`;
  }
  if (name.includes("metadata") || name.includes("catalogue") || name.includes("lineage")) {
    return `${prefix} create glossary entries, catalogue priority datasets, map source-to-report lineage, and certify ownership for high-value reports.`;
  }
  if (name.includes("artificial intelligence") || name.includes("use cases")) {
    return `${prefix} gate AI candidates by data quality, privacy, lineage, owner approval, model-risk controls, and human review requirements.`;
  }
  if (name.includes("architecture") || name.includes("infrastructure") || name.includes("tools") || name.includes("platform")) {
    return `${prefix} document current platforms, integration patterns, target architecture, control gaps, and enabling investments for governed analytics.`;
  }
  if (name.includes("report") || name.includes("dashboard") || name.includes("analytics")) {
    return `${prefix} rationalise dashboards around certified KPI definitions, report owners, release controls, and executive usage evidence.`;
  }
  if (name.includes("privacy") || name.includes("security") || name.includes("compliance")) {
    return `${prefix} embed privacy, access, retention, auditability, and AI-use restrictions into the delivery gate.`;
  }
  if (summary.priority === "critical") {
    return `${prefix} secure executive owner, recover evidence, define target state, and track weekly closure until the domain exits critical status.`;
  }
  if (summary.priority === "high") {
    return `${prefix} assign domain owner, close control gaps in the 90-day plan, and report progress through the data council.`;
  }
  if (summary.priority === "medium") {
    return `${prefix} strengthen evidence, standardise operating cadence, and confirm quarterly improvement targets.`;
  }
  return `${prefix} maintain evidence, monitor exceptions, and confirm control health during quarterly review.`;
}

function readinessThesis(value: number | null) {
  if (value === null) {
    return "Readiness cannot be confirmed until assessment scores and evidence are captured.";
  }
  if (value < 2) {
    return "The organisation is not yet ready to scale predictive or generative AI beyond tightly controlled advisory use cases.";
  }
  if (value < 3) {
    return "The organisation can proceed with governed reporting and selected diagnostic analytics while closing data quality, evidence, and ownership gaps.";
  }
  return "The organisation can progress selected AI use cases through formal model governance, provided risk controls and evidence remain active.";
}

function parseMarkdownReport(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let pendingList: { type: "ul" | "ol"; items: string[] } | null = null;
  const cleanMarkdown = markdown
    .replace(/<!--\s*opencare:evidence[\s\S]*?-->/gi, "")
    .replace(/<!--\s*opencare:evidence[\s\S]*$/gi, "")
    .replace(/\u00e2\u20ac\u201d/g, "-")
    .replace(/\u00e2\u20ac\u201c/g, "-")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, "\"")
    .replace(/\u00e2\u20ac\u009d/g, "\"")
    .replace(/\u00c2\u00a0/g, " ");

  const flushList = () => {
    if (pendingList?.items.length) {
      blocks.push(pendingList);
    }
    pendingList = null;
  };

  cleanMarkdown.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("<!--")) {
      flushList();
      return;
    }

    if (line.startsWith("|")) {
      if (/^\|?[\s:|-]+\|?$/.test(line)) {
        return;
      }
      if (pendingList?.type !== "ul") {
        flushList();
        pendingList = { type: "ul", items: [] };
      }
      const tableText = line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(" - ");
      if (tableText) {
        pendingList.items.push(tableText);
      }
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (pendingList?.type !== "ol") {
        flushList();
        pendingList = { type: "ol", items: [] };
      }
      pendingList.items.push(orderedMatch[1]);
      return;
    }

    if (line.startsWith("- ")) {
      if (pendingList?.type !== "ul") {
        flushList();
        pendingList = { type: "ul", items: [] };
      }
      pendingList.items.push(line.slice(2));
      return;
    }

    flushList();
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
    } else {
      blocks.push({ type: "p", text: line });
    }
  });
  flushList();
  return blocks;
}

function renderInlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownReport({ markdown, source }: { markdown: string; source: "llm" | "fallback" | null }) {
  const blocks = parseMarkdownReport(markdown);
  const isFallback = source === "fallback";
  return (
    <article className="data-ai-report-page data-ai-generated-report data-ai-markdown-report">
      <div className="data-ai-report-page-header">
        <p className="eyebrow">{isFallback ? "Validated Advisory" : "AI-Authored Advisory"}</p>
        <h2>{isFallback ? "Consulting report generated from controlled report data" : "Consulting report generated as Markdown"}</h2>
        <span className={`data-ai-report-source ${isFallback ? "fallback" : "llm"}`}>
          {isFallback ? "Deterministic Markdown" : "AI2 model authored"}
        </span>
      </div>
      <div className="data-ai-markdown-body">
        {blocks.map((block, index) => {
          const key = `${block.type}-${index}`;
          switch (block.type) {
            case "h1":
              return <h2 key={key}>{renderInlineMarkdown(block.text)}</h2>;
            case "h2":
              return <h3 key={key}>{renderInlineMarkdown(block.text)}</h3>;
            case "h3":
              return <h4 key={key}>{renderInlineMarkdown(block.text)}</h4>;
            case "ul":
              return (
                <ul key={key}>
                  {block.items.map((item, itemIndex) => (
                    <li key={`${key}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
                  ))}
                </ul>
              );
            case "ol":
              return (
                <ol key={key}>
                  {block.items.map((item, itemIndex) => (
                    <li key={`${key}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
                  ))}
                </ol>
              );
            case "p":
            default:
              return <p key={key}>{renderInlineMarkdown(block.text)}</p>;
          }
        })}
      </div>
    </article>
  );
}

const module01AiNarrativeFields = [
  "executiveSummary.summaryText",
  "boardScorecard.advisoryNarrative",
  "overallAdvisory.helicopterView",
  "aiReadinessGate.readinessNarrative",
  "capabilityDiagnosis.diagnosisNarrative",
  "roadmap.roadmapNarrative",
  "recommendedNextSteps.closingNarrative",
];

function boolLabel(value: boolean | undefined) {
  if (value === undefined) return "Unknown";
  return value ? "Yes" : "No";
}

function formatLatency(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value)} ms` : "Not recorded";
}

function formatResponseLength(value: number | undefined) {
  return typeof value === "number" ? `${value} chars` : "Not recorded";
}

function AiEnrichmentDebugPanel({
  fields,
  visible,
}: {
  fields?: Record<string, AiEnrichmentFieldStatus>;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <section className="data-ai-enrichment-debug no-print" aria-label="Internal AI enrichment status">
      <div className="data-ai-enrichment-debug-header">
        <div>
          <p className="eyebrow">Internal debug</p>
          <h3>AI2 enrichment status</h3>
          <p>Visible only in debug/admin mode. Raw prompts, client facts, and rejected AI text are not displayed.</p>
        </div>
        <span>Hidden from print/PDF</span>
      </div>
      <div className="data-ai-enrichment-debug-grid">
        {module01AiNarrativeFields.map((fieldName) => {
          const field = fields?.[fieldName];
          const source = field?.status ?? "not_requested";
          const fallbackUsed = field?.fallbackUsed ?? source === "fallback";
          return (
            <article className={`data-ai-enrichment-field ${source}`} key={fieldName}>
              <header>
                <strong>{fieldName}</strong>
                <span>{source}</span>
              </header>
              <dl>
                <div><dt>Model</dt><dd>{field?.model ?? "Not requested"}</dd></div>
                <div><dt>Validation</dt><dd>{field?.validationStatus ?? (field ? source : "not_requested")}</dd></div>
                <div><dt>Rejection reason</dt><dd>{field?.rejectionReason ?? "None"}</dd></div>
                <div><dt>Retry attempted</dt><dd>{boolLabel(field?.retryAttempted)}</dd></div>
                <div><dt>Fallback used</dt><dd>{boolLabel(fallbackUsed)}</dd></div>
                <div><dt>Latency</dt><dd>{formatLatency(field?.durationMs)}</dd></div>
                <div><dt>Rendered length</dt><dd>{formatResponseLength(field?.responseLength)}</dd></div>
                <div><dt>Raw AI2 length</dt><dd>{formatResponseLength(field?.rawResponseLength)}</dd></div>
                <div><dt>Sanitized length</dt><dd>{formatResponseLength(field?.sanitizedResponseLength)}</dd></div>
                <div><dt>AI2 validation</dt><dd>{field?.ai2FieldValidationStatus ?? "Not recorded"}</dd></div>
                <div><dt>AI2 rejection</dt><dd>{field?.ai2RejectionReason ?? "None"}</dd></div>
                <div><dt>AI2 fallback</dt><dd>{boolLabel(field?.ai2FallbackUsed)}</dd></div>
                <div><dt>AI2 retrieval</dt><dd>{field?.ai2RetrievalMode ?? "Not recorded"}</dd></div>
                <div><dt>AI2 citations</dt><dd>{typeof field?.ai2CitationCount === "number" ? field.ai2CitationCount : "Not recorded"}</dd></div>
                <div><dt>Generated</dt><dd>{field?.generatedAt ?? "Not recorded"}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const assessmentStorageKey = "module01:industry-assessment:v1";
type ProfileHistoryEntry = {
  discovery?: Discovery;
  changedAt: string;
  industryId: IndustryProfileId;
  version: string;
  answers: Record<string, QuestionState>;
};
function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DataAiDiagnosticWorkspace({ assessmentId }: { assessmentId?: string } = {}) {
  const [industryId, setIndustryId] = useState<IndustryProfileId | "">("");
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [pendingIndustryId, setPendingIndustryId] = useState<IndustryProfileId | null>(null);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [profileHistory, setProfileHistory] = useState<ProfileHistoryEntry[]>([]);
  const [contextReviewRequired, setContextReviewRequired] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [remoteRevision, setRemoteRevision] = useState<number | null>(null);
  const remoteRevisionRef = useRef<number | null>(null);
  const [remoteSaveStatus, setRemoteSaveStatus] = useState<"loading" | "pending" | "saving" | "saved" | "offline" | "conflict" | "submitted">(assessmentId ? "loading" : "saved");
  const [remoteSavedAt, setRemoteSavedAt] = useState("");
  const [remoteLoaded, setRemoteLoaded] = useState(!assessmentId);
  const remoteBlockedRef = useRef(false);
  const saveSequenceRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const skipInitialRemoteSaveRef = useRef(true);
  const [retryTick, setRetryTick] = useState(0);
  const generationSequence = useRef(0);
  const reportAbort = useRef<AbortController | null>(null);
  useEffect(() => () => reportAbort.current?.abort(), []);
  const [reportResponse, setReportResponse] = useState<DiagnosticReportApiResponse | null>(null);
  const industryProfile = industryId ? getIndustryProfile(industryId) : null;
  const dataAiDiagnosticQuestions = useMemo(() => resolveIndustryQuestions(industryId || "cross-industry", selectedFunctions), [industryId, selectedFunctions]);
  const dataAiDiagnosticDomains = useMemo(() => resolveIndustryDomains(industryId || "cross-industry"), [industryId]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("capture");
  const [selectedDomain, setSelectedDomain] = useState<number | "all">("all");
  const [questionScope, setQuestionScope] = useState("all");
  const [search, setSearch] = useState("");
  const [stateByQuestion, setStateByQuestion] = useState(initialState);
  const [customerContext, setCustomerContext] = useState<CustomerContext>(emptyCustomerContext);
  const [discovery, setDiscovery] = useState<Discovery>(emptyDiscovery);
  const [generatedReport, setGeneratedReport] = useState<GeneratedConsultingReport | null>(null);
  const [generatedMarkdownReport, setGeneratedMarkdownReport] = useState<string | null>(null);
  const [generatedMarkdownReportSource, setGeneratedMarkdownReportSource] = useState<"llm" | "fallback" | null>(null);
  const [reportGenerationMetadata, setReportGenerationMetadata] = useState<DiagnosticReportApiResponse["generationMetadata"] | null>(null);
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);
  const [reportStatus, setReportStatus] = useState<"idle" | "loading" | "ready" | "missing_key" | "error">("idle");
  const [reportMessage, setReportMessage] = useState("");
  const [reportStageIndex, setReportStageIndex] = useState(0);
  const [reportFailureLog, setReportFailureLog] = useState<{
    timestamp: string;
    stage: string;
    status: string;
    message: string;
    model: string;
    endpoint: string;
    details: string[];
  } | null>(null);
  const [handoffMessage, setHandoffMessage] = useState("");
  const [selectedSeedDatasetLevel, setSelectedSeedDatasetLevel] = useState<SeedDatasetLevel>("evidence-enriched");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugPanelVisible(
      params.get("debug") === "1"
      || params.get("admin") === "1"
      || window.localStorage.getItem("module01Debug") === "true",
    );
  }, []);

  useEffect(() => {
    if (assessmentId) {
      let active = true;
      fetch(`/api/module01/assessments/${assessmentId}`, { cache: "no-store" })
        .then(async response => ({ response, body: await response.json() }))
        .then(({ response, body }) => {
          if (!active) return;
          if (!response.ok) throw new Error(body.detail || "Assessment could not be loaded.");
          const saved = body.capture ?? {};
          if (!isIndustryProfileId(saved.industryId)) throw new Error("The saved assessment has no valid industry profile.");
          const functions = normaliseFunctions(saved.industryId, saved.selectedFunctions);
          setIndustryId(saved.industryId);
          setSelectedFunctions(functions);
          setStateByQuestion(validateIndustryAnswers(saved.industryId, saved.answers, functions));
          const context = { ...emptyCustomerContext };
          for (const key of Object.keys(context) as Array<keyof CustomerContext>) context[key] = typeof saved.customerContext?.[key] === "string" ? saved.customerContext[key] : "";
          setCustomerContext(context);
          setDiscovery(normaliseDiscovery(saved.discovery));
          setReviewIds(Array.isArray(saved.reviewIds) ? saved.reviewIds.filter((id: unknown) => typeof id === "string") : []);
          setContextReviewRequired(saved.contextReviewRequired === true);
          setProfileHistory(Array.isArray(saved.profileHistory) ? saved.profileHistory : []);
          remoteRevisionRef.current = body.revision;
          setRemoteRevision(body.revision);
          setRemoteSavedAt(body.savedAt);
          setRemoteSaveStatus(body.status === "submitted" ? "submitted" : "saved");
          remoteBlockedRef.current = body.status === "submitted";
          setStorageReady(true);
          setRemoteLoaded(true);
        })
        .catch(error => { if (active) { setStorageMessage(error instanceof Error ? error.message : "Assessment could not be loaded."); setRemoteSaveStatus("offline"); } });
      return () => { active = false; };
    }
    try {
      const savedText = window.localStorage.getItem(assessmentStorageKey);
      if (savedText) {
        const saved = JSON.parse(savedText);
        if (isIndustryProfileId(saved.industryId)) {
          const retainedFunctions = industryFunctions(saved.industryId).filter((f) =>
            Object.keys(saved.answers ?? {}).some((key) => key.startsWith(`fn_${saved.industryId}_${f.id}_`))).map((f) => f.id);
          const answers = validateIndustryAnswers(saved.industryId, saved.answers, normaliseFunctions(saved.industryId, [...retainedFunctions, ...normaliseFunctions(saved.industryId, saved.selectedFunctions)]));
          if (saved.version !== INDUSTRY_PROFILE_VERSION) {
            setProfileHistory([{ changedAt: new Date().toISOString(), industryId: saved.industryId, version: String(saved.version ?? "unknown"), answers }]);
            setStorageMessage("The saved questionnaire version has changed. Previous answers are archived; select an industry to reassess.");
          } else {
            setIndustryId(saved.industryId);
            setSelectedFunctions(normaliseFunctions(saved.industryId, saved.selectedFunctions));
            setStateByQuestion(answers);
            const context = { ...emptyCustomerContext };
            for (const key of Object.keys(context) as Array<keyof CustomerContext>) {
              context[key] = typeof saved.customerContext?.[key] === "string" ? saved.customerContext[key] : "";
            }
            setCustomerContext(context);
            setDiscovery(normaliseDiscovery(saved.discovery));
            setContextReviewRequired(saved.contextReviewRequired === true);
            setReviewIds(Array.isArray(saved.reviewIds) ? saved.reviewIds.filter((id: unknown) => typeof id === "string" && id in answers) : []);
            setProfileHistory(Array.isArray(saved.profileHistory) ? saved.profileHistory.filter((entry: ProfileHistoryEntry) => entry && isIndustryProfileId(entry.industryId)).map((entry: ProfileHistoryEntry) => ({
              changedAt: String(entry.changedAt), industryId: entry.industryId, version: String(entry.version),
              discovery: normaliseDiscovery(entry.discovery),
              answers: validateIndustryAnswers(entry.industryId, entry.answers, industryFunctions(entry.industryId).map((f) => f.id)),
            })) : []);
          }
        }
      }
    } catch {
      setStorageMessage("Saved assessment could not be restored. Start a new assessment or recover your downloaded JSON.");
    }
    setStorageReady(true);
  }, [assessmentId]);

  useEffect(() => {
    if (!storageReady || !industryId) return;
    try {
      window.localStorage.setItem(assessmentId ? `${assessmentStorageKey}:${assessmentId}` : assessmentStorageKey, JSON.stringify({
        industryId, version: INDUSTRY_PROFILE_VERSION, answers: stateByQuestion, customerContext, discovery,
        selectedFunctions, functionCatalogueVersion: FUNCTION_CATALOGUE_VERSION,
        reviewIds, contextReviewRequired, profileHistory,
        questions: dataAiDiagnosticQuestions.map(({ id, variantKey, questionEn, questionAr, evidenceRequired, evidenceRequiredAr }) => ({
          id, variantKey, questionEn, questionAr, evidenceRequired, evidenceRequiredAr,
        })),
      }));
    } catch {
      setStorageMessage("Browser storage is unavailable or full. Download assessment JSON to keep your work.");
    }
  }, [storageReady, assessmentId, industryId, stateByQuestion, customerContext, discovery, reviewIds, contextReviewRequired, profileHistory, dataAiDiagnosticQuestions]);

  const currentCapture = useMemo(() => ({
    industryId,
    version: INDUSTRY_PROFILE_VERSION,
    answers: stateByQuestion,
    customerContext,
    discovery,
    selectedFunctions,
    functionCatalogueVersion: FUNCTION_CATALOGUE_VERSION,
    reviewIds,
    contextReviewRequired,
    profileHistory,
    questions: dataAiDiagnosticQuestions.map(({ id, variantKey, questionEn, questionAr, evidenceRequired, evidenceRequiredAr }) => ({ id, variantKey, questionEn, questionAr, evidenceRequired, evidenceRequiredAr })),
  }), [industryId, stateByQuestion, customerContext, discovery, selectedFunctions, reviewIds, contextReviewRequired, profileHistory, dataAiDiagnosticQuestions]);

  const queueRemoteSave = useCallback((capture: typeof currentCapture, sequence: number) => {
    if (!assessmentId || remoteBlockedRef.current) return saveChainRef.current;
    saveChainRef.current = saveChainRef.current.then(async () => {
      const revision = remoteRevisionRef.current;
      if (revision === null) return;
      setRemoteSaveStatus("saving");
      try {
        const response = await fetch(`/api/module01/assessments/${assessmentId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: revision, operationId: crypto.randomUUID(), capture }) });
        const body = await response.json();
        if (response.status === 409) {
          remoteBlockedRef.current = true;
          setRemoteSaveStatus("conflict");
          setStorageMessage(body.detail || "This assessment changed in another browser. Your local edits are preserved; reload only after reviewing the conflict.");
          return;
        }
        if (!response.ok) throw new Error(body.detail || "Server save failed.");
        remoteRevisionRef.current = body.revision;
        setRemoteRevision(body.revision);
        setRemoteSavedAt(body.savedAt);
        if (saveSequenceRef.current === sequence) setRemoteSaveStatus("saved");
      } catch (error) {
        setRemoteSaveStatus("offline");
        setStorageMessage(`${error instanceof Error ? error.message : "Server save failed."} Changes remain in this browser and will retry when the connection returns.`);
      }
    });
    return saveChainRef.current;
  }, [assessmentId]);

  useEffect(() => {
    if (!assessmentId || !remoteLoaded || !storageReady || !industryId || remoteBlockedRef.current) return;
    if (skipInitialRemoteSaveRef.current) { skipInitialRemoteSaveRef.current = false; return; }
    const sequence = ++saveSequenceRef.current;
    setRemoteSaveStatus("pending");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void queueRemoteSave(currentCapture, sequence); }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [assessmentId, remoteLoaded, storageReady, industryId, currentCapture, queueRemoteSave, retryTick]);

  useEffect(() => {
    if (!assessmentId) return;
    const retry = () => { if (remoteSaveStatus === "offline") setRetryTick(value => value + 1); };
    const warn = (event: BeforeUnloadEvent) => { if (["pending", "saving", "offline"].includes(remoteSaveStatus)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("online", retry);
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("online", retry); window.removeEventListener("beforeunload", warn); };
  }, [assessmentId, remoteSaveStatus]);

  const saveRemoteNow = async () => {
    if (!assessmentId || remoteBlockedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const sequence = ++saveSequenceRef.current;
    setRemoteSaveStatus("pending");
    await queueRemoteSave(currentCapture, sequence);
  };

  const submitRemoteAssessment = async () => {
    if (!assessmentId || remoteBlockedRef.current) return;
    await saveRemoteNow();
    if (remoteBlockedRef.current || remoteRevisionRef.current === null) return;
    setRemoteSaveStatus("saving");
    const response = await fetch(`/api/module01/assessments/${assessmentId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: remoteRevisionRef.current }) });
    const body = await response.json();
    if (!response.ok) { setRemoteSaveStatus(response.status === 409 ? "conflict" : "offline"); setStorageMessage(body.detail || "Assessment could not be submitted."); return; }
    remoteBlockedRef.current = true;
    setRemoteSaveStatus("submitted");
    setStorageMessage("Assessment submitted for review. Further editing is locked.");
  };

  const summaries = useMemo(() => buildDomainSummaries(stateByQuestion, dataAiDiagnosticQuestions, dataAiDiagnosticDomains), [stateByQuestion, dataAiDiagnosticQuestions, dataAiDiagnosticDomains]);
  const gartnerSummaries = useMemo(() => buildGartnerPillarSummaries(stateByQuestion, dataAiDiagnosticQuestions), [stateByQuestion, dataAiDiagnosticQuestions]);
  const totalQuestions = dataAiDiagnosticQuestions.length;
  const scoredQuestions = dataAiDiagnosticQuestions.filter((question) => typeof stateByQuestion[question.id]?.score === "number").length;
  const overallScore =
    scoredQuestions > 0
      ? dataAiDiagnosticQuestions.reduce((sum, question) => sum + (stateByQuestion[question.id]?.score ?? 0), 0) /
        scoredQuestions
      : null;
  const overallGap =
    scoredQuestions > 0
      ? dataAiDiagnosticQuestions.reduce((sum, question) => sum + (scoreGap(question, stateByQuestion[question.id]) ?? 0), 0) /
        scoredQuestions
      : null;
  const criticalItems = dataAiDiagnosticQuestions.filter((question) => {
    const priority = statusForQuestion(question, stateByQuestion[question.id]);
    return priority === "critical" || priority === "high";
  });
  const selectedSeedDataset = seedDatasetOptions.find((dataset) => dataset.id === selectedSeedDatasetLevel) ?? seedDatasetOptions[1];

  const filteredQuestions = dataAiDiagnosticQuestions.filter((question) => {
    const matchesDomain = selectedDomain === "all" || question.domainId === selectedDomain;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      question.questionEn.toLowerCase().includes(query) ||
      question.questionAr.toLowerCase().includes(query) ||
      question.evidenceRequired.toLowerCase().includes(query) ||
      question.functionLabel?.toLowerCase().includes(query) ||
      question.domainEn.toLowerCase().includes(query);
    const matchesFunction = questionScope === "all" || (questionScope === "core" ? !question.functionId : question.functionId === questionScope);
    return matchesDomain && matchesSearch && matchesFunction;
  });

  const rankedGaps = [...dataAiDiagnosticQuestions]
    .map((question) => ({
      question,
      state: stateByQuestion[question.id],
      gap: scoreGap(question, stateByQuestion[question.id]),
      priority: statusForQuestion(question, stateByQuestion[question.id]),
    }))
    .filter((item) => item.gap !== null)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0) || a.question.number - b.question.number);

  const invalidateReport = () => {
    reportAbort.current?.abort();
    generationSequence.current += 1;
    setGeneratedReport(null);
    setGeneratedMarkdownReport(null);
    setGeneratedMarkdownReportSource(null);
    setReportGenerationMetadata(null);
    setReportResponse(null);
    setReportStatus("idle");
    setReportMessage("");
    setReportFailureLog(null);
    setHandoffMessage("");
    clearLatestDiagnosticStrategyHandoff();
  };

  const applyIndustryChange = (next: IndustryProfileId) => {
    if (assessmentId && remoteBlockedRef.current) return;
    if (industryId && industryId !== next) {
      const migration = migrateIndustryAnswers(industryId, next, stateByQuestion);
      setProfileHistory((current) => [...current, {
        changedAt: new Date().toISOString(), industryId, version: INDUSTRY_PROFILE_VERSION,
        answers: { ...stateByQuestion },
        discovery: structuredClone(discovery),
      }]);
      setStateByQuestion(migration.answers);
      setReviewIds(migration.reviewIds);
      setContextReviewRequired(Object.values(customerContext).some((value) => value.trim()));
    } else if (!industryId) {
      setStateByQuestion(emptyIndustryAnswers(next));
    }
    setDiscovery(emptyDiscovery());
    setSelectedFunctions([]);
    setQuestionScope("all");
    setIndustryId(next);
    setPendingIndustryId(null);
    setSelectedDomain("all");
    setSearch("");
    setActiveTab("capture");
    invalidateReport();
  };

  const requestIndustryChange = (value: string) => {
    if (!isIndustryProfileId(value) || value === industryId) return;
    if (industryId && (Object.values(stateByQuestion).some((answer) => answer.score !== null || answer.notes || answer.evidenceAvailable || answer.actionPlan) || Object.values(customerContext).some(Boolean) || JSON.stringify(discovery) !== JSON.stringify(emptyDiscovery()))) {
      setPendingIndustryId(value);
    } else {
      applyIndustryChange(value);
    }
  };

  const updateQuestion = (questionId: string, patch: Partial<QuestionState>) => {
    if (assessmentId && remoteBlockedRef.current) return;
    invalidateReport();
    if (patch.score !== undefined && patch.score !== null) setReviewIds((current) => current.filter((id) => id !== questionId));
    setStateByQuestion((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        ...patch,
      },
    }));
  };

  const toggleFunction = (id: string) => {
    if (assessmentId && remoteBlockedRef.current) return;
    if (!industryId) return;
    const next = normaliseFunctions(industryId, selectedFunctions.includes(id)
      ? selectedFunctions.filter((value) => value !== id) : [...selectedFunctions, id]);
    // Keep deselected answers for later re-selection, but exclude them from scoring and AI inputs.
    setStateByQuestion((current) => ({ ...emptyIndustryAnswers(industryId, next), ...current }));
    setSelectedFunctions(next);
    setQuestionScope("all");
    setSelectedDomain("all");
    setSearch("");
    invalidateReport();
  };

  const seedDummyData = () => {
    if (!industryId) return;
    if (scoredQuestions > 0 && !window.confirm("Replace the current answers and customer context with fictional demonstration data?")) return;
    invalidateReport();
    const seed = buildIndustrySeed(industryId, selectedSeedDatasetLevel, selectedFunctions);
    setStateByQuestion(seed.answers);
    setCustomerContext(seed.customerContext);
    setDiscovery(seed.discovery);
    setReviewIds([]);
    setContextReviewRequired(false);
    setGeneratedReport(null);
    setGeneratedMarkdownReport(null);
    setGeneratedMarkdownReportSource(null);
    setReportGenerationMetadata(null);
    setReportStatus("idle");
    setReportMessage("");
    setReportFailureLog(null);
    setHandoffMessage(`Seeded fictional ${industryProfile?.labelEn} data with ${selectedSeedDataset.label.toLowerCase()}.`);
  };

  const resetCapture = () => {
    if (!window.confirm("Clear this assessment's answers, customer context and saved report?")) return;
    invalidateReport();
    setReviewIds([]);
    setContextReviewRequired(false);
    setStateByQuestion(industryId ? emptyIndustryAnswers(industryId, selectedFunctions) : initialState());
    setCustomerContext(emptyCustomerContext);
    setDiscovery(emptyDiscovery());
    setGeneratedReport(null);
    setGeneratedMarkdownReport(null);
    setGeneratedMarkdownReportSource(null);
    setReportGenerationMetadata(null);
    setReportStatus("idle");
    setReportMessage("");
    setReportStageIndex(0);
    setReportFailureLog(null);
    clearLatestDiagnosticStrategyHandoff();
    setHandoffMessage("Strategy handoff cleared locally.");
  };

  const updateCustomerContext = (field: keyof CustomerContext, value: string) => {
    if (assessmentId && remoteBlockedRef.current) return;
    invalidateReport();
    setCustomerContext((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const downloadDummyDataFile = () => {
    if (!industryId) return;
    const seed = buildIndustrySeed(industryId, selectedSeedDatasetLevel, selectedFunctions);
    const seededStateByQuestion = seed.answers;
    const contextRows = Object.entries({ ...seed.customerContext, discovery: JSON.stringify(seed.discovery) }).map(([field, value]) => ({
      record_type: "customer_context",
      profile: industryProfile?.labelEn,
      industry_id: industryId,
      profile_version: INDUSTRY_PROFILE_VERSION,
      dataset_level: selectedSeedDataset.label,
      field,
      value,
    }));
    const rows = dataAiDiagnosticQuestions.map((question) => {
      const state = seededStateByQuestion[question.id];
      return {
        record_type: "assessment_question",
        profile: industryProfile?.labelEn,
      industry_id: industryId,
      profile_version: INDUSTRY_PROFILE_VERSION,
        dataset_level: selectedSeedDataset.label,
        field: question.id,
        value: "",
        question_id: question.id,
        question_number: question.number,
        domain_id: question.domainId,
        domain: question.domainEn,
        question: question.questionEn,
        score: state.score,
        target: question.target,
        gap: scoreGap(question, state),
        evidence_strength: state.evidenceStrength,
        evidence_available: state.evidenceAvailable,
        action_plan: state.actionPlan,
        notes: state.notes,
      };
    });
    const headers = Array.from(new Set([...Object.keys(contextRows[0] ?? {}), ...Object.keys(rows[0] ?? {})]));
    const csv = [
      headers.join(","),
      ...[...contextRows, ...rows].map((row) =>
        headers.map((header) => csvCell(row[header as keyof typeof row])).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `data-ai-diagnostic-${industryId}-${selectedSeedDataset.id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadAssessment = () => {
    if (!industryProfile) return;
    downloadText(`module01-${industryId}-assessment.json`, JSON.stringify({
      industryId, version: INDUSTRY_PROFILE_VERSION, industryProfile,
      selectedFunctions, functionCatalogueVersion: FUNCTION_CATALOGUE_VERSION,
      customerContext, discovery, answers: stateByQuestion, questions: dataAiDiagnosticQuestions,
      reviewIds, contextReviewRequired, profileHistory, report: reportResponse,
    }, null, 2), "application/json");
  };

  const downloadReportHtml = () => {
    const report = document.querySelector(".data-ai-report-pack")?.cloneNode(true) as HTMLElement | undefined;
    if (!report) return;
    report.querySelectorAll(".data-ai-report-toolbar,.data-ai-report-nav,.data-ai-generation-progress,.data-ai-report-status,.data-ai-handoff-status,.data-ai-failure-log,.no-print").forEach((node) => node.remove());
    const styles = Array.from(document.styleSheets).map((sheet) => {
      try { return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n"); } catch { return ""; }
    }).join("\n");
    downloadText(`module01-${industryId}-report.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Module 01 Assessment</title><style>${styles}</style></head><body><main class="page data-ai-diagnostic-page">${report.outerHTML}</main></body></html>`, "text/html");
  };

  const printReport = () => {
    setActiveTab("report");
    window.setTimeout(() => window.print(), 100);
  };

  const topGapDomains = summaries
    .filter((summary) => summary.avgGap !== null)
    .sort((a, b) => (b.avgGap ?? 0) - (a.avgGap ?? 0))
    .slice(0, 3);
  const assessedDomains = summaries.filter((summary) => summary.scored > 0);
  const strongestDomains = [...assessedDomains]
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    .slice(0, 3);
  const evidenceBackedItems = dataAiDiagnosticQuestions.filter((question) => {
    const state = stateByQuestion[question.id];
    return state?.score !== null && state?.evidenceStrength !== "none" && state?.evidenceAvailable.trim();
  }).length;
  const evidenceStrengthCounts = dataAiDiagnosticQuestions.reduce<Record<EvidenceStrength, number>>((counts, question) => {
    const state = stateByQuestion[question.id];
    const strength = state && state.score !== null && state.evidenceAvailable.trim() ? state.evidenceStrength : "none";
    counts[strength] += 1;
    return counts;
  }, { none: 0, interview: 0, documented: 0, system: 0, audited: 0 });
  const evidenceWeightedConfidencePct = totalQuestions
    ? Math.round((
      (evidenceStrengthCounts.system * 1)
      + (evidenceStrengthCounts.audited * 1)
      + (evidenceStrengthCounts.documented * 0.75)
      + (evidenceStrengthCounts.interview * 0.45)
    ) / totalQuestions * 100)
    : 0;
  const maturityPct = overallScore === null ? 0 : Math.round((overallScore / 4) * 100);
  const evidenceCoveragePct = totalQuestions ? Math.round((evidenceBackedItems / totalQuestions) * 100) : 0;
  const assessedCoveragePct = totalQuestions ? Math.round((scoredQuestions / totalQuestions) * 100) : 0;
  const domainsRequiringAction = summaries.filter((summary) => summary.priority === "critical" || summary.priority === "high");
  const reportDomainRows = [...summaries].sort((a, b) => (b.avgGap ?? -1) - (a.avgGap ?? -1));
  const topPriorityGaps = rankedGaps.slice(0, 8);
  const reportDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date());
  const reportCustomerName = customerContext.customerName.trim() || "Customer organisation";
  const reportBusinessDomain = customerContext.businessDomain.trim() || "Business domain not specified";
  const reportSubtitle = customerContext.reportPurpose.trim()
    || "Executive readiness assessment, maturity heatmap, remediation roadmap, and AI-governance decision pack.";
  const reportNavItems = [
    ["summary", "Summary"],
    ["scorecard", "Scorecard"],
    ["heatmap", "Heatmap"],
    ["gartner", "Capability lens"],
    ["actions", "Action plan"],
    ["gaps", "Gap register"],
    ["roadmap", "Roadmap"],
    ["gate", "AI gate"],
  ];
  const reportWorkstreams = [
    "Data governance operating model",
    "Data quality and master data controls",
    "Catalogue, metadata, and lineage",
    "Reporting inventory and KPI certification",
    "AI risk, privacy, and model governance",
    "Use-case prioritisation and benefits tracking",
  ];
  const reportGenerationStages = [
    "Preparing diagnostic payload",
    "Sending request to local AI gateway",
    "Generating consulting narrative with local model",
    "Parsing advisory sections",
    "Saving Module 02 strategy handoff",
    "Report ready",
  ];

  const generateConsultingReport = async () => {
    if (!industryProfile || contextReviewRequired || scoredQuestions === 0) return;
    const generationId = ++generationSequence.current;
    reportAbort.current?.abort();
    const abortController = new AbortController();
    reportAbort.current = abortController;
    setReportStatus("loading");
    setReportMessage("");
    setReportStageIndex(0);
    setReportFailureLog(null);
    setReportGenerationMetadata(null);
    setHandoffMessage("");
    let generationTimer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    const captureFailure = (status: string, message: string, details: string[] = [], stageIndex = reportStageIndex) => {
      setReportFailureLog({
        timestamp: new Date().toISOString(),
        stage: reportGenerationStages[Math.min(stageIndex, reportGenerationStages.length - 1)] ?? "Unknown stage",
        status,
        message,
        model: "mistral-nemo:12b via AI2",
        endpoint: "/api/data-ai-diagnostic/report",
        details: [
          `Elapsed: ${Math.round((Date.now() - startedAt) / 1000)}s`,
          `Questions scored: ${scoredQuestions}/${totalQuestions}`,
          `Evidence-backed items: ${evidenceBackedItems}/${totalQuestions}`,
          `Top gap domains: ${topGapDomains.map((domain) => domain.nameEn).join(", ") || "none"}`,
          ...details,
        ],
      });
    };
    try {
      setReportStageIndex(1);
      generationTimer = setTimeout(() => {
        if (generationId === generationSequence.current) setReportStageIndex(2);
      }, 1200);
      const response = await fetch("/api/data-ai-diagnostic/report", {
        method: "POST",
        headers: { "content-type": "application/json", "x-module01-stream": "1" },
        signal: abortController.signal,
        body: JSON.stringify({
          customerContext,
          discovery,
          industryProfile,
          selectedFunctions, functionCatalogueVersion: FUNCTION_CATALOGUE_VERSION,
          responses: dataAiDiagnosticQuestions.map((question) => ({
            questionId: question.id, question: question.questionEn, domain: question.domainEn,
            variantKey: question.variantKey, score: stateByQuestion[question.id].score,
            evidenceId: stateByQuestion[question.id].evidenceAvailable.trim() ? `E-${question.id}` : undefined,
            evidenceStrength: stateByQuestion[question.id].evidenceStrength,
            evidenceAvailable: stateByQuestion[question.id].evidenceAvailable,
            notes: stateByQuestion[question.id].notes, actionPlan: stateByQuestion[question.id].actionPlan,
          })),
          overallScore,
          overallGap,
          scoredQuestions,
          totalQuestions,
          evidenceBackedItems,
          evidenceStrengthCounts,
          evidenceWeightedConfidencePct,
          topGapDomains: topGapDomains.map((domain) => ({
            ...domain,
            nameEn: domain.nameEn,
          })),
          strongestDomains: strongestDomains.map((domain) => ({
            ...domain,
            nameEn: domain.nameEn,
          })),
          gartnerPillars: gartnerSummaries.map((pillar) => ({
            name: pillar.name,
            score: pillar.avgScore,
            gap: pillar.avgGap,
            priority: priorityLabels[pillar.priority],
            scored: pillar.scored,
            total: pillar.total,
            evidenceCoveragePct: pillar.evidenceCoveragePct,
            mappedDomains: pillar.domainIds
              .map((domainId) => {
                const domain = dataAiDiagnosticDomains.find((item) => item.id === domainId);
                return domain ? domain.nameEn : undefined;
              })
              .filter((domainName): domainName is string => Boolean(domainName)),
            decisionQuestion: pillar.decisionQuestion,
            managementAction: pillar.managementAction,
          })),
          priorityGaps: rankedGaps.slice(0, 10).map(({ question, state, gap }) => ({
            question: question.questionEn,
            domain: question.domainEn,
            score: state.score,
            gap,
            evidenceStrength: state.evidenceStrength,
            actionPlan: state.actionPlan,
          })),
        }),
      });
      if (generationTimer) {
        clearTimeout(generationTimer);
      }
      if (generationId !== generationSequence.current) return;
      setReportStageIndex(3);
      let result: DiagnosticReportApiResponse;
      try {
        result = (await response.json()) as DiagnosticReportApiResponse;
      } catch {
        if (generationId !== generationSequence.current) return;
        setReportStatus("error");
        const message = `AI report generation returned a non-JSON response (${response.status}).`;
        setReportMessage(message);
        captureFailure(String(response.status), message, [
          "The portal API response could not be parsed as JSON.",
          "Check portal logs for the upstream gateway response body.",
        ], 3);
        return;
      }
      if (generationId !== generationSequence.current) return;
      if (!response.ok || result.status !== "ready") {
        setReportStatus(result.status === "missing_key" ? "missing_key" : "error");
        const message = result.message ?? `AI report generation failed (${response.status}).`;
        setReportMessage(message);
        captureFailure(String(response.status), message, [
          `API status: ${result.status ?? "unknown"}`,
          `Gateway: ${result.gateway ?? "not returned"}`,
          `Model: ${result.model ?? "not returned"}`,
          ...(Array.isArray(result.details) ? result.details : []),
          "If this is a timeout, reduce the prompt size or generate the report section by section.",
        ], 3);
        return;
      }
      setReportStageIndex(4);
      const normalisedReport = normaliseGeneratedReport(result.report);
      const handoff = buildDiagnosticStrategyHandoff({
        industryProfile,
        selectedFunctions, functionalFindings: result.report?.functionalFindings,
        discovery: normalisedReport.discovery,
        customerContext,
        overallScore,
        overallGap,
        maturityLabel: maturityLabel(overallScore),
        readinessScorePct: overallScore === null ? null : Math.round((overallScore / 4) * 100),
        questionsScored: scoredQuestions,
        totalQuestions,
        domainsAssessed: assessedDomains.length,
        totalDomains: summaries.length,
        evidenceBackedResponses: evidenceBackedItems,
        totalResponses: totalQuestions,
        evidenceCoveragePct,
        domainSummaries: summaries.map((summary) => ({
          ...summary,
          nameEn: summary.nameEn,
        })),
        gartnerSummaries: gartnerSummaries.map((pillar) => ({
          pillarName: pillar.name,
          score: pillar.avgScore,
          gap: pillar.avgGap,
          priority: priorityLabels[pillar.priority],
          decisionQuestion: pillar.decisionQuestion,
          managementAction: pillar.managementAction,
          mappedDomains: pillar.domainIds
            .map((domainId) => {
              const domain = dataAiDiagnosticDomains.find((item) => item.id === domainId);
              return domain ? domain.nameEn : undefined;
            })
            .filter((domainName): domainName is string => Boolean(domainName)),
        })),
        priorityGaps: rankedGaps.slice(0, 10).map(({ question, state, gap, priority }) => ({
          question: question.questionEn,
          domain: question.domainEn,
          score: state.score,
          gap,
          evidence: state.evidenceAvailable || state.evidenceStrength,
          action: state.actionPlan,
          severity: priorityLabels[priority],
        })),
        generatedReport: normalisedReport,
      });
      saveLatestDiagnosticStrategyHandoff(handoff);
      setReportResponse(result);
      setGeneratedReport(normalisedReport);
      setGeneratedMarkdownReport(typeof result.markdownReport === "string" && result.markdownReport.trim()
        ? result.markdownReport
        : null);
      setGeneratedMarkdownReportSource(result.markdownReportSource ?? null);
      setReportGenerationMetadata(result.generationMetadata ?? null);
      setReportStageIndex(5);
      setReportStatus("ready");
      const fallbackSections = result.sectionFallbacks ?? [];
      const repairedSections = result.repairedSections ?? [];
      const fallbackFields = result.fieldFallbacks ?? [];
      const enrichedFields = result.enrichedFields ?? [];
      setReportMessage(result.markdownReportSource === "llm"
        ? `${result.message ?? "AI2 generated the Markdown consulting report."} Strategy handoff saved locally.`
        : fallbackFields.length > 0
          ? `Report JSON was built deterministically. ${fallbackFields.length} optional narrative field${fallbackFields.length === 1 ? "" : "s"} used fallback: ${fallbackFields.join(", ")}. Strategy handoff saved locally.`
        : result.fallback
          ? `${result.message ?? "AI2 Markdown generation did not complete; deterministic report fallback was used."} Strategy handoff saved locally.`
          : enrichedFields.length > 0
            ? `Report JSON was built deterministically and ${enrichedFields.length} narrative field${enrichedFields.length === 1 ? "" : "s"} were safely enriched by ${result.model ?? "configured local model"}. Strategy handoff saved locally.`
            : fallbackSections.length > 0
          ? `Generated with local model ${result.model ?? "configured runtime"} using section-by-section validation. ${fallbackSections.length} section${fallbackSections.length === 1 ? "" : "s"} used deterministic fallback: ${fallbackSections.join(", ")}. Strategy handoff saved locally.`
          : repairedSections.length > 0
            ? `Generated with local model ${result.model ?? "configured runtime"} using section-by-section validation. ${repairedSections.length} section${repairedSections.length === 1 ? "" : "s"} required JSON repair. Strategy handoff saved locally.`
            : `Generated with local model ${result.model ?? "configured runtime"} using section-by-section validated JSON. Strategy handoff saved locally.`);
      setHandoffMessage("Diagnostic completed - available to Data Strategy Builder");
    } catch (error) {
      if (generationTimer) {
        clearTimeout(generationTimer);
      }
      if (generationId !== generationSequence.current) return;
      setReportStatus("error");
      const message = error instanceof Error ? error.message : "Unable to reach the report generation API.";
      setReportMessage(message);
      captureFailure("client_exception", message, [
        "The browser could not complete the request to the portal report API.",
        "Check browser network details and portal logs.",
      ], reportStageIndex);
    }
  };

  return (
    <main className={`page data-ai-diagnostic-page${assessmentId ? " customer-assessment-page" : ""}`}>
      <header className="data-ai-dmo-header">
        <Link className="data-ai-dmo-brand" href="/use-cases/data-management-office-establishment">
          <span aria-hidden="true">Y</span>
          <span>
            <strong>Yottalogica</strong>
            <small>Data Management Advisory</small>
          </span>
        </Link>
        <div className="data-ai-dmo-header-actions">
          <Link href="/use-cases/data-management-office-establishment">Return to DMO home</Link>
          <a href="#diagnostic-workbench">Continue assessment</a>
        </div>
      </header>

      <section className="data-ai-hero">
        <div>
          <p className="eyebrow">{assessmentId ? "Customer assessment" : "Module 01 - DMO Establishment Pathway"}</p>
          <h1>Data & AI Capability Diagnostic</h1>
          <p>
            {assessmentId ? "Complete the assigned data and AI capability assessment. Your progress is saved securely as you work." : "A bilingual assessment and AI reporting workspace for capturing maturity evidence, scoring capability gaps, prioritising remediation, and producing executive-ready diagnostic outputs for the wider DMO establishment programme."}
          </p>
          <div className="data-ai-chip-row">
            <span>{totalQuestions} workbook questions</span>
            <span>13 maturity domains</span>
            {!assessmentId && <span>AI report draft</span>}
            <span>{assessmentId ? "Server autosave" : "Capture first - connect APIs later"}</span>
          </div>
        </div>
        <div className="data-ai-hero-panel">
          <span className="data-ai-mode-chip">{industryProfile?.labelEn ?? "Assessment setup"}</span>
          <strong>{formatScore(overallScore)} / 4</strong>
          <p>Current maturity score</p>
          <small>{scoredQuestions} of {totalQuestions} questions scored</small>
        </div>
      </section>

      <section className="industry-profile-bar no-print" aria-label="Industry profile selection">
        <label htmlFor="industry-profile">
          <span>Industry profile <strong aria-hidden="true">*</strong></span>
          <select id="industry-profile" required value={industryId} onChange={(event) => requestIndustryChange(event.target.value)} disabled={!storageReady || reportStatus === "loading" || remoteSaveStatus === "submitted"}>
            <option value="" disabled>Select an industry</option>
            {industryProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.labelEn} / {profile.labelAr}</option>)}
          </select>
        </label>
        <div className="industry-profile-summary" aria-live="polite">
          <strong>{industryProfile?.labelEn ?? "Industry required"}</strong>
          <span>{industryProfile ? `${totalQuestions} questions | ${dataAiDiagnosticDomains.length} domains | Version ${industryProfile.version}` : "Select the industry for this assessment."}</span>
          {industryProfile && <span lang="ar" dir="rtl">{industryProfile.labelAr}</span>}
        </div>
        <button type="button" disabled={!industryId} onClick={downloadAssessment}>Download assessment JSON</button>
      </section>
      {industryId && <fieldset className="industry-function-scope no-print" disabled={reportStatus === "loading" || remoteSaveStatus === "submitted"}>
        <legend>Functional scope / النطاق الوظيفي</legend>
        <div className="industry-function-options">
          {industryFunctions(industryId).map((f) => <label key={f.id}>
            <input type="checkbox" name="functional-scope" value={f.id} checked={selectedFunctions.includes(f.id)} onChange={() => toggleFunction(f.id)} />
            <span><strong>{f.labelEn}</strong><span lang="ar" dir="rtl">{f.labelAr}</span></span>
            <small>+{f.questionCount}</small>
          </label>)}
        </div>
        <p aria-live="polite">97 core + {totalQuestions - 97} functional = {totalQuestions} questions</p>
      </fieldset>}
      {storageMessage && <p role="status" className="industry-profile-notice no-print">{storageMessage}</p>}
      {assessmentId && <section className={`customer-save-status customer-save-${remoteSaveStatus} no-print`} aria-live="polite">
        <div><strong>{remoteSaveStatus === "loading" ? "Loading assessment..." : remoteSaveStatus === "pending" ? "Changes pending" : remoteSaveStatus === "saving" ? "Saving..." : remoteSaveStatus === "saved" ? `Saved${remoteSavedAt ? ` at ${new Date(remoteSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}` : remoteSaveStatus === "offline" ? "Offline - changes pending" : remoteSaveStatus === "conflict" ? "Save conflict - review required" : "Submitted for review"}</strong><span>{remoteRevision ? `Revision ${remoteRevision}` : ""}</span></div>
        {remoteSaveStatus !== "submitted" && <div><button type="button" disabled={["loading", "saving", "conflict"].includes(remoteSaveStatus)} onClick={saveRemoteNow}>Save now</button><button type="button" disabled={["loading", "pending", "saving", "offline", "conflict"].includes(remoteSaveStatus)} onClick={submitRemoteAssessment}>Submit for review</button></div>}
      </section>}
      {reviewIds.length > 0 && <p role="status" className="industry-profile-notice no-print">{reviewIds.length} changed questions need reassessment. Compatible answers were retained; previous answers remain in the downloaded history.</p>}
      {contextReviewRequired && <div role="status" className="industry-profile-notice no-print">
        <span>Industry changed. Review the customer context and retained evidence before generating a new report.</span>
        <button type="button" onClick={() => setContextReviewRequired(false)}>Confirm customer context</button>
      </div>}
      {pendingIndustryId && industryId && (() => {
        const preview = migrateIndustryAnswers(industryId, pendingIndustryId, stateByQuestion);
        return <div className="industry-profile-modal no-print">
          <section role="dialog" aria-modal="true" aria-labelledby="industry-change-title">
            <h2 id="industry-change-title">Change to {getIndustryProfile(pendingIndustryId).labelEn}?</h2>
            <p>{preview.retainedIds.length} compatible answers retained. {preview.reviewIds.length} answered questions require reassessment.</p>
            <p>Changed answers will be archived. The previous report will be cleared.</p>
            <div>
              <button type="button" autoFocus onClick={() => setPendingIndustryId(null)}>Cancel</button>
              <button type="button" onClick={() => applyIndustryChange(pendingIndustryId)}>Apply industry change</button>
            </div>
          </section>
        </div>;
      })()}

      <nav className="data-ai-tabs" id="diagnostic-workbench" aria-label="Data and AI diagnostic sections">
        {tabs.filter(tab => !assessmentId || tab.id !== "report").map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            disabled={!industryId && tab.id !== "capture"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "capture" && industryId ? (
        <>
          <section className="panel data-ai-control-panel">
            <div>
              <p className="eyebrow">Assessment Intake</p>
              <h2>Data capture workbench</h2>
              <p>Score each question, capture available evidence, and leave action notes for the AI report.</p>
            </div>
            <div className="data-ai-capture-summary" aria-label="Assessment progress summary">
              <div>
                <span>Coverage</span>
                <strong>{scoredQuestions}/{totalQuestions}</strong>
              </div>
              <div>
                <span>Avg score</span>
                <strong>{formatScore(overallScore)}</strong>
              </div>
              <div>
                <span>High gaps</span>
                <strong>{criticalItems.length}</strong>
              </div>
            </div>
            {!assessmentId && <div className="data-ai-demo-actions" aria-label="Demo data actions">
              <div>
                <span className="data-ai-mode-chip">Seed catalogue</span>
                <p>Fictional demonstration data for {industryProfile?.labelEn}.</p>
              </div>
              <div className="data-ai-seed-controls">
                <label>
                  <span>Dataset depth</span>
                  <select
                    value={selectedSeedDatasetLevel}
                    onChange={(event) => setSelectedSeedDatasetLevel(event.target.value as SeedDatasetLevel)}
                  >
                    {seedDatasetOptions.map((dataset) => (
                      <option key={dataset.id} value={dataset.id}>
                        {dataset.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p>{selectedSeedDataset.description}</p>
              </div>
              <div>
                <button type="button" onClick={seedDummyData}>
                  Seed selected data
                </button>
                <button type="button" onClick={downloadDummyDataFile}>
                  Download selected seed
                </button>
                <button type="button" onClick={resetCapture}>
                  Reset capture
                </button>
              </div>
            </div>}
            <div className="data-ai-context-panel" aria-label="Customer and business domain context">
              <div className="data-ai-context-header">
                <div>
                  <p className="eyebrow">Customer Context</p>
                  <h3>Tell the report what business domain it is assessing</h3>
                  <p>
                    These fields shape the AI narrative, report language, priorities, and examples. They are captured as
                    context, not maturity scores.
                  </p>
                </div>
                <span className="data-ai-mode-chip">
                  {customerContext.businessDomain.trim() ? "Context captured" : "Needs customer context"}
                </span>
              </div>
              <div className="data-ai-context-grid">
                <label>
                  <span>Customer / organisation</span>
                  <input
                    value={customerContext.customerName}
                    onChange={(event) => updateCustomerContext("customerName", event.target.value)}
                    placeholder="Organisation name"
                  />
                </label>
                <label>
                  <span>Business domain</span>
                  <input
                    value={customerContext.businessDomain}
                    onChange={(event) => updateCustomerContext("businessDomain", event.target.value)}
                    placeholder="Example: public-sector services and operations"
                  />
                </label>
                <label>
                  <span>Operating scope</span>
                  <textarea
                    value={customerContext.operatingScope}
                    onChange={(event) => updateCustomerContext("operatingScope", event.target.value)}
                    placeholder="Geography, entities, functions, services, or user groups in scope..."
                  />
                </label>
                <label>
                  <span>Strategic priorities</span>
                  <textarea
                    value={customerContext.strategicPriorities}
                    onChange={(event) => updateCustomerContext("strategicPriorities", event.target.value)}
                    placeholder="What outcomes should data and AI support?"
                  />
                </label>
                <label>
                  <span>Current pain points</span>
                  <textarea
                    value={customerContext.currentPainPoints}
                    onChange={(event) => updateCustomerContext("currentPainPoints", event.target.value)}
                    placeholder="Known constraints, risks, data gaps, operating issues..."
                  />
                </label>
                <label>
                  <span>Report audience</span>
                  <input
                    value={customerContext.targetAudience}
                    onChange={(event) => updateCustomerContext("targetAudience", event.target.value)}
                    placeholder="Executive committee, data council, PMO, IT..."
                  />
                </label>
                <label className="data-ai-context-wide">
                  <span>Report purpose</span>
                  <textarea
                    value={customerContext.reportPurpose}
                    onChange={(event) => updateCustomerContext("reportPurpose", event.target.value)}
                    placeholder="What should this report help the customer decide?"
                  />
                </label>
              </div>
            </div>
            <DiscoveryEditor value={discovery} onChange={(value) => { if (assessmentId && remoteBlockedRef.current) return; setDiscovery(value); invalidateReport(); }} />
            <div className="data-ai-filters">
              {selectedFunctions.length > 0 && industryId && <label>
                <span>Question scope</span>
                <select id="question-scope" value={questionScope} onChange={(event) => setQuestionScope(event.target.value)}>
                  <option value="all">Core and selected functions</option>
                  <option value="core">Core assessment</option>
                  {industryFunctions(industryId).filter((f) => selectedFunctions.includes(f.id)).map((f) => <option key={f.id} value={f.id}>{f.labelEn}</option>)}
                </select>
              </label>}
              <label>
                <span>Domain</span>
                <select value={selectedDomain} onChange={(event) => setSelectedDomain(event.target.value === "all" ? "all" : Number(event.target.value))}>
                  <option value="all">All domains</option>
                  {dataAiDiagnosticDomains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.id}. {domain.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Question, evidence, domain..." />
              </label>
            </div>
          </section>

          <section className="panel data-ai-rubric-panel" aria-label="Scoring guidance">
            <div className="data-ai-rubric-header">
              <div>
                <p className="eyebrow">Scoring Standard</p>
                <h2>Use one maturity definition across every interview</h2>
              </div>
              <span className="data-ai-mode-chip">Evidence caps score</span>
            </div>
            <div className="data-ai-rubric-grid">
              {scoreOptions.filter((option) => option.value !== null).map((option) => (
                <article key={option.shortLabel}>
                  <strong>{option.shortLabel}</strong>
                  <h3>{option.label.replace(`${option.shortLabel} - `, "")}</h3>
                  <p>{option.description}</p>
                </article>
              ))}
            </div>
            <div className="data-ai-evidence-rule">
              <strong>Evidence rule</strong>
              <span>No evidence caps at 1. Interview-only usually caps at 2. Scores 3-4 require documented, system, or audited evidence.</span>
            </div>
          </section>

          <section className="data-ai-question-list">
            {filteredQuestions.map((question) => {
              const state = stateByQuestion[question.id];
              const gap = scoreGap(question, state);
              const priority = statusForQuestion(question, state);
              const warning = evidenceWarning(state);
              return (
                <article className="data-ai-question-card" key={question.id}>
                  <div className="data-ai-question-main">
                    <div className="data-ai-question-topline">
                      <span className="data-ai-question-number">Q{question.number}</span>
                      <span className="data-ai-domain-pill">{question.domainEn}</span>
                      <span className={`data-ai-priority ${priority}`}>{priorityLabels[priority]}</span>
                    </div>
                    {question.functionLabel && <span className="industry-function-tag">{question.functionLabel}</span>}
                    <h3>{question.questionEn}</h3>
                    {reviewIds.includes(question.id) && <span className="industry-review-tag">Reassessment required</span>}
                    <p className="arabic-copy">{question.questionAr}</p>
                    <dl className="data-ai-question-meta">
                      <div>
                        <dt>Framework</dt>
                        <dd>{question.isoReference || "Not specified"}</dd>
                      </div>
                      <div>
                        <dt>Evidence required</dt>
                        <dd>{question.evidenceRequired}<span className="industry-evidence-ar" lang="ar" dir="rtl">{question.evidenceRequiredAr}</span></dd>
                      </div>
                      <div>
                        <dt>Gap</dt>
                        <dd>{gap === null ? "Needs score" : `${gap} / ${question.target}`}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="data-ai-capture-fields">
                    <div className="data-ai-score-panel">
                      <div>
                        <span>Score</span>
                        <strong>{state.score === null ? "No data" : `${state.score} / ${question.target}`}</strong>
                      </div>
                      <div className="data-ai-score-buttons" role="group" aria-label={`Score question ${question.number}`}>
                        {scoreOptions.map((option) => (
                          <button
                            className={state.score === option.value ? "active" : ""}
                            key={option.label}
                            type="button"
                            title={option.label}
                            onClick={() => updateQuestion(question.id, { score: option.value })}
                          >
                            {option.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="data-ai-evidence-strength">
                      <span>Evidence strength</span>
                      <select
                        value={state.evidenceStrength}
                        onChange={(event) => updateQuestion(question.id, { evidenceStrength: event.target.value as EvidenceStrength })}
                      >
                        {evidenceStrengthOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} - caps score at {option.cap}
                          </option>
                        ))}
                      </select>
                      <small>
                        {evidenceStrengthOptions.find((option) => option.value === state.evidenceStrength)?.description}
                      </small>
                    </label>
                    {warning ? <p className="data-ai-evidence-warning">{warning}</p> : null}
                    <div className="data-ai-textarea-grid">
                      <label>
                        <span>Evidence available</span>
                        <textarea
                          value={state.evidenceAvailable}
                          onChange={(event) => updateQuestion(question.id, { evidenceAvailable: event.target.value })}
                          placeholder="Document, link, interview note, owner confirmation..."
                        />
                      </label>
                      <label>
                        <span>Action plan</span>
                        <textarea
                          value={state.actionPlan}
                          onChange={(event) => updateQuestion(question.id, { actionPlan: event.target.value })}
                          placeholder="Next action, owner, due date..."
                        />
                      </label>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      ) : null}

      {activeTab === "dashboard" ? (
        <>
          <section className="data-ai-kpi-grid">
            {[
              ["Overall maturity", `${formatScore(overallScore)} / 4`, "Average across scored questions"],
              ["Assessment coverage", `${scoredQuestions} / ${totalQuestions}`, "Questions with score captured"],
              ["Average gap", overallGap === null ? "No data" : overallGap.toFixed(1), "Distance from target 4"],
              ["High-priority gaps", String(criticalItems.length), "Critical or high scored items"],
            ].map(([label, value, note]) => (
              <article className="data-ai-kpi-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <p>{note}</p>
              </article>
            ))}
          </section>
          <section className="panel data-ai-section">
            <div className="data-ai-section-header">
              <div>
                <p className="eyebrow">Domain Dashboard</p>
                <h2>Maturity by capability domain</h2>
              </div>
              <span className="data-ai-mode-chip">Target = 4</span>
            </div>
            <div className="data-ai-domain-list">
              {summaries.map((summary) => (
                <article className="data-ai-domain-row" key={summary.id}>
                  <div>
                    <strong>{summary.nameEn}</strong>
                    <span>{summary.nameAr}</span>
                  </div>
                  <div className="data-ai-score-bar" aria-label={`${summary.nameEn} maturity score`}>
                    <span style={{ width: scoreWidth(summary.avgScore) }} />
                  </div>
                  <div className="data-ai-domain-score">
                    <strong>{formatScore(summary.avgScore)}</strong>
                    <span>{summary.scored}/{summary.total} scored</span>
                  </div>
                  <span className={`data-ai-priority ${summary.priority}`}>{priorityLabels[summary.priority]}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "gartner" ? (
        <>
          <section className="panel data-ai-section">
            <div className="data-ai-section-header">
              <div>
                <p className="eyebrow">Capability Framework</p>
                <h2>7-pillar executive maturity lens</h2>
                <p>
                  This view complements the 13-domain workbook by grouping the captured evidence into seven executive
                  pillars for strategy, governance, data quality, architecture, analytics and AI, people, and execution.
                </p>
              </div>
              <span className="data-ai-mode-chip">Mapped from workbook scores</span>
            </div>
            <div className="data-ai-gartner-grid">
              {gartnerSummaries.map((pillar) => (
                <article className="data-ai-gartner-card" key={pillar.id}>
                  <div className="data-ai-gartner-card-header">
                    <span>{pillar.id.toString().padStart(2, "0")}</span>
                    <span className={`data-ai-priority ${pillar.priority}`}>{priorityLabels[pillar.priority]}</span>
                  </div>
                  <h3>{pillar.name}</h3>
                  <p>{pillar.description}</p>
                  <div className="data-ai-score-bar" aria-label={`${pillar.name} Gartner pillar maturity score`}>
                    <span style={{ width: scoreWidth(pillar.avgScore) }} />
                  </div>
                  <dl className="data-ai-gartner-metrics">
                    <div>
                      <dt>Score</dt>
                      <dd>{formatScore(pillar.avgScore)} / 4</dd>
                    </div>
                    <div>
                      <dt>Coverage</dt>
                      <dd>{pillar.scored}/{pillar.total}</dd>
                    </div>
                    <div>
                      <dt>Evidence</dt>
                      <dd>{pillar.evidenceCoveragePct}%</dd>
                    </div>
                  </dl>
                  <div className="data-ai-gartner-domain-list">
                    {pillar.domainIds.map((domainId) => {
                      const domain = dataAiDiagnosticDomains.find((item) => item.id === domainId);
                      return domain ? <span key={domain.id}>{domain.nameEn}</span> : null;
                    })}
                  </div>
                  <section>
                    <strong>Decision question</strong>
                    <p>{pillar.decisionQuestion}</p>
                  </section>
                  <section>
                    <strong>Management action</strong>
                    <p>{pillar.managementAction}</p>
                  </section>
                </article>
              ))}
            </div>
          </section>

          <section className="panel data-ai-section">
            <div className="data-ai-section-header">
              <div>
                <p className="eyebrow">Framework Crosswalk</p>
                <h2>How the 13 domains roll into the 7 pillars</h2>
              </div>
              <span className="data-ai-mode-chip">{dataAiDiagnosticDomains.length} domains mapped</span>
            </div>
            <div className="data-ai-table-wrap">
              <table className="table data-ai-table">
                <thead>
                  <tr>
                    <th>Capability pillar</th>
                    <th>Mapped workbook domains</th>
                    <th>Score</th>
                    <th>Evidence</th>
                    <th>Primary management action</th>
                  </tr>
                </thead>
                <tbody>
                  {gartnerSummaries.map((pillar) => (
                    <tr key={pillar.id}>
                      <td>{pillar.name}</td>
                      <td>
                        {pillar.domainIds
                          .map((domainId) => dataAiDiagnosticDomains.find((domain) => domain.id === domainId)?.nameEn)
                          .filter(Boolean)
                          .join("; ")}
                      </td>
                      <td>{formatScore(pillar.avgScore)} / 4</td>
                      <td>{pillar.evidenceBacked}/{pillar.total} evidence-backed</td>
                      <td>{pillar.managementAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "gaps" ? (
        <section className="panel data-ai-section">
          <div className="data-ai-section-header">
            <div>
              <p className="eyebrow">Prioritisation</p>
              <h2>Gap analysis and action queue</h2>
            </div>
            <span className="data-ai-mode-chip">{rankedGaps.length} scored rows</span>
          </div>
          <div className="data-ai-table-wrap">
            <table className="table data-ai-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Domain</th>
                  <th>Score</th>
                  <th>Gap</th>
                  <th>Priority</th>
                  <th>Evidence</th>
                  <th>Action plan</th>
                </tr>
              </thead>
              <tbody>
                {rankedGaps.length ? rankedGaps.map(({ question, state, gap, priority }) => (
                  <tr key={question.id}>
                    <td>{question.questionEn}</td>
                    <td>{question.domainEn}</td>
                    <td>{state.score}</td>
                    <td>{gap}</td>
                    <td><span className={`data-ai-priority ${priority}`}>{priorityLabels[priority]}</span></td>
                    <td>{state.evidenceAvailable || "No evidence captured"}</td>
                    <td>{state.actionPlan || "No action captured"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>No scored gaps yet. Capture scores in the data capture tab.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "report" ? (
        <section className="data-ai-report-pack">
          <div className="panel data-ai-report-toolbar">
            <div>
              <p className="eyebrow">Consulting Report</p>
              <h2>Data & AI capability diagnostic report pack</h2>
              <p>Structured pages suitable for executive review, steering committee discussion, and browser print-to-PDF export.</p>
            </div>
            <div>
              <button type="button" onClick={generateConsultingReport} disabled={reportStatus === "loading" || !industryId || contextReviewRequired || scoredQuestions === 0}>
                {reportStatus === "loading" ? "Generating..." : "Generate with local AI"}
              </button>
              <button type="button" onClick={printReport} disabled={!industryId || contextReviewRequired}>Print / Save PDF</button>
              <button type="button" onClick={downloadReportHtml} disabled={!generatedReport}>Download HTML</button>
              <button type="button" onClick={() => generatedMarkdownReport && downloadText(`module01-${industryId}-report.md`, generatedMarkdownReport, "text/markdown")} disabled={!generatedMarkdownReport}>Download Markdown</button>
              <span className="data-ai-mode-chip">
                {reportStatus === "ready" ? "Report ready" : "Generated from captured scores"}
              </span>
            </div>
          </div>
          <nav className="data-ai-report-nav" aria-label="Report sections">
            {reportNavItems.map(([id, label]) => (
              <a href={`#data-ai-report-${id}`} key={id}>{label}</a>
            ))}
          </nav>
          {reportStatus === "loading" || reportStatus === "ready" || reportStatus === "error" || reportStatus === "missing_key" ? (
            <div className={`data-ai-generation-progress ${reportStatus}`} aria-live="polite">
              <div className="data-ai-generation-progress-top">
                <span>Local AI generation pipeline</span>
                <strong>{reportGenerationStages[Math.min(reportStageIndex, reportGenerationStages.length - 1)]}</strong>
              </div>
              <div className="data-ai-generation-bar" aria-hidden="true">
                <span style={{ width: `${((Math.min(reportStageIndex, reportGenerationStages.length - 1) + 1) / reportGenerationStages.length) * 100}%` }} />
              </div>
              <ol>
                {reportGenerationStages.map((stage, index) => {
                  const isComplete = reportStatus === "ready" || index < reportStageIndex;
                  const isCurrent = reportStatus === "loading" && index === reportStageIndex;
                  const isFailed = (reportStatus === "error" || reportStatus === "missing_key") && index === reportStageIndex;
                  return (
                    <li
                      className={[
                        isComplete ? "complete" : "",
                        isCurrent ? "current" : "",
                        isFailed ? "failed" : "",
                      ].filter(Boolean).join(" ")}
                      key={stage}
                    >
                      <span>{index + 1}</span>
                      <p>{stage}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
          {reportMessage ? (
            <div className={`data-ai-report-status ${reportStatus}`}>
              {reportMessage}
            </div>
          ) : null}
          {handoffMessage ? (
            <div className="data-ai-handoff-status">
              <span>{handoffMessage}</span>
              <Link href="/use-cases/data-strategy-builder">Open Data Strategy Builder</Link>
            </div>
          ) : null}
          {reportFailureLog ? (
            <section className="data-ai-failure-log" aria-label="Local AI failure log">
              <div>
                <p className="eyebrow">Failure diagnostics</p>
                <h3>Local AI report generation log</h3>
              </div>
              <dl>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{reportFailureLog.timestamp}</dd>
                </div>
                <div>
                  <dt>Stage</dt>
                  <dd>{reportFailureLog.stage}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{reportFailureLog.status}</dd>
                </div>
                <div>
                  <dt>Model path</dt>
                  <dd>{reportFailureLog.model}</dd>
                </div>
                <div>
                  <dt>Endpoint</dt>
                  <dd>{reportFailureLog.endpoint}</dd>
                </div>
              </dl>
              <div>
                <strong>Error message</strong>
                <p>{reportFailureLog.message}</p>
              </div>
              <details>
                <summary>Diagnostic details</summary>
                <pre>{JSON.stringify(reportFailureLog, null, 2)}</pre>
              </details>
            </section>
          ) : null}

          <AiEnrichmentDebugPanel
            fields={reportGenerationMetadata?.fields}
            visible={debugPanelVisible && Boolean(reportGenerationMetadata?.fields)}
          />

          <article className="data-ai-report-page data-ai-report-cover" id="data-ai-report-cover">
            <div>
              <p className="eyebrow">Data & AI Capability Diagnostic</p>
              <h2>Data & AI Capability Diagnostic</h2>
              <p>{reportCustomerName}</p>
              <p>{reportBusinessDomain}</p>
              <p className="industry-report-label">Industry: {industryProfile?.labelEn} | Profile {industryProfile?.version}</p>
              <p>{reportSubtitle}</p>
              <div className="data-ai-report-cover-pills">
                <span>{scoredQuestions}/{totalQuestions} questions</span>
                <span>{assessedDomains.length}/{summaries.length} domains</span>
                <span>{evidenceBackedItems}/{totalQuestions} evidence-backed</span>
                <span>{maturityPct}% readiness score</span>
              </div>
            </div>
            <div className="data-ai-report-cover-card">
              <div className="data-ai-report-cover-gauge" style={{ "--score-pct": `${maturityPct}%` } as CSSProperties}>
                <div>
                  <strong>{formatScore(overallScore)}</strong>
                  <span>out of 4.0</span>
                  <small>{maturityLabel(overallScore)}</small>
                </div>
              </div>
              <p>{reportDate} - {assessedDomains.length} domains</p>
            </div>
            <dl className="data-ai-report-facts">
              <div><dt>Report date</dt><dd>{reportDate}</dd></div>
              <div><dt>Industry profile</dt><dd>{industryProfile?.labelEn} ({industryProfile?.version})</dd></div>
              <div><dt>Assessment coverage</dt><dd>{scoredQuestions} / {totalQuestions} questions</dd></div>
              <div><dt>Domains assessed</dt><dd>{assessedDomains.length} / {summaries.length}</dd></div>
              <div><dt>Evidence-backed responses</dt><dd>{evidenceBackedItems} / {totalQuestions}</dd></div>
              <div><dt>Report audience</dt><dd>{customerContext.targetAudience.trim() || "Not specified"}</dd></div>
            </dl>
          </article>

          <article className="data-ai-report-page data-ai-report-contents">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">Report Navigation</p>
              <h2>Contents and decision flow</h2>
            </div>
            <div className="data-ai-report-toc">
              {[
                ["01", "Executive Summary", "Readiness position, decision asks, and management attention."],
                ["02", "Board Scorecard", "Maturity, evidence coverage, priority gaps, and readiness thesis."],
                ["03", "Maturity Heatmap", "Domain-level scores and gap concentration."],
                ["04", "Capability Pillar Lens", "Executive framework roll-up mapped from the 13 workbook domains."],
                ["05", "Domain Action Plan", "Recommended owner focus and remediation route by domain."],
                ["06", "Priority Gap Register", "Highest-risk questions requiring evidence-backed action."],
                ["07", "90-Day Roadmap", "Mobilise, remediate, and certify readiness."],
                ["08", "AI Readiness Gate", "What can proceed now and what should wait."],
                ["09", "Appendix", "Prompt library and report generation basis."],
              ].map(([number, title, text]) => (
                <div key={number}>
                  <span>{number}</span>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-summary">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">01 - Executive Summary</p>
              <h2>Readiness position and management attention</h2>
            </div>
            <div className="data-ai-report-kpis">
              {[
                ["Overall maturity", `${formatScore(overallScore)} / 4`, maturityLabel(overallScore)],
                ["Coverage", `${scoredQuestions}/${totalQuestions}`, "questions scored"],
                ["Average gap", overallGap === null ? "No data" : overallGap.toFixed(1), "from target maturity"],
                ["Priority gaps", String(criticalItems.length), "critical or high items"],
                ["Evidence coverage", `${evidenceCoveragePct}%`, "responses with evidence"],
                ["Domains requiring action", String(domainsRequiringAction.length), "critical or high domains"],
              ].map(([label, value, note]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{note}</p>
                </div>
              ))}
            </div>
            <div className="data-ai-report-strength-vulnerability">
              <section className="strength">
                <h3>Headline assessment</h3>
                <p>
                  The current capture for {reportCustomerName} indicates {maturityProfilePhrase(overallScore)} data and AI capability profile
                  for {reportBusinessDomain}.
                  {topGapDomains.length
                    ? ` The most material gaps are concentrated in ${topGapDomains.map((item) => item.nameEn).join(", ")}.`
                    : " No scored domain gap pattern is available yet."}
                </p>
                <p>
                  The immediate priority is to strengthen evidence, ownership, operating cadence, and data controls before
                  scaling predictive or generative AI use cases.
                </p>
              </section>
              <section className="vulnerability">
                <h3>Executive decisions required</h3>
                <ul>
                  <li>Confirm accountable executive owner and data council cadence.</li>
                  <li>Approve the diagnostic scoring baseline and evidence standard.</li>
                  <li>Prioritise remediation for the highest-gap domains.</li>
                  <li>Gate AI use cases until data quality, privacy, lineage, and model-risk evidence are ready.</li>
                </ul>
              </section>
            </div>
            <section className="data-ai-report-thesis">
              <h3>Readiness thesis</h3>
              <p>{readinessThesis(overallScore)}</p>
            </section>
          </article>

          <article className="data-ai-report-page data-ai-board-page" id="data-ai-report-scorecard">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">02 - Board Scorecard</p>
              <h2>Readiness signal for steering committee review</h2>
            </div>
            <section className="data-ai-board-scorecard-hero">
              <span>Readiness score</span>
              <strong>{maturityPct}%</strong>
              <p>{formatScore(overallScore)} / 4 maturity - {maturityLabel(overallScore)}</p>
            </section>
            <div className="data-ai-board-postures">
              {[
                ["decision", "Decision posture", generatedReport?.boardScorecardNarrative || readinessThesis(overallScore)],
                ["evidence", "Evidence posture", `${evidenceCoveragePct}% of questions currently have evidence strength and evidence notes. Unsupported high scores remain provisional until documents, system records, audit trails, or owner confirmations are attached.`],
                ["assessment", "Assessment completeness", `${assessedCoveragePct}% of workbook questions have been scored. Unscored items should remain outside the approved baseline and be tracked as evidence gaps.`],
              ].map(([tone, title, text]) => (
                <section className={tone} key={title}>
                  <span>{title}</span>
                  <p>{text}</p>
                </section>
              ))}
            </div>
            <div className="data-ai-report-decision-strip">
              {(generatedReport?.boardAsks?.length ? generatedReport.boardAsks : [
                "Approve baseline: Confirm score standard and evidence requirements.",
                "Assign owners: Close priority domains through named remediation owners.",
                "Gate use cases: Proceed only where data, privacy, and model risk controls are ready.",
              ]).slice(0, 3).map((ask, index) => {
                const [label, ...rest] = ask.split(":");
                return (
                  <div key={`${label}-${index}`}>
                    <span>{index === 0 ? "Board ask" : index === 1 ? "Management ask" : "AI ask"}</span>
                    <strong>{label || `Ask ${index + 1}`}</strong>
                    <p>{rest.join(":").trim() || ask}</p>
                  </div>
                );
              })}
            </div>
          </article>

          {generatedReport?.discovery && (generatedReport.discovery.architecture.nodes.length > 0 || generatedReport.discovery.architecture.image) && <article className="data-ai-report-page">
            <div className="data-ai-report-page-header"><p className="eyebrow">Current-state assessment</p><h2>Systems and data movement</h2></div>
            <p>{generatedReport.discovery.architecture.description}</p>
            <ArchitectureDiagram architecture={generatedReport.discovery.architecture} />
            <p><strong>Unknowns and assumptions:</strong> {generatedReport.discovery.architecture.unknowns || "Not supplied"}</p>
          </article>}
          {generatedMarkdownReport ? (
            <MarkdownReport markdown={generatedMarkdownReport} source={generatedMarkdownReportSource} />
          ) : generatedReport ? (
            <article className="data-ai-report-page data-ai-generated-report">
              <div className="data-ai-report-page-header">
                <p className="eyebrow">AI-Generated Advisory</p>
                <h2>Consulting-grade narrative generated from the captured diagnostic</h2>
              </div>
              <section className="data-ai-report-callout">
                <h3>Executive summary</h3>
                <p>{generatedReport.executiveSummary}</p>
              </section>
              <section className="data-ai-report-callout">
                <h3>Overall advisory synthesis</h3>
                <p>{generatedReport.overallAdvisoryNarrative || generatedReport.boardMessage}</p>
              </section>
              <section className="data-ai-report-callout">
                <h3>Board scorecard advisory</h3>
                <p>{generatedReport.boardScorecardNarrative || generatedReport.readinessThesis}</p>
              </section>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>Headline assessment</h3>
                  <p>{generatedReport.headlineAssessment || generatedReport.boardMessage}</p>
                </section>
                <section>
                  <h3>Readiness thesis</h3>
                  <p>{generatedReport.readinessThesis || generatedReport.aiReadinessGate}</p>
                </section>
              </div>
              <section className="data-ai-report-callout">
                <h3>Board message</h3>
                <p>{generatedReport.boardMessage}</p>
              </section>
              <div className="data-ai-report-decision-strip">
                {(generatedReport.boardAsks?.length ? generatedReport.boardAsks : [
                  "Approve baseline - confirm the scoring standard and evidence requirements.",
                  "Assign owners - name accountable owners for priority domains.",
                  "Gate use cases - proceed only where data, privacy, and model-risk controls are ready.",
                ]).slice(0, 3).map((item, index) => {
                  const separatorIndex = item.indexOf(" - ");
                  const title = separatorIndex >= 0 ? item.slice(0, separatorIndex) : `Ask ${index + 1}`;
                  const text = separatorIndex >= 0 ? item.slice(separatorIndex + 3) : item;
                  return (
                    <div key={`${title}-${index}`}>
                      <span>{index === 0 ? "Board ask" : index === 1 ? "Management ask" : "AI ask"}</span>
                      <strong>{title}</strong>
                      <p>{text}</p>
                    </div>
                  );
                })}
              </div>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>Material findings</h3>
                  <ul>
                    {(generatedReport.materialFindings ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <section>
                  <h3>Recommended decisions</h3>
                  <ul>
                    {(generatedReport.recommendedDecisions ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>Domain action plan</h3>
                  <ul>
                    {(generatedReport.domainActionPlan ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <section>
                  <h3>Priority gap register</h3>
                  <ul>
                    {(generatedReport.priorityGapRegister ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
              <section className="data-ai-report-callout">
                <h3>Capability pillar assessment</h3>
                {(generatedReport.capabilityPillarAssessment ?? []).length ? (
                  <ul>
                    {(generatedReport.capabilityPillarAssessment ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p>The capability pillar narrative will appear here after report generation.</p>
                )}
              </section>
              <div className="data-ai-report-two-col">
                <section>
                  <h3>90-day plan</h3>
                  <ol>
                    {((generatedReport.roadmapPhases?.length ? generatedReport.roadmapPhases : generatedReport.ninetyDayPlan) ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ol>
                </section>
                <section>
                  <h3>Risks to control</h3>
                  <ul>
                    {(generatedReport.risks ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
              <section className="data-ai-report-callout">
                <h3>AI readiness gate</h3>
                <p>{generatedReport.aiReadinessGate}</p>
              </section>
              <div className="data-ai-gate-matrix">
                <section>
                  <h3>Proceed</h3>
                  <ul>{(generatedReport.aiGateProceed ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <section>
                  <h3>Pilot with controls</h3>
                  <ul>{(generatedReport.aiGatePilotWithControls ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <section>
                  <h3>Hold</h3>
                  <ul>{(generatedReport.aiGateHold ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              </div>
              <section>
                <h3>Next steps</h3>
                <ol>
                  {(generatedReport.nextSteps ?? []).map((item) => <li key={item}>{item}</li>)}
                </ol>
              </section>
            </article>
          ) : null}

          <article className="data-ai-report-page" id="data-ai-report-heatmap">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">03 - Maturity Heatmap</p>
              <h2>Domain maturity and gap concentration</h2>
            </div>
            <div className="data-ai-report-legend">
              <span><i className="critical" />Critical</span>
              <span><i className="high" />High</span>
              <span><i className="medium" />Medium</span>
              <span><i className="watch" />Watch</span>
            </div>
            <div className="data-ai-report-domain-grid">
              {summaries.map((summary) => (
                <div key={summary.id}>
                  <span>{summary.id.toString().padStart(2, "0")}</span>
                  <strong>{summary.nameEn}</strong>
                  <div className="data-ai-report-score-track" aria-label={`${summary.nameEn} report maturity score`}>
                    <span
                      className={`data-ai-report-score-fill ${summary.priority}`}
                      style={{ width: scoreWidth(summary.avgScore) }}
                    />
                  </div>
                  <p>
                    <b>{formatScore(summary.avgScore)} / 4</b>
                    <span className={`data-ai-priority ${summary.priority}`}>{priorityLabels[summary.priority]}</span>
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-gartner">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">04 - Capability Pillar Lens</p>
              <h2>Executive maturity framework roll-up</h2>
            </div>
            <p>
              The seven-pillar view translates the detailed diagnostic into an executive framework for deciding where to
              invest first, where governance must tighten, and which AI ambitions should proceed, pilot, or wait.
            </p>
            <div className="data-ai-report-domain-grid">
              {gartnerSummaries.map((pillar) => (
                <div key={pillar.id}>
                  <span>{pillar.id.toString().padStart(2, "0")} - {pillar.shortName}</span>
                  <strong>{pillar.name}</strong>
                  <div className="data-ai-report-score-track" aria-label={`${pillar.name} report pillar score`}>
                    <span
                      className={`data-ai-report-score-fill ${pillar.priority}`}
                      style={{ width: scoreWidth(pillar.avgScore) }}
                    />
                  </div>
                  <p>
                    <b>{formatScore(pillar.avgScore)} / 4</b>
                    <span className={`data-ai-priority ${pillar.priority}`}>{priorityLabels[pillar.priority]}</span>
                  </p>
                  <p>{pillar.scored}/{pillar.total} questions scored - {pillar.evidenceCoveragePct}% evidence-backed</p>
                </div>
              ))}
            </div>
            <div className="data-ai-report-table-wrap">
              <table className="data-ai-report-table">
                <thead>
                  <tr>
                    <th>Pillar</th>
                    <th>Mapped domains</th>
                    <th>Decision question</th>
                    <th>Management action</th>
                  </tr>
                </thead>
                <tbody>
                  {gartnerSummaries.map((pillar) => (
                    <tr key={pillar.id}>
                      <td>{pillar.name}</td>
                      <td>
                        {pillar.domainIds
                          .map((domainId) => dataAiDiagnosticDomains.find((domain) => domain.id === domainId)?.nameEn)
                          .filter(Boolean)
                          .join("; ")}
                      </td>
                      <td>{pillar.decisionQuestion}</td>
                      <td>{pillar.managementAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-actions">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">05 - Domain Action Plan</p>
              <h2>Strengths, vulnerabilities, and remediation route</h2>
            </div>
            <div className="data-ai-report-strength-vulnerability">
              <section className="strength">
                <h3>Relative strengths</h3>
                {strongestDomains.length ? (
                  <ol>
                    {strongestDomains.map((summary) => (
                      <li key={summary.id}>
                        <strong>{summary.nameEn}</strong> - {formatScore(summary.avgScore)} / 4, with {summary.scored}/{summary.total} questions scored.
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No strengths can be confirmed until scoring data is captured.</p>
                )}
              </section>
              <section className="vulnerability">
                <h3>Priority vulnerabilities</h3>
                {topGapDomains.length ? (
                  <ol>
                    {topGapDomains.map((summary) => (
                      <li key={summary.id}>
                        <strong>{summary.nameEn}</strong> - average gap {summary.avgGap?.toFixed(1)} from target maturity.
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No vulnerability pattern can be confirmed until scoring data is captured.</p>
                )}
              </section>
            </div>
            <section className="data-ai-report-callout">
              <h3>Evidence quality view</h3>
              <p>
                {evidenceBackedItems} of {totalQuestions} responses include both a non-empty evidence note and an evidence strength above
                "No evidence". Management should treat unsupported high scores as provisional until documents, system records,
                audit trails, or owner confirmations are attached.
              </p>
            </section>
            <div className="data-ai-report-table-wrap">
              <table className="data-ai-report-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Score</th>
                    <th>Gap</th>
                    <th>Priority</th>
                    <th>Recommended management action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportDomainRows.map((summary) => (
                    <tr key={summary.id}>
                      <td>{summary.nameEn}</td>
                      <td>{formatScore(summary.avgScore)} / 4</td>
                      <td>{summary.avgGap === null ? "No data" : summary.avgGap.toFixed(1)}</td>
                      <td><span className={`data-ai-priority ${summary.priority}`}>{priorityLabels[summary.priority]}</span></td>
                      <td>{domainActionForSummary(summary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-gaps">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">06 - Priority Gap Register</p>
              <h2>Highest-risk items requiring action</h2>
            </div>
            <div className="data-ai-report-table-wrap">
              <table className="data-ai-report-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Domain</th>
                    <th>Score</th>
                    <th>Gap</th>
                    <th>Evidence</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topPriorityGaps.length ? topPriorityGaps.map(({ question, state, gap }) => (
                    <tr className={state.score === 0 ? "critical-row" : undefined} key={question.id}>
                      <td>{question.questionEn}</td>
                      <td>{question.domainEn}</td>
                      <td>{state.score}</td>
                      <td>{gap}</td>
                      <td>{state.evidenceStrength}</td>
                      <td>{state.actionPlan || "Assign owner, evidence, and due date."}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6}>No scored gaps available. Seed or capture assessment data before issuing the report.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <section className="data-ai-report-callout">
              <h3>Control principle</h3>
              <p>Every high-priority gap should have an accountable owner, required evidence artifact, target date, and steering committee escalation path.</p>
            </section>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-roadmap">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">07 - 90-Day Roadmap</p>
              <h2>Remediation plan for decision-ready AI</h2>
            </div>
            <div className="data-ai-roadmap">
              {[
                ["Days 0-30", "Mobilise governance", "Confirm owners, scoring approval, evidence standard, and steering cadence."],
                ["Days 31-60", "Close critical gaps", "Resolve priority gaps in quality, sources, metadata, privacy, architecture, and ownership."],
                ["Days 61-90", "Certify AI readiness", "Publish validated scorecard, action register, AI use-case gating decision, and board report."],
              ].map(([period, title, text]) => (
                <div key={period}>
                  <span>{period}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <h3>Recommended workstreams</h3>
            <ul className="data-ai-report-columns">
              {reportWorkstreams.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="data-ai-report-page" id="data-ai-report-gate">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">08 - AI Readiness Gate</p>
              <h2>What can proceed now and what should wait</h2>
            </div>
            <div className="data-ai-gate-matrix">
              {[
                ["proceed", "Proceed", "Management dashboards, evidence-backed diagnostics, and AI-assisted reporting with human approval."],
                ["pilot", "Pilot with controls", "Forecasting, classification, and summarisation where source quality and privacy controls are confirmed."],
                ["hold", "Hold", "Autonomous decisions, sensitive generative AI workflows, and model outputs without audit trail or owner sign-off."],
              ].map(([tone, label, text]) => (
                <section className={tone} key={label}>
                  <h3>{label}</h3>
                  <p>{text}</p>
                </section>
              ))}
            </div>
            <div className="data-ai-report-two-col">
              <section>
                <h3>Feasible now</h3>
                <ul>
                  <li>Descriptive reporting and management dashboards.</li>
                  <li>Diagnostic gap analysis and evidence-backed action tracking.</li>
                  <li>Controlled AI-assisted report drafting with human review.</li>
                </ul>
              </section>
              <section>
                <h3>Gate before scale</h3>
                <ul>
                  <li>Predictive models using sensitive or incomplete source data.</li>
                  <li>Generative AI decisions without policy, prompt, and output controls.</li>
                  <li>Automated recommendations without auditability and accountable owners.</li>
                </ul>
              </section>
            </div>
            <section className="data-ai-report-callout">
              <h3>Local AI gateway note</h3>
              <p>
                Narrative generation is wired through the server-side local AI gateway using environment variables such as
                AI_GATEWAY_BASE_URL and LOCAL_AI_API_KEY. The gateway key must never be stored in client-side code or exposed in browser requests.
              </p>
            </section>
          </article>

          <article className="data-ai-report-page">
            <div className="data-ai-report-page-header">
              <p className="eyebrow">09 - Appendix</p>
              <h2>Prompt library and report generation basis</h2>
            </div>
            <div className="data-ai-prompt-list">
              {dataAiReportPrompts.map((prompt) => (
                <details key={prompt.title}>
                  <summary>{prompt.title}</summary>
                  <p>{prompt.prompt}</p>
                </details>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "evidence" ? (
        <section className="panel data-ai-section">
          <div className="data-ai-section-header">
            <div>
              <p className="eyebrow">OpenCare Contract</p>
              <h2>Data capture and AI reporting evidence model</h2>
            </div>
            <Link className="secondary-link" href="/use-cases">Back to use cases</Link>
          </div>
          <div className="data-ai-evidence-grid">
            {[
              ["Sources", "Assessment workbook, interviews, policies, architecture diagrams, report inventory, data catalogue, model records."],
              ["Capture tables", "diagnostic.questions, diagnostic.responses, diagnostic.evidence, diagnostic.action_plan, diagnostic.review_session."],
              ["Analytics marts", "domain maturity summary, gap priority matrix, AI readiness score, roadmap backlog, evidence completeness."],
              ["Capability lens", "Seven executive pillars mapped from the 13-domain workbook: strategy, governance, data quality, architecture, analytics and AI, people, and execution."],
              ["AI reporting", "Executive narrative, top gap ranking, 90-day actions, risk register, AI feasibility assessment."],
              ["Governance controls", "Human-reviewed scores, evidence required per question, source trace, owner assignment, approval status."],
              ["Backend status", "This page is a front-end capture shell. API persistence and model orchestration are pending wiring."],
            ].map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
