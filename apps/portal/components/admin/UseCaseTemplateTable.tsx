"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { UseCaseTemplatePackage } from "./use-case-template-types";

function actionLabel(pkg: UseCaseTemplatePackage) {
  if (pkg.activation_status === "active") {
    return "Exclude";
  }
  if (pkg.materialization_status === "materialized") {
    return "Activate";
  }
  if (pkg.compile_status === "compiled") {
    return "Materialize";
  }
  return "Compile";
}

function actionEndpoint(pkg: UseCaseTemplatePackage) {
  if (pkg.activation_status === "active") {
    return "exclude";
  }
  if (pkg.materialization_status === "materialized") {
    return "activate";
  }
  if (pkg.compile_status === "compiled") {
    return "materialize";
  }
  return "compile";
}

export function UseCaseTemplateTable({ packages }: { packages: UseCaseTemplatePackage[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingOperation, setPendingOperation] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectableIds = useMemo(() => packages.map((pkg) => pkg.id ?? pkg.package_id), [packages]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : selectableIds);
  }

  function runRowAction(pkg: UseCaseTemplatePackage, endpoint: string) {
    const packageRef = pkg.id ?? pkg.package_id;
    const confirmed =
      endpoint !== "uninstall" ||
      window.confirm(`Delete package ${pkg.name}? This will permanently remove the uploaded package and its staged assets.`);
    if (!confirmed) {
      return;
    }

    setMessage("");
    setPendingOperation(`${endpoint}:${packageRef}`);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/portal/api/v1/admin/use-case-templates/${encodeURIComponent(packageRef)}/${endpoint}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: endpoint === "uninstall" ? JSON.stringify({ confirm: true, preserve_audit: false }) : undefined,
        });
        const payload = (await response.json()) as { status?: string; detail?: string };
        if (!response.ok || payload.status !== "ok") {
          throw new Error(payload.detail ?? `Unable to ${endpoint} package.`);
        }
        setMessage(`Action completed for ${pkg.name}.`);
        setSelectedIds((current) => current.filter((id) => id !== packageRef));
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : `Unable to ${endpoint} package.`);
      } finally {
        setPendingOperation(null);
      }
    });
  }

  function deleteSelected() {
    if (selectedIds.length === 0) {
      setMessage("Select one or more packages first.");
      return;
    }
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected package(s)?`);
    if (!confirmed) {
      return;
    }

    setMessage(`Deleting ${selectedIds.length} selected package${selectedIds.length === 1 ? "" : "s"}...`);
    setPendingOperation("bulk-delete");
    startTransition(async () => {
      try {
        for (const packageRef of selectedIds) {
          const response = await fetch(`/api/portal/api/v1/admin/use-case-templates/${encodeURIComponent(packageRef)}/uninstall`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ confirm: true, preserve_audit: false }),
          });
          const payload = (await response.json()) as { status?: string; detail?: string };
          if (!response.ok || payload.status !== "ok") {
            throw new Error(payload.detail ?? `Unable to delete package ${packageRef}.`);
          }
        }
        setMessage("Selected packages deleted.");
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to delete selected packages.");
      } finally {
        setPendingOperation(null);
      }
    });
  }

  return (
    <article className="panel span-12">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Templates</p>
          <h3 className="section-heading">Uploaded and installed use-case packages</h3>
          {isPending ? <p className="section-subtitle">Working on the selected package action...</p> : null}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="button secondary" disabled={isPending || selectedIds.length === 0} onClick={deleteSelected} type="button">
            {pendingOperation === "bulk-delete" ? "Deleting..." : "Delete Selected"}
          </button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>
              <input aria-label="Select all packages" checked={allSelected} disabled={isPending} onChange={toggleAll} type="checkbox" />
            </th>
            <th>Name</th>
            <th>Slug</th>
            <th>Version</th>
            <th>Domain</th>
            <th>Status</th>
            <th>Compile</th>
            <th>Materialize</th>
            <th>Activation</th>
            <th>Live</th>
            <th>Uploaded</th>
            <th>Last action</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {packages.length === 0 ? (
            <tr>
              <td colSpan={13}>No use-case template packages uploaded yet.</td>
            </tr>
          ) : (
            packages.map((pkg) => {
              const packageRef = pkg.id ?? pkg.package_id;
              const rowDeletePending = pendingOperation === `uninstall:${packageRef}`;
              const rowPrimaryPending = pendingOperation === `${actionEndpoint(pkg)}:${packageRef}`;
              return (
                <tr key={packageRef}>
                  <td>
                    <input
                      aria-label={`Select ${pkg.name}`}
                      checked={selectedIds.includes(packageRef)}
                      disabled={isPending}
                      onChange={() => toggleSelected(packageRef)}
                      type="checkbox"
                    />
                  </td>
                  <td>{pkg.name}</td>
                  <td><code>{pkg.slug}</code></td>
                  <td>{pkg.version}</td>
                  <td>{pkg.domain ?? "n/a"}</td>
                  <td>{pkg.status}</td>
                  <td>{pkg.compile_status ?? "n/a"}</td>
                  <td>{pkg.materialization_status ?? "n/a"}</td>
                  <td>{pkg.activation_status ?? "n/a"}</td>
                  <td>{pkg.live_verification_status ?? "n/a"}</td>
                  <td>{pkg.uploaded_at ?? "n/a"}</td>
                  <td>{pkg.last_action ?? "n/a"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button className="button primary" disabled={isPending} onClick={() => runRowAction(pkg, actionEndpoint(pkg))} type="button">
                        {rowPrimaryPending ? "Working..." : actionLabel(pkg)}
                      </button>
                      <button className="button secondary" disabled={isPending} onClick={() => runRowAction(pkg, "uninstall")} type="button">
                        {rowDeletePending ? "Deleting..." : "Delete"}
                      </button>
                      <Link className="secondary-link" href={`/admin/use-case-templates/${encodeURIComponent(packageRef)}`}>
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {message ? <p className="section-subtitle">{message}</p> : null}
    </article>
  );
}
