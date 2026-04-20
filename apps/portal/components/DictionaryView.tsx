import { getApiJson } from "@/lib/api";

export async function DictionaryView({ useCase }: { useCase: string }) {
  const dictionary = await getApiJson<{
    items?: Array<{
      metric_id: string;
      metric_name: string;
      description: string;
      calculation_note: string;
      unit: string;
      source_table: string;
      category: string;
    }>;
  }>({
    path: "/api/v1/dictionary",
    fallback: { items: [] },
  });

  const rows = (dictionary.items ?? []).filter((item) => item.category === useCase);

  return (
    <section className="dictionary-grid">
      {rows.map((item) => (
        <article className="dictionary-row" key={item.metric_id}>
          <p className="eyebrow">{item.metric_id}</p>
          <h3>{item.metric_name}</h3>
          <p>{item.description}</p>
          <p className="subtle">Calculation: {item.calculation_note}</p>
          <p className="subtle">
            Unit: {item.unit} | Source: <code>{item.source_table}</code>
          </p>
        </article>
      ))}
    </section>
  );
}
