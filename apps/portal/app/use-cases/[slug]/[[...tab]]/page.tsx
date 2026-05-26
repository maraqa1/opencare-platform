import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { TabNav } from "@/components/TabNav";
import { getApiJson } from "@/lib/api";
import { getUseCaseByPath } from "@/lib/use-cases";

import { MaterializedWorkspaceClient } from "./workspace-client";

export const metadata: Metadata = {
  title: "Materialized Use Case Workspace - OpenCare Portal",
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
  display_contract?: {
    title?: string;
    subtitle?: string;
    format?: string;
    unit?: string;
    empty_message?: string;
    value_field?: string;
    precision?: number;
    status_badge?: string;
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

export type WorkspaceDefinition = {
  identity?: {
    package_id?: string;
    name?: string;
    slug?: string;
    version?: string;
    domain?: string;
  };
  workspace_route?: string;
  tabs?: Array<{
    id?: string;
    label?: string;
    route?: string;
    component_specs?: ComponentSpec[];
  }>;
  state?: {
    materialization_status?: string;
    activation_status?: string;
    live_verification_status?: string;
  };
  kpis?: string[];
  personas?: Array<string | { title?: string; id?: string }>;
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
    cacheMode: "no-store",
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

  return (
    <PageFrame
      eyebrow="Materialized Use Case"
      title={workspace.identity?.name ?? slug}
      description={workspace.identity?.domain ?? "Compiled and materialized workspace definition."}
      chips={[
        { label: workspace.state?.materialization_status ?? "unknown", tone: "accent" },
        { label: workspace.state?.activation_status ?? "inactive", tone: "primary" },
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
        selectedTabLabel={selectedTab?.label ?? tabLabel(activeTab)}
        selectedComponents={selectedTab?.component_specs ?? []}
        diagnosticsHref={diagnosticsHref}
      />
    </PageFrame>
  );
}
