export type JazanMetric = {
  label: string;
  value: string | number | null;
  unit?: string | null;
};

export type JazanPillar = {
  id: string;
  number: number;
  title: string;
  tone: "blue" | "teal" | "green" | "cyan" | "purple" | "orange";
  summary: string;
  primary_kpi: JazanMetric;
  status: "on-track" | "watch" | "at-risk" | "unavailable";
  open_risks: number | null;
  data_freshness: string | null;
  route: string;
  responsible_control: string;
};

export type JazanOverview = {
  region: string;
  platform: string;
  vision: string;
  stakeholders: Array<{ title: string; coverage: string[] }>;
  foundation_enablers: string[];
  governance_controls: string[];
  success_measures: JazanMetric[];
};

export type JazanPillarsResponse = {
  pillars: JazanPillar[];
};

export const emptyJazanOverview: JazanOverview = {
  region: "Jazan Region",
  platform: "Performance Management Platform",
  vision:
    "A unified performance management ecosystem that drives strategic alignment, data-driven decisions, accountability, and measurable impact for Jazan Region.",
  stakeholders: [],
  foundation_enablers: [],
  governance_controls: [],
  success_measures: [],
};

export const emptyJazanPillarsResponse: JazanPillarsResponse = {
  pillars: [],
};

export function formatJazanMetric(metric?: JazanMetric) {
  if (!metric || metric.value === null || metric.value === undefined || metric.value === "") {
    return "Awaiting data";
  }

  return metric.unit ? `${metric.value}${metric.unit}` : String(metric.value);
}

export function formatJazanStatus(status?: JazanPillar["status"]) {
  if (!status || status === "unavailable") {
    return "Awaiting data";
  }

  return status.replace("-", " ");
}

export function formatJazanFreshness(value?: string | null) {
  return value || "Awaiting source refresh";
}

export function formatJazanRisks(value?: number | null) {
  return value === null || value === undefined ? "Awaiting risk feed" : String(value);
}
