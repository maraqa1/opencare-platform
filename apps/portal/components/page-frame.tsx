import type { ReactNode } from "react";

type HeroChip = {
  label: string;
  tone: "primary" | "accent";
};

type PageFrameProps = {
  title: string;
  description: string;
  chips?: HeroChip[];
  children: ReactNode;
};

export function PageFrame({
  title,
  description,
  chips = [],
  children,
}: PageFrameProps) {
  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">OpenCare Portal</p>
        <h2>{title}</h2>
        <p>{description}</p>
        {chips.length > 0 ? (
          <div className="hero-strip">
            {chips.map((chip) => (
              <span key={chip.label} className={`chip ${chip.tone}`}>
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </section>
      {children}
    </div>
  );
}
