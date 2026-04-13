import { PageFrame } from "@/components/page-frame";
import { dictionaryRows } from "@/lib/site-data";

export default function DictionaryManagementPage() {
  return (
    <PageFrame
      title="Dictionary Management"
      description="Administrative stewardship for shared metric definitions and usage guidance."
      chips={[
        { label: "Definitions owned", tone: "primary" },
        { label: "Customer-safe language", tone: "accent" },
      ]}
    >
      <section className="dictionary-grid">
        {dictionaryRows.map((item) => (
          <article className="dictionary-row" key={item.code}>
            <p className="eyebrow">{item.code}</p>
            <h3>{item.label}</h3>
            <p className="subtle">{item.definition}</p>
            <p>Owner: Analytics Governance</p>
          </article>
        ))}
      </section>
    </PageFrame>
  );
}
