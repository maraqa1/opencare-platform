"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { UseCaseTemplatePackage } from "./use-case-template-types";

function allowedActions(pkg: UseCaseTemplatePackage) {
  const fullRuntimeSupported = pkg.preview_summary?.install_impact?.full_runtime_supported === true;
  const actions = ["validate"];
  if (
    fullRuntimeSupported &&
    pkg.status !== "validation_failed" &&
    pkg.status !== "installed" &&
    pkg.status !== "applied" &&
    pkg.status !== "included" &&
    pkg.status !== "excluded" &&
    pkg.status !== "operationally_removed"
  ) {
    actions.push("install");
  }
  if (
    fullRuntimeSupported &&
    (pkg.status === "installed" ||
      pkg.status === "applied" ||
      pkg.status === "included" ||
      pkg.status === "excluded" ||
      pkg.status === "operationally_removed")
  ) {
    actions.push("apply");
    if (pkg.enabled) {
      actions.push("exclude", "remove-operational");
    } else {
      actions.push("include");
    }
    actions.push("uninstall");
  } else {
    actions.push("uninstall");
  }
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
        {fullRuntimeSupported
          ? "Install, apply, validate, include, exclude, remove, or uninstall"
          : "Validate or uninstall package"}
      </h3>
      {!fullRuntimeSupported ? (
        <p className="section-subtitle">
          This package is staged-only. The platform cannot fully materialize it into a real OpenCare use case yet, so
          install/apply/include/exclude controls are intentionally hidden.
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {allowedActions(pkg).map((action) => (
          <button
            className={action === "install" || action === "include" ? "button primary" : "secondary-link"}
            disabled={isPending}
            key={action}
            onClick={() => runAction(action)}
            type="button"
          >
            {pendingAction === action ? "Working..." : action}
          </button>
        ))}
      </div>
      {message ? <p className="section-subtitle">{message}</p> : null}
    </article>
  );
}
