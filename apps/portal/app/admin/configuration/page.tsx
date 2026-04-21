import { PageFrame } from "@/components/page-frame";
import { useCases } from "@/lib/use-cases";

export default function AdminConfigurationPage() {
  return (
    <PageFrame
      eyebrow="Administration"
      title="Configuration"
      description="Current use case settings, thresholds, alert rules, and enablement state."
    >
      <section className="grid">
        <article className="panel span-6">
          <p className="eyebrow">Use Case Configuration</p>
          <h3 className="section-heading">use_cases.yaml projection</h3>
          <div className="compact-feed">
            {useCases.map((useCase) => (
              <div className="compact-alert" key={useCase.id}>
                <span className={`status-dot ${useCase.status === "active" ? "live" : "stale"}`} />
                <div>
                  <strong>{useCase.id}</strong>
                  <p>{useCase.status === "active" ? "enabled: true" : "enabled: false"} | {useCase.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel span-6">
          <p className="eyebrow">Thresholds and Rules</p>
          <table className="table">
            <tbody>
              <tr>
                <th>Critical occupancy</th>
                <td>90%</td>
              </tr>
              <tr>
                <th>Warning occupancy</th>
                <td>75%</td>
              </tr>
              <tr>
                <th>Forecast horizon</th>
                <td>7 days</td>
              </tr>
              <tr>
                <th>Decision priority</th>
                <td>Severity, breach window, confidence</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>
    </PageFrame>
  );
}
