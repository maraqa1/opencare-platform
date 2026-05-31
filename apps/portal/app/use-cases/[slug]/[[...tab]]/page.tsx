import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { TabNav } from "@/components/TabNav";
import { getApiJson } from "@/lib/api";
import { getUseCaseByPath } from "@/lib/use-cases";

import { MaterializedWorkspaceClient } from "./workspace-client";

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

function tabLabel(tabId: string) {
  return tabId.replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function tabPathSegment(route: string | undefined) {
  if (!route) {
    return "";
  }
  const segments = route.split("/").filter(Boolean);
  return segments.at(-1) ?? "";
}

export default async function MaterializedUseCaseWorkspacePage({ params }: RouteContext) {
  const { slug, tab } = await params;
  const builtIn = getUseCaseByPath(`/use-cases/${slug}`);
  if (builtIn) {
    notFound();
  }

  const activeTab = tab?.[0] ?? "overview";
  const workspaceResponse = await getApiJson<{ workspace?: WorkspaceDefinition }>({
    path: `/api/v1/use-cases/${slug}/workspace`,
    fallback: { workspace: undefined },
    cacheMode: "revalidate",
  });
  const workspace = workspaceResponse.workspace;
  if (!workspace) {
    notFound();
  }

  const tabs = (workspace.tabs ?? []).map((item, index) => {
    const tabId = item.id ?? "overview";
    const routeSegment = tabPathSegment(item.route);
    const href =
      item.route && item.route.startsWith("/use-cases/")
        ? item.route
        : index === 0 || tabId === "overview"
          ? `/use-cases/${slug}`
          : `/use-cases/${slug}/${routeSegment || tabId}`;
    const routeKey = index === 0 ? "overview" : routeSegment || tabId;
    return {
      key: routeKey,
      label: item.label ?? tabLabel(tabId),
      href,
      id: tabId,
      route: item.route,
      component_specs: item.component_specs ?? [],
    };
  });

  const selectedTab =
    tabs.find((item, index) => {
      const routeSegment = tabPathSegment(item.route);
      return index === 0
        ? activeTab === "overview" || activeTab === item.id || activeTab === routeSegment
        : activeTab === item.id || activeTab === routeSegment;
    }) ?? tabs[0];

  const diagnosticsHref = workspace.identity?.package_id
    ? `/admin/use-case-templates/${encodeURIComponent(workspace.identity.package_id)}`
    : undefined;
  const selectedWidgetModels =
    workspace.dashboard_model?.tabs?.find((item, index) => {
      const routeSegment = tabPathSegment(item.route);
      return index === 0
        ? activeTab === "overview" || activeTab === item.id || activeTab === routeSegment
        : activeTab === item.id || activeTab === routeSegment;
    })?.widgets ?? [];

  return (
    <PageFrame
      eyebrow="Use Case Workspace"
      title={workspace.identity?.name ?? slug}
      description={
        workspace.identity?.description ??
        workspace.identity?.domain ??
        "Persisted workspace definition resolved from the active runtime model."
      }
      chips={[
        {
          label:
            workspace.state?.live_verification_status === "live_verified"
              ? "Trusted runtime"
              : workspace.state?.activation_status === "active"
                ? "Runtime active"
                : "Runtime review",
          tone: workspace.state?.live_verification_status === "live_verified" ? "accent" : "primary",
        },
        { label: `${tabs.length} tabs`, tone: "primary" },
      ]}
      actions={
        diagnosticsHref ? (
          <Link className="settings-link" href={diagnosticsHref}>
            Operator diagnostics
          </Link>
        ) : null
      }
    >
      <TabNav items={tabs.map(({ key, label, href }) => ({ key, label, href }))} activeKey={selectedTab?.key ?? "overview"} />
      <MaterializedWorkspaceClient
        slug={slug}
        workspace={workspace}
        selectedTabId={selectedTab?.id ?? activeTab}
        selectedTabLabel={selectedTab?.label ?? tabLabel(activeTab)}
        selectedComponents={selectedTab?.component_specs ?? []}
        selectedWidgetModels={selectedWidgetModels}
        allTabs={workspace.tabs ?? []}
        diagnosticsHref={diagnosticsHref}
      />
    </PageFrame>
  );
}
