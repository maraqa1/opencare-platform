"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageFrame } from "@/components/page-frame";
import { TabNav } from "@/components/TabNav";

import { MaterializedWorkspaceClient } from "./workspace-client";
import type { WorkspaceDefinition } from "./page";

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

function slugLabel(slug: string) {
  return slug.replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

type WorkspaceShellClientProps = {
  slug: string;
  activeTab: string;
};

export function WorkspaceShellClient({ slug, activeTab }: WorkspaceShellClientProps) {
  const [workspace, setWorkspace] = useState<WorkspaceDefinition | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const response = await fetch(`/api/portal/api/v1/use-cases/${slug}/workspace`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setWorkspace(null);
            setLoadState("missing");
          }
          return;
        }

        const payload = (await response.json()) as { workspace?: WorkspaceDefinition };
        if (!cancelled) {
          setWorkspace(payload.workspace ?? null);
          setLoadState(payload.workspace ? "ready" : "missing");
        }
      } catch {
        if (!cancelled) {
          setWorkspace(null);
          setLoadState("missing");
        }
      }
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const tabs = useMemo(() => {
    return (workspace?.tabs ?? []).map((item, index) => {
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
  }, [slug, workspace]);

  const selectedTab = useMemo(() => {
    return (
      tabs.find((item, index) => {
        const routeSegment = tabPathSegment(item.route);
        return index === 0
          ? activeTab === "overview" || activeTab === item.id || activeTab === routeSegment
          : activeTab === item.id || activeTab === routeSegment;
      }) ?? tabs[0]
    );
  }, [activeTab, tabs]);

  const selectedWidgetModels = useMemo(() => {
    return (
      workspace?.dashboard_model?.tabs?.find((item, index) => {
        const routeSegment = tabPathSegment(item.route);
        return index === 0
          ? activeTab === "overview" || activeTab === item.id || activeTab === routeSegment
          : activeTab === item.id || activeTab === routeSegment;
      })?.widgets ?? []
    );
  }, [activeTab, workspace]);

  const diagnosticsHref = workspace?.identity?.package_id
    ? `/admin/use-case-templates/${encodeURIComponent(workspace.identity.package_id)}`
    : undefined;

  return (
    <PageFrame
      eyebrow="Use Case Workspace"
      title={workspace?.identity?.name ?? slugLabel(slug)}
      description={
        workspace?.identity?.description ??
        workspace?.identity?.domain ??
        "Persisted workspace definition resolved from the active runtime model."
      }
      chips={[
        {
          label:
            loadState === "loading"
              ? "Opening workspace"
              : workspace?.state?.live_verification_status === "live_verified"
                ? "Trusted runtime"
                : workspace?.state?.activation_status === "active"
                  ? "Runtime active"
                  : "Runtime review",
          tone: workspace?.state?.live_verification_status === "live_verified" ? "accent" : "primary",
        },
        { label: loadState === "ready" ? `${tabs.length} tabs` : "Loading shell", tone: "primary" },
      ]}
      actions={
        diagnosticsHref ? (
          <Link className="settings-link" href={diagnosticsHref}>
            Operator diagnostics
          </Link>
        ) : null
      }
    >
      {tabs.length > 0 ? (
        <TabNav items={tabs.map(({ key, label, href }) => ({ key, label, href }))} activeKey={selectedTab?.key ?? "overview"} />
      ) : null}

      {loadState === "ready" && workspace && selectedTab ? (
        <MaterializedWorkspaceClient
          slug={slug}
          workspace={workspace}
          selectedTabId={selectedTab.id ?? activeTab}
          selectedTabLabel={selectedTab.label ?? tabLabel(activeTab)}
          selectedComponents={selectedTab.component_specs ?? []}
          selectedWidgetModels={selectedWidgetModels}
          allTabs={workspace.tabs ?? []}
          diagnosticsHref={diagnosticsHref}
        />
      ) : null}

      {loadState === "loading" ? (
        <section className="panel empty-state-panel">
          <p className="eyebrow">Opening workspace</p>
          <h3 className="section-heading">{slugLabel(slug)}</h3>
          <p className="section-subtitle">Loading the active runtime definition and workspace layout.</p>
        </section>
      ) : null}

      {loadState === "missing" ? (
        <section className="panel empty-state-panel">
          <p className="eyebrow">Workspace unavailable</p>
          <h3 className="section-heading">{slugLabel(slug)}</h3>
          <p className="section-subtitle">
            The runtime workspace could not be loaded for this use case. Check operator diagnostics and package state.
          </p>
        </section>
      ) : null}
    </PageFrame>
  );
}
