import type {
  AlignmentGap,
  AlignmentMatrixRow,
  CascadeNode,
  MunicipalityCoverage,
  StrategicAlignmentWorkspace,
} from "@/app/jazan-performance/[pillar]/page";

export type ObjectiveSpotlight = {
  ministryAlignment: string;
  amanahObjective: string;
  owner: string;
  agency: string;
  municipalityCoverage: string;
  linkedKpis: string[];
  linkedInitiatives: string[];
  gaps: string[];
  actions: Array<{ label: string; href: string }>;
};

export type ObjectiveInitiativeLink = {
  objectiveName: string;
  initiativeName: string;
  kpiOrBenefit: string;
  relationshipType: "primary" | "supports_multiple_objectives";
};

export const strategicNarrativeCards = [
  {
    title: "Leadership reviews",
    text: "Confirms whether strategic objectives are aligned to measurable KPIs, initiatives, and municipality execution.",
    icon: "users",
  },
  {
    title: "PMO fixes",
    text: "Resolves missing owners, targets, benefits, initiative links, and municipality coverage gaps.",
    icon: "clipboard",
  },
  {
    title: "Municipalities own",
    text: "Confirm local objective coverage, KPI accountability, and execution commitments across all 25 municipalities.",
    icon: "map",
  },
];

export const demoCascadeStages: CascadeNode[] = [
  {
    id: "vision-ministry",
    label: "Vision 2030 / Ministry Priorities",
    stage: "vision_ministry",
    countLabel: "4 priorities",
    coveragePct: 100,
    status: "aligned",
    openGaps: 0,
  },
  {
    id: "amanah-objectives",
    label: "Amanah Strategic Objectives",
    stage: "amanah_objective",
    countLabel: "24 objectives",
    coveragePct: 87,
    status: "partially_aligned",
    openGaps: 3,
  },
  {
    id: "agency-department",
    label: "Agency / Department Objectives",
    stage: "agency_department",
    countLabel: "68 objectives",
    coveragePct: 82,
    status: "needs_review",
    openGaps: 6,
  },
  {
    id: "municipality-objectives",
    label: "Municipality Objectives",
    stage: "municipality",
    countLabel: "25 municipalities",
    coveragePct: 100,
    status: "aligned",
    openGaps: 0,
  },
  {
    id: "kpi-initiative-action",
    label: "KPIs + Initiatives + Actions",
    stage: "kpi_initiative_action",
    countLabel: "52 KPIs / 120 initiatives",
    coveragePct: 88,
    status: "needs_review",
    openGaps: 9,
  },
];

export const objectiveSpotlight: ObjectiveSpotlight = {
  ministryAlignment: "Service excellence and municipal transformation",
  amanahObjective: "Improve municipal service quality",
  owner: "Deputy for Services",
  agency: "Services Agency",
  municipalityCoverage: "25 / 25 municipalities",
  linkedKpis: ["Service request closure rate", "Average resolution time", "SLA compliance", "Citizen satisfaction"],
  linkedInitiatives: ["Service center improvement", "Digital request tracking", "Field response optimization"],
  gaps: ["2 KPIs missing approved thresholds", "1 initiative missing expected benefit"],
  actions: [
    {
      label: "Send KPI threshold gap to Pillar 2 - KPI & Performance Governance",
      href: "/jazan-performance/kpi-performance-governance",
    },
    {
      label: "Send initiative benefit gap to Pillar 5 - Decision Rhythm & Corrective Actions",
      href: "/jazan-performance/decision-rhythm-corrective-actions",
    },
  ],
};

export const demoAlignmentMatrix: AlignmentMatrixRow[] = [
  {
    objectiveId: "obj-service-quality",
    strategicObjective: "Improve municipal service quality",
    ministryAlignment: "Service excellence",
    owner: "Deputy for Services",
    linkedKpis: 4,
    linkedInitiatives: 3,
    municipalitiesCovered: "25 / 25",
    status: "aligned",
    gaps: [],
    carryForward: ["Pillar 2 certification"],
  },
  {
    objectiveId: "obj-project-delivery",
    strategicObjective: "Improve project delivery reliability",
    ministryAlignment: "Infrastructure delivery",
    owner: "PMO / Projects Agency",
    linkedKpis: 5,
    linkedInitiatives: 18,
    municipalitiesCovered: "25 / 25",
    status: "needs_review",
    gaps: ["1 initiative missing benefit"],
    carryForward: ["Pillar 5 action"],
  },
  {
    objectiveId: "obj-revenue",
    strategicObjective: "Increase revenue collection performance",
    ministryAlignment: "Financial sustainability",
    owner: "Finance & Investment",
    linkedKpis: 3,
    linkedInitiatives: 2,
    municipalitiesCovered: "22 / 25",
    status: "partially_aligned",
    gaps: ["3 municipalities missing targets"],
    carryForward: ["Pillar 2", "Pillar 5"],
  },
  {
    objectiveId: "obj-visual-distortion",
    strategicObjective: "Improve visual distortion response",
    ministryAlignment: "Urban quality and compliance",
    owner: "Field Compliance",
    linkedKpis: 7,
    linkedInitiatives: 16,
    municipalitiesCovered: "25 / 25",
    status: "partially_aligned",
    gaps: ["1 municipality owner pending"],
    carryForward: ["Pillar 5 action"],
  },
];

