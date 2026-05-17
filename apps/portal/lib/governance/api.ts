import { getApiBaseUrl } from "@/lib/api";
import type {
  EvidencePackDescriptor,
  EvidenceSource,
  IssueRecord,
  MetricGovernanceRecord,
  PolicyRecord,
  TableGovernanceRecord,
  UseCaseGovernanceRecord,
} from "@/lib/governance/types";

export type GovernanceLineageNode = {
  id: string;
  label: string;
  kind: string;
  evidence_source: string;
  detail_route?: string | null;
  link?: string | null;
};

export type GovernanceLineage = {
  use_case_slug: string;
  nodes: GovernanceLineageNode[];
  edges: { source: string; target: string; evidence_source?: string | null }[];
  evidence: EvidenceSource[];
};

export type GovernanceEvidenceExport = {
  export_id: string;
  pack_id: string;
  status: string;
  requested_by?: string | null;
  requested_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  storage_uri?: string | null;
};

export type GovernanceEvidenceExportsResponse = {
  items: GovernanceEvidenceExport[];
};

export type GovernanceApiResult<TData> = {
  data: TData;
  error?: string;
};

async function governanceGet<TData>(path: string, fallback: TData): Promise<GovernanceApiResult<TData>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return {
        data: fallback,
        error: `Backend returned ${response.status} for ${path}.`,
      };
    }
    return { data: (await response.json()) as TData };
  } catch {
    return {
      data: fallback,
      error: `Backend unavailable for ${path}.`,
    };
  }
}

export function listGovernanceUseCases() {
  return governanceGet<UseCaseGovernanceRecord[]>("/api/v1/governance/use-cases", []);
}

export function getGovernanceUseCase(slug: string) {
  return governanceGet<UseCaseGovernanceRecord | null>(`/api/v1/governance/use-cases/${encodeURIComponent(slug)}`, null);
}

export function listGovernanceMetrics(slug: string) {
  return governanceGet<MetricGovernanceRecord[]>(`/api/v1/governance/use-cases/${encodeURIComponent(slug)}/metrics`, []);
}

export function getGovernanceMetric(slug: string, id: string) {
  return governanceGet<MetricGovernanceRecord | null>(
    `/api/v1/governance/use-cases/${encodeURIComponent(slug)}/metrics/${encodeURIComponent(id)}`,
    null,
  );
}

export function listGovernanceTables(slug: string) {
  return governanceGet<TableGovernanceRecord[]>(`/api/v1/governance/use-cases/${encodeURIComponent(slug)}/tables`, []);
}

export function getGovernanceTable(slug: string, id: string) {
  return governanceGet<TableGovernanceRecord | null>(
    `/api/v1/governance/use-cases/${encodeURIComponent(slug)}/tables/${encodeURIComponent(id)}`,
    null,
  );
}

export function getGovernanceLineage(slug: string) {
  return governanceGet<GovernanceLineage | null>(`/api/v1/governance/use-cases/${encodeURIComponent(slug)}/lineage`, null);
}

export function listGovernanceIssues() {
  return governanceGet<IssueRecord[]>("/api/v1/governance/issues", []);
}

export function listGovernanceEvidencePacks() {
  return governanceGet<EvidencePackDescriptor[]>("/api/v1/governance/evidence/packs", []);
}

export function listGovernanceEvidenceExports() {
  return governanceGet<GovernanceEvidenceExportsResponse>("/api/v1/governance/evidence/exports", { items: [] });
}

export function listGovernancePolicies() {
  return governanceGet<PolicyRecord[]>("/api/v1/governance/policies", []);
}
