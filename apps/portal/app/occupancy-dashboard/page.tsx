import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { occupancyRows } from "@/lib/site-data";

export default async function OccupancyDashboardPage() {
  const facts = await getApiJson<{
    facts?: Array<{ name: string; measures?: string[] }>;
  }>({
    path: "/api/facts",
    fallback: { facts: [] },
  });

  return (
    <PageFrame
      title="Occupancy Dashboard"
      description="A governed summary of current department occupancy for customer users."
      chips={[
        { label: "Live portal view", tone: "primary" },
        { label: "No raw tables exposed", tone: "accent" },
      ]}
    >
      <section className="grid">
        <article className="panel span-12">
          <p className="eyebrow">Department Snapshot</p>
          <table className="table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Occupied</th>
                <th>Capacity</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {occupancyRows.map((row) => (
                <tr key={row.department}>
                  <td>{row.department}</td>
                  <td>{row.occupied}</td>
                  <td>{row.capacity}</td>
                  <td>{row.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="panel span-12">
          <p className="eyebrow">Available Facts</p>
          <p className="subtle">
            {(facts.facts ?? [])
              .map((fact) => `${fact.name}: ${(fact.measures ?? []).join(", ")}`)
              .join(" | ") || "Fact metadata unavailable."}
          </p>
        </article>
      </section>
    </PageFrame>
  );
}