export const objectiveInitiativeLinks: ObjectiveInitiativeLink[] = [
  {
    objectiveName: "Improve municipal service quality",
    initiativeName: "Service center improvement",
    kpiOrBenefit: "Service request closure rate",
    relationshipType: "primary",
  },
  {
    objectiveName: "Improve municipal service quality",
    initiativeName: "Digital request tracking",
    kpiOrBenefit: "SLA compliance",
    relationshipType: "primary",
  },
  {
    objectiveName: "Improve municipal service quality",
    initiativeName: "Field response optimization",
    kpiOrBenefit: "Average resolution time",
    relationshipType: "primary",
  },
  {
    objectiveName: "Improve transparency and accountability",
    initiativeName: "Digital request tracking",
    kpiOrBenefit: "Decision visibility / escalation evidence",
    relationshipType: "supports_multiple_objectives",
  },
  {
    objectiveName: "Enable early warning for service deterioration",
    initiativeName: "Digital request tracking",
    kpiOrBenefit: "Early-warning data capture",
    relationshipType: "supports_multiple_objectives",
  },
];

export const demoMunicipalityCoverage: MunicipalityCoverage[] = Array.from({ length: 25 }, (_, index) => {
  const number = index + 1;
  const status = number <= 18 ? "complete" : number <= 23 ? "partial" : "at_risk";
  const coveragePct = status === "complete" ? 98 - (number % 4) : status === "partial" ? 86 - (number % 5) : 72 - (number % 3);
  const openGaps = status === "complete" ? number % 2 : status === "partial" ? 2 + (number % 3) : 5 + (number % 2);

  return {
    municipalityId: `mun-${number}`,
    municipalityName: `Municipality ${String(number).padStart(2, "0")}`,
    coveragePct,
    linkedObjectives: status === "complete" ? 21 : status === "partial" ? 17 : 13,
    openGaps,
    status,
  };
});

export const demoAlignmentGaps: AlignmentGap[] = [
  {
    gapId: "gap-kpi-target",
    gap: "KPI target missing",
    impactedObjective: "Improve municipal service quality",
    type: "KPI governance",
    owner: "Performance Office",
    targetPillar: "Pillar 2",
    dueDateLabel: "+14 days",
    escalation: "medium",
    expectedOutcome: "Approved target and threshold",
    status: "open",
  },
  {
    gapId: "gap-benefit",
    gap: "Initiative missing expected benefit",
    impactedObjective: "Improve project delivery reliability",
    type: "Initiative governance",
    owner: "PMO",
    targetPillar: "Pillar 5",
    dueDateLabel: "+10 days",
    escalation: "medium",
    expectedOutcome: "Benefit linked to KPI",
    status: "assigned",
  },
  {
    gapId: "gap-municipality-target",
    gap: "Municipality target missing",
    impactedObjective: "Increase revenue collection performance",
    type: "Coverage gap",
    owner: "Finance + Municipality Coordinators",
    targetPillar: "Pillar 2 / Pillar 5",
    dueDateLabel: "+21 days",
    escalation: "high",
    expectedOutcome: "Targets confirmed for 25 / 25 municipalities",
    status: "open",
  },
  {
    gapId: "gap-owner",
    gap: "Owner confirmation pending",
    impactedObjective: "Improve visual distortion response",
    type: "Ownership gap",
    owner: "Field Compliance",
    targetPillar: "Pillar 5",
    dueDateLabel: "+7 days",
    escalation: "low",
    expectedOutcome: "Local owner confirmed",
    status: "in_review",
  },
];

export const carryForwardRules = [
  ["Aligned objective", "Certified alignment package", "Pillar 2 - KPI & Performance Governance"],
  ["KPI / formula / target gap", "KPI governance exception", "Pillar 2"],
  ["Data / source gap", "Data readiness exception", "Pillar 3"],
  ["Risk / performance gap", "Early-warning candidate", "Pillar 4"],
  ["Owner / action / initiative gap", "Corrective-action item", "Pillar 5"],
  ["Repeated ownership / capability gap", "Training / sustainability need", "Pillar 6"],
];

export const demoStrategicAlignmentWorkspace: StrategicAlignmentWorkspace = {
  summary: {
    alignmentCoverage: 87,
    objectivesCascaded: "21 / 24",
    kpisLinked: "46 / 52",
    initiativesLinked: "108 / 120",
    municipalitiesCovered: "25 / 25",
    openAlignmentGaps: 9,
    dataFreshness: "Demo data",
  },
  cascadeNodes: demoCascadeStages,
  alignmentMatrix: demoAlignmentMatrix,
  municipalityCoverage: demoMunicipalityCoverage,
  initiativeLinkage: [],
  alignmentGaps: demoAlignmentGaps,
};
