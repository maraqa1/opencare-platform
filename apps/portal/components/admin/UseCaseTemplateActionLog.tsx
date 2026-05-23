import type { UseCaseTemplateAction } from "./use-case-template-types";

export function UseCaseTemplateActionLog({ actions }: { actions: UseCaseTemplateAction[] | undefined }) {
  return (
    <article className="panel span-12">
      <p className="eyebrow">Action Log</p>
      <h3 className="section-heading">Lifecycle action history</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Status</th>
            <th>Actor</th>
            <th>Validation</th>
            <th>Log</th>
          </tr>
        </thead>
        <tbody>
          {!actions || actions.length === 0 ? (
            <tr>
              <td colSpan={6}>No actions recorded yet.</td>
            </tr>
          ) : (
            actions.map((action) => (
              <tr key={action.event_id}>
                <td>{action.timestamp}</td>
                <td>{action.action}</td>
                <td>{action.status}</td>
                <td>{action.actor}</td>
                <td>{action.validation_result ?? "n/a"}</td>
                <td>{action.error_message ?? action.log ?? "n/a"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </article>
  );
}

