"use client";

import { useMemo, useState, useTransition } from "react";

type UseCaseManifestEntry = {
  name?: string;
  description?: string;
  enabled?: boolean;
  source_tables?: string[];
  portal_pages?: Array<{ slug?: string; label?: string }>;
  api_prefix?: string;
  superset_dashboard_id?: string;
  record_specs?: Array<{ table?: string; grain?: string }>;
};

type UseCaseRecord = {
  id: string;
  config: UseCaseManifestEntry;
};

function toStatusTone(enabled: boolean) {
  return enabled ? "live" : "stale";
}

export function UseCaseConfigurationPanel({
  initialUseCases,
}: {
  initialUseCases: UseCaseRecord[];
}) {
  const [useCases, setUseCases] = useState<UseCaseRecord[]>(initialUseCases);
  const [message, setMessage] = useState<string>("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedUseCases = useMemo(
    () =>
      [...useCases].sort((left, right) => {
        const leftEnabled = Boolean(left.config.enabled);
        const rightEnabled = Boolean(right.config.enabled);
        if (leftEnabled !== rightEnabled) {
          return leftEnabled ? -1 : 1;
        }
        return left.id.localeCompare(right.id);
      }),
    [useCases],
  );

  function toggleUseCase(useCaseId: string, enabled: boolean) {
    setPendingId(useCaseId);
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/portal/api/v1/config/use-cases/${encodeURIComponent(useCaseId)}`, {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        });

        const payload = (await response.json()) as {
          status?: string;
          all_use_cases?: Record<string, UseCaseManifestEntry>;
          detail?: string;
        };

        if (!response.ok || payload.status !== "ok" || !payload.all_use_cases) {
          throw new Error(payload.detail ?? "Unable to update the use case configuration.");
        }

        const nextUseCases = Object.entries(payload.all_use_cases).map(([id, config]) => ({
          id,
          config,
        }));

        setUseCases(nextUseCases);
        setMessage(`${useCaseId} ${enabled ? "included" : "excluded"} successfully.`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to update the use case configuration.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <>
      <article className="panel span-6">
        <p className="eyebrow">Use Case Configuration</p>
        <h3 className="section-heading">use_cases.yaml projection</h3>
        {message ? <p className="section-subtitle">{message}</p> : null}
        <div className="compact-feed">
          {sortedUseCases.map((useCase) => {
            const enabled = Boolean(useCase.config.enabled);
            const pending = pendingId === useCase.id && isPending;
            return (
              <div className="compact-alert" key={useCase.id}>
                <span className={`status-dot ${toStatusTone(enabled)}`} />
                <div style={{ flex: 1 }}>
                  <strong>{useCase.config.name ?? useCase.id}</strong>
                  <p>
                    <code>{useCase.id}</code> | {enabled ? "enabled: true" : "enabled: false"} |{" "}
                    {useCase.config.description ?? "No description provided."}
                  </p>
                </div>
                <button
                  className={enabled ? "secondary-link" : "button primary"}
                  disabled={pending}
                  onClick={() => toggleUseCase(useCase.id, !enabled)}
                  type="button"
                >
                  {pending ? "Saving..." : enabled ? "Exclude" : "Include"}
                </button>
              </div>
            );
          })}
        </div>
      </article>

      <article className="panel span-12">
        <p className="eyebrow">Use Case Metadata</p>
        <h3 className="section-heading">Operational and governance hooks</h3>
        <div className="compact-feed">
          {sortedUseCases.map((useCase) => {
            const portalPages = (useCase.config.portal_pages ?? [])
              .map((page) => page.slug ?? page.label)
              .filter((value): value is string => Boolean(value));
            const recordSpecs = (useCase.config.record_specs ?? [])
              .map((spec) => spec.table)
              .filter((value): value is string => Boolean(value));
            const sourceTables = (useCase.config.source_tables ?? []).filter(
              (value): value is string => Boolean(value),
            );

            return (
              <div className="panel" key={`${useCase.id}-metadata`}>
                <p className="eyebrow">{useCase.config.name ?? useCase.id}</p>
                <h4>{useCase.id}</h4>
                <table className="table">
                  <tbody>
                    <tr>
                      <th>Enabled</th>
                      <td>{Boolean(useCase.config.enabled) ? "true" : "false"}</td>
                    </tr>
                    <tr>
                      <th>API prefix</th>
                      <td><code>{useCase.config.api_prefix ?? "n/a"}</code></td>
                    </tr>
                    <tr>
                      <th>Superset dashboard</th>
                      <td><code>{useCase.config.superset_dashboard_id ?? "n/a"}</code></td>
                    </tr>
                    <tr>
                      <th>Source tables</th>
                      <td>{sourceTables.length ? sourceTables.join(", ") : "n/a"}</td>
                    </tr>
                    <tr>
                      <th>Portal pages</th>
                      <td>{portalPages.length ? portalPages.join(", ") : "n/a"}</td>
                    </tr>
                    <tr>
                      <th>Record specs</th>
                      <td>{recordSpecs.length ? `${recordSpecs.length} configured tables` : "n/a"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </article>
    </>
  );
}
