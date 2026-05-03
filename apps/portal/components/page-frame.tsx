import type { ReactNode } from "react";

type HeroChip = {
  label: string;
  tone: "primary" | "accent";
};

type PageFrameProps = {
  eyebrow?: string;
  title: string;
  description: string;
  chips?: HeroChip[];
  actions?: ReactNode;
  children: ReactNode;
};

export function PageFrame({
  eyebrow = "OpenCare Portal",
  title,
  description,
  chips = [],
  actions,
  children,
}: PageFrameProps) {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-header">
          <div className="hero-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {actions ? <div className="hero-actions">{actions}</div> : null}
        </div>
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
