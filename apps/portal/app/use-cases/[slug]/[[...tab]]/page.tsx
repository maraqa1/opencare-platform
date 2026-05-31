import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getUseCaseByPath } from "@/lib/use-cases";

import { WorkspaceShellClient } from "./workspace-shell-client";

export const metadata: Metadata = {
  title: "Use Case Workspace - OpenCare Portal",
};

type RouteContext = {
  params: Promise<{
    slug: string;
    tab?: string[];
  }>;
};

export type ComponentSpec = {
  id?: string;
  component_type?: string;
  source_endpoint?: string;
  endpoint?: string;
  purpose?: string;
  empty_state?: string;
  expected_fields?: string[];
  layout_contract?: {
    zone?: string;
    section?: string;
    order?: number;
  };
  display_contract?: {
    title?: string;
    subtitle?: string;
    format?: string;
    unit?: string;
    empty_message?: string;
    value_field?: string;
    precision?: number;
    status_badge?: string;
    zero_semantics?: string;
  };
  interaction_contract?: {
    click_behavior?: string;
    row_click_behavior?: string;
    navigation_targets?: string[];
  };
  governance_contract?: {
    classification?: string;
    phi_mode?: string;
    evidence_target?: string;
  };
  materialization_profile?: {
    renderer?: string;
    mandatory?: boolean;
    blocks_activation?: boolean;
  };
  data_binding_resolved?: {
    data_path?: string;
  };
};

export type DashboardWidgetModel = {
  id?: string;
  component_id?: string;
  component_type?: string;
  widget_kind?: "metric" | "metric-group" | "chart" | "table" | "governance" | "filter-group";
  title?: string;
  subtitle?: string;
  endpoint?: string;
  value_field?: string | null;
  format?: string;
  precision?: number;
  unit?: string;
  empty_message?: string;
  status_badge?: string;
  zero_semantics?: string;
  expected_fields?: string[];
  table_fields?: string[];
  layout?: {
    zone?: string;
    section?: string;
    order?: number;
  };
  governance?: {
    classification?: string;
    phi_mode?: string;
    evidence_target?: string;
  };
  interactions?: {
    click_behavior?: string;
    row_click_behavior?: string;
    navigation_targets?: string[];
  };
};

export type TabPayload = {
  tab?: {
    id?: string;
    label?: string;
    route?: string;
  };
  widgets?: Array<{
    component_id?: string;
    component_type?: string;
    widget_kind?: "metric" | "metric-group" | "chart" | "table" | "governance" | "filter-group";
    endpoint?: string | null;
    state?: "loading" | "empty" | "degraded" | "blocked" | "rendered";
    payload?: {
      data?: unknown[] | Record<string, unknown> | null;
      meta?: {
        empty?: boolean;
        as_of?: string;
        materialization_status?: string;
        activation_status?: string;
        live_verification_status?: string;
        filters_applied?: Record<string, string>;
        data_freshness?: {
          sla_status?: string;
          last_loaded_at?: string;
          max_expected_age_hours?: number;
        } | null;
      };
      warnings?: string[];
      errors?: string[];
    };
  }>;
  meta?: {
    as_of?: string;
    use_case_slug?: string;
    materialization_status?: string;
    activation_status?: string;
    live_verification_status?: string;
    widget_count?: number;
  };
};

export type WorkspaceDefinition = {
  identity?: {
    package_id?: string;
    name?: string;
    slug?: string;
    version?: string;
    domain?: string;
    description?: string;
  };
  workspace_route?: string;
  tabs?: Array<{
    id?: string;
    label?: string;
    route?: string;
    component_specs?: ComponentSpec[];
  }>;
  dashboard_model?: {
    version?: number;
    tabs?: Array<{
      id?: string;
      label?: string;
      route?: string;
      widgets?: DashboardWidgetModel[];
    }>;
  };
  state?: {
    materialization_status?: string;
    activation_status?: string;
    live_verification_status?: string;
  };
  kpis?: string[];
  personas?: Array<string | { title?: string; id?: string }>;
};

export type WorkspaceTabDefinition = {
  id?: string;
  label?: string;
  route?: string;
  component_specs?: ComponentSpec[];
};

export default async function MaterializedUseCaseWorkspacePage({ params }: RouteContext) {
  const { slug, tab } = await params;
  const builtIn = getUseCaseByPath(`/use-cases/${slug}`);
  if (builtIn) {
    notFound();
  }

  const activeTab = tab?.[0] ?? "overview";
  return <WorkspaceShellClient slug={slug} activeTab={activeTab} />;
}
