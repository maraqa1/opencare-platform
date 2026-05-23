import type { UseCaseTemplateValidationReport } from "./use-case-template-types";

export function UseCaseTemplateValidationReportPanel({
  validation,
}: {
  validation: UseCaseTemplateValidationReport | undefined;
}) {
  if (!validation) {
    return (
      <article className="panel span-12">
        <p className="eyebrow">Validation</p>
        <h3 className="section-heading">No validation report available yet</h3>
      </article>
    );
  }

  return (
    <article className="panel span-12">
      <p className="eyebrow">Validation</p>
      <h3 className="section-heading">Grouped validation report</h3>
      <p className="section-subtitle">
        Passed: {validation.summary.passed} | Warnings: {validation.summary.warnings} | Failed: {validation.summary.failed}
      </p>
      {validation.blocking_errors.length > 0 ? (
        <div className="compact-feed">
          {validation.blocking_errors.map((error) => (
            <div className="compact-alert" key={error}>
              <span className="status-dot critical" />
              <div>
                <strong>Blocking error</strong>
                <p>{error}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {Object.entries(
        validation.checks.reduce<Record<string, typeof validation.checks>>((grouped, check) => {
          grouped[check.category] = grouped[check.category] ?? [];
          grouped[check.category].push(check);
          return grouped;
        }, {}),
      ).map(([category, checks]) => (
        <div key={category} style={{ marginTop: "1rem" }}>
          <p className="eyebrow">{category}</p>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={`${check.category}-${check.check}`}>
                  <td><code>{check.check}</code></td>
                  <td>{check.status}</td>
                  <td>{check.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </article>
  );
}
