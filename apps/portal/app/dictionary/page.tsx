import { PageFrame } from "@/components/page-frame";
import { getApiJson } from "@/lib/api";
import { dictionaryRows } from "@/lib/site-data";

export default async function DictionaryPage() {
  const dictionary = await getApiJson<{
    items?: Array<{ code: string; label: string; description: string }>;
  }>({
    path: "/api/dictionary",
    fallback: { items: [] },
  });

  const rows =
    (dictionary.items ?? []).map((item) => ({
      code: item.code,
      label: item.label,
      definition: item.description,
    })) || [];

  return (
    <PageFrame
      title="Dictionary"
      description="Shared definitions for platform measures and curated analytics terms."
      chips={[
        { label: "Governed terminology", tone: "primary" },
        { label: "Analytics-safe", tone: "accent" },
      ]}
    >
      <section className="dictionary-grid">
        {(rows.length > 0 ? rows : dictionaryRows).map((item) => (
          <article className="dictionary-row" key={item.code}>
            <p className="eyebrow">{item.code}</p>
            <h3>{item.label}</h3>
            <p className="subtle">{item.definition}</p>
          </article>
        ))}
      </section>
    </PageFrame>
  );
}
