"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { UseCaseTemplatePackage } from "./use-case-template-types";

function allowedActions(pkg: UseCaseTemplatePackage) {
  const actions = ["validate", "compile"];
  if (pkg.compile_status === "compiled") {
    actions.push("plan-materialization", "materialize");
  }
  if (pkg.materialization_status === "materialized") {
    actions.push(pkg.enabled ? "exclude" : "activate");
  }
  if (pkg.activation_status === "active") {
    actions.push("verify-live", "remove-operational");
  }
  actions.push("uninstall");
  return actions;
}

export function UseCaseTemplateLifecyclePanel({ pkg }: { pkg: UseCaseTemplatePackage }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const packageRef = pkg.id ?? pkg.package_id;
  const fullRuntimeSupported = pkg.preview_summary?.install_impact?.full_runtime_supported === true;

  function runAction(action: string) {
    const confirmed =
      action !== "uninstall" ||
      window.confirm("Uninstall this package? This removes active visibility and requires explicit confirmation.");
    if (!confirmed) {
      return;
    }

    setMessage("");
    setPendingAction(action);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/portal/api/v1/admin/use-case-templates/${encodeURIComponent(packageRef)}/${action}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: action === "uninstall" ? JSON.stringify({ confirm: true, preserve_audit: true }) : undefined,
        });
        const payload = (await response.json()) as { status?: string; detail?: string };
        if (!response.ok || payload.status !== "ok") {
          throw new Error(payload.detail ?? `Unable to ${action} package.`);
        }
        setMessage(`Action "${action}" completed.`);
        if (action === "uninstall") {
          router.push("/admin/use-case-templates");
          return;
        }
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : `Unable to ${action} package.`);
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <article className="panel span-12">
      <p className="eyebrow">Lifecycle</p>
      <h3 className="section-heading">
        Compile, materialize, activate, verify, exclude, or uninstall
      </h3>
      <p className="section-subtitle">
        Preview can be partial. Live cannot be partial. Activation is only allowed after compile and materialization succeed.
      </p>
      <div className="metric-grid compact">
        <div className="forecast-stat"><p className="eyebrow">Validation</p><strong>{pkg.package_validation_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Compile</p><strong>{pkg.compile_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Materialization</p><strong>{pkg.materialization_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Activation</p><strong>{pkg.activation_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Live verify</p><strong>{pkg.live_verification_status ?? "n/a"}</strong></div>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {allowedActions(pkg).map((action) => (
          <button
            className={action === "activate" || action === "materialize" ? "button primary" : action === "uninstall" ? "button secondary" : "secondary-link"}
            disabled={isPending}
            key={action}
            onClick={() => runAction(action)}
            type="button"
          >
            {pendingAction === action
              ? "Working..."
              : action === "exclude"
                ? "Exclude"
                : action === "uninstall"
                  ? "Delete"
                  : action === "plan-materialization"
                    ? "Plan Materialization"
                    : action === "verify-live"
                      ? "Verify Live"
                      : action === "materialize"
                        ? "Materialize"
                        : action === "activate"
                          ? "Activate"
                          : action === "remove-operational"
                            ? "Remove Operationally"
                            : action[0].toUpperCase() + action.slice(1)}
          </button>
        ))}
      </div>
      {message ? <p className="section-subtitle">{message}</p> : null}
    </article>
  );
}
