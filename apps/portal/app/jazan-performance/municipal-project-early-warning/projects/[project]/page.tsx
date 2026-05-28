import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/page-frame";
import { projectDemos } from "@/lib/jazan-early-warning-demo";

type PageProps = {
  params: Promise<{ project: string }>;
};

const monthLabels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const ganttLegend = [
  ["planned", "planned"],
  ["complete", "complete"],
  ["in-progress", "in progress"],
  ["overrun", "overrun"],
  ["forecast", "forecast"],
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { project: slug } = await params;
  const project = projectDemos.find((item) => item.slug === slug);

  return {
    title: project ? `${project.title} - Jazan project warning` : "Project warning",
  };
}

function ProjectBadge({ label }: { label: string }) {
  return <span className={`jazan-status-chip ${label.replace(" ", "-")}`}>{label}</span>;
}

function ProjectSchedule({ project }: { project: (typeof projectDemos)[number] }) {
  return (
    <div className="jazan-project-schedule">
      <div className="jazan-schedule-months">
        <span />
        {monthLabels.map((month) => (
          <strong key={month}>{month}</strong>
        ))}
      </div>
      <div className="jazan-schedule-body">
        {project.tasks.map((task) => (
          <div className="jazan-schedule-row" key={task.name}>
            <span>{task.name}</span>
            <div className="jazan-schedule-track">
              <i className={`jazan-schedule-bar ${task.status}`} style={{ left: `${task.start}%`, width: `${task.width}%` }} />
            </div>
          </div>
        ))}
        <div className="jazan-today-marker">
          <span>today</span>
        </div>
      </div>
      <div className="jazan-gantt-legend">
        {ganttLegend.map(([key, label]) => (
          <span key={key}>
            <i className={key} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function ProjectWarningPage({ params }: PageProps) {
  const { project: slug } = await params;
  const project = projectDemos.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <PageFrame
      eyebrow={`Home > Municipal early warning > ${project.municipality}`}
      title={project.title}
      description={`${project.subtitle} - ${project.municipality} municipality`}
      chips={[
        { label: project.status, tone: "accent" },
        { label: project.risk, tone: "accent" },
      ]}
      actions={
        <>
          <Link className="secondary-link" href="/jazan-performance/municipal-project-early-warning/municipalities/sabya">
            Back to Sabya
          </Link>
          <Link className="secondary-link" href="/jazan-performance/decision-rhythm-corrective-actions">
            Corrective actions
          </Link>
        </>
      }
      pageClassName="jazan-workspace-page jazan-project-detail-page"
    >
      <section className="jazan-detail-score-grid">
        {project.metrics.map((metric) => (
          <article className={`jazan-warning-metric ${metric.tone ?? ""}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.note}</p>
          </article>
        ))}
      </section>

      <section className="panel jazan-workspace-section">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">Schedule</p>
            <h2>Planned vs actual</h2>
          </div>
        </div>
        <ProjectSchedule project={project} />
      </section>

      <section className="jazan-two-column-grid">
        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Project metadata</p>
              <h2>Control record</h2>
            </div>
          </div>
          <dl className="jazan-project-meta">
            {project.metadata.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className={label === "Forecast end" ? "danger" : undefined}>{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="panel jazan-workspace-section">
          <div className="jazan-section-header">
            <div>
              <p className="eyebrow">Latest comments</p>
              <h2>Project observations</h2>
            </div>
          </div>
          <div className="jazan-comment-list">
            {project.comments.map((comment) => (
              <div key={comment.text}>
                <strong>{comment.text}</strong>
                <span>{comment.source}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel jazan-workspace-section jazan-ai-panel">
        <div className="jazan-section-header">
          <div>
            <p className="eyebrow">AI recommendations</p>
            <h2>Based on project history</h2>
          </div>
          <ProjectBadge label="advisory" />
        </div>
        <div className="jazan-recommendation-list">
          {project.recommendations.map((recommendation) => (
            <article key={recommendation.title}>
              <div>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.description}</p>
              </div>
              <ProjectBadge label={recommendation.confidence} />
            </article>
          ))}
        </div>
        <Link className="button primary" href="/jazan-performance/decision-rhythm-corrective-actions">
          Create escalation
        </Link>
        <p className="jazan-ai-note">Recommendations are advisory - generated from historical patterns, decided by the project owner.</p>
      </section>
    </PageFrame>
  );
}
