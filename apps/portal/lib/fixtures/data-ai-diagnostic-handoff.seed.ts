import {
  type DiagnosticStrategyHandoff,
  saveLatestDiagnosticStrategyHandoff,
} from "@/lib/data-ai-diagnostic-handoff";

export const seedDiagnosticStrategyHandoff: DiagnosticStrategyHandoff = {
  handoffVersion: "1.0",
  sourceModule: "data-ai-capability-diagnostic",
  generatedAt: "2026-06-13T00:00:00.000Z",
  customerContext: {
    organisationName: "Demo Organisation",
    domain: "Cross-functional business operations",
    geography: "Multiple entities and core business functions",
    reportPurpose: "Seeded diagnostic handoff for local Module 02 testing",
    audience: "Executive committee, data council, transformation leadership, and delivery teams",
  },
  assessmentSummary: {
    overallMaturity: 1.7,
    maturityLabel: "Ad hoc",
    readinessScorePct: 42,
    questionsScored: 84,
    totalQuestions: 84,
    domainsAssessed: 13,
    totalDomains: 13,
    evidenceBackedResponses: 79,
    totalResponses: 84,
    evidenceCoveragePct: 94,
  },
  domainSummaries: [
    ["01", "Data Strategy & Business Value", 2.0, 2.0, "High"],
    ["02", "Data Governance & Operating Model", 2.0, 2.0, "High"],
    ["03", "Data Architecture & Infrastructure", 2.0, 2.0, "High"],
    ["04", "Data Quality & Master Data", 0.9, 3.1, "Critical"],
    ["05", "Metadata, Catalogue & Data Lineage", 1.2, 2.8, "High"],
    ["06", "Reporting, Dashboards & Analytics", 2.9, 1.1, "Medium"],
    ["07", "Artificial Intelligence & Use Cases", 1.1, 2.9, "High"],
    ["08", "Tools & Platforms", 1.8, 2.2, "High"],
    ["09", "People, Capabilities & Operating Model", 2.0, 2.0, "High"],
    ["10", "Compliance, Privacy & Data Security", 2.0, 2.0, "High"],
    ["11", "Data Sources & Data Flows", 1.1, 2.9, "High"],
    ["12", "Training Data & Organisational Impact", 2.0, 2.0, "High"],
    ["13", "Execution, Roadmap & Value Measurement", 1.0, 3.0, "Critical"],
  ].map(([domainId, domainName, score, gap, priority]) => ({
    domainId: String(domainId),
    domainName: String(domainName),
    score: Number(score),
    gap: Number(gap),
    priority: priority as "Critical" | "High" | "Medium",
    evidenceCoveragePct: 94,
    recommendedAction: "Validate evidence, assign owner, and sequence remediation in the strategy roadmap.",
  })),
  gartnerSummaries: [
    "Strategy and value",
    "Governance and operating model",
    "Architecture and platform",
    "Data quality and trust",
    "Metadata and lineage",
    "Analytics and decision enablement",
    "AI readiness and responsible adoption",
  ].map((pillarName, index) => ({
    pillarName,
    score: [2.0, 2.0, 1.8, 0.9, 1.2, 2.9, 1.1][index] ?? null,
    gap: [2.0, 2.0, 2.2, 3.1, 2.8, 1.1, 2.9][index] ?? null,
    priority: (index === 3 ? "Critical" : index === 5 ? "Medium" : "High") as "Critical" | "High" | "Medium",
    decisionQuestion: "What management decision is required before strategy sign-off?",
    managementAction: "Confirm owner, target maturity, evidence source, and delivery sequence.",
    mappedDomains: [],
  })),
  priorityGaps: [
    ["Evidence-backed quality measurement is weak", "Data Quality & Master Data", 0.9, 3.1, "Define quality rules, owners, and evidence cadence"],
    ["Roadmap discipline and value tracking are not mature", "Execution, Roadmap & Value Measurement", 1.0, 3.0, "Create sequenced roadmap with benefits and control gates"],
    ["Source flow documentation is incomplete", "Data Sources & Data Flows", 1.1, 2.9, "Prioritise source inventory and lineage capture"],
    ["AI use-case gate requires stronger controls", "Artificial Intelligence & Use Cases", 1.1, 2.9, "Gate AI candidates through readiness, privacy, and owner approval"],
    ["Metadata and lineage need operating ownership", "Metadata, Catalogue & Data Lineage", 1.2, 2.8, "Assign catalogue ownership and lineage evidence standards"],
  ].map(([question, domain, score, gap, action]) => ({
    question: String(question),
    domain: String(domain),
    score: Number(score),
    gap: Number(gap),
    evidence: "Seeded diagnostic evidence for local demo/testing only",
    action: String(action),
    severity: Number(gap) >= 3 ? "Critical" : "High" as "Critical" | "High",
  })),
  aiReadinessGate: {
    thesis:
      "Demo seed indicates evidence-backed reporting and diagnostic use cases can proceed, while predictive and generative use cases require stronger source, quality, privacy, and ownership controls.",
    proceed: ["Evidence-backed diagnostic reporting", "Human-approved management summaries"],
    pilotWithControls: ["Forecasting and classification where source quality and privacy controls are confirmed"],
    hold: ["Autonomous decisions or model outputs without owner sign-off and audit trail"],
  },
  recommendedActions: [
    "Approve diagnostic baseline for strategy planning",
    "Assign accountable owners for critical gaps",
    "Prioritise quality, source flow, metadata, and roadmap controls",
    "Gate AI use cases against readiness and evidence standards",
  ],
  strategyInputs: {
    strategicPrioritiesFromDiagnostic: [
      "Improve decision quality",
      "Strengthen data ownership",
      "Establish trusted foundations",
      "Prepare controlled AI adoption",
    ],
    capabilityGapsToClose: [
      "Data quality measurement",
      "Source flow evidence",
      "Metadata and lineage ownership",
      "Roadmap and value tracking",
      "AI readiness controls",
    ],
    governanceImplications: [
      "Create clear owner model",
      "Define evidence routines",
      "Establish strategy decision gates",
    ],
    platformImplications: [
      "Prioritise source inventory, lineage, quality evidence, and consumption layer readiness",
    ],
    operatingModelImplications: [
      "Module 03 must design roles, forums, issue workflow, and control ownership for priority gaps",
    ],
    first90DayFocus: [
      "Confirm owners",
      "Close critical evidence gaps",
      "Publish first strategy roadmap",
      "Prepare Module 03 DMO design inputs",
    ],
  },
  rawGeneratedReport: {
    seedNotice: "Demo diagnostic handoff loaded — not production evidence",
  },
};

export function seedLatestDiagnosticStrategyHandoff(): DiagnosticStrategyHandoff {
  saveLatestDiagnosticStrategyHandoff(seedDiagnosticStrategyHandoff);
  return seedDiagnosticStrategyHandoff;
}
