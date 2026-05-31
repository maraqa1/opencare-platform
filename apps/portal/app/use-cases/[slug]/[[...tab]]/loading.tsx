import { PageFrame } from "@/components/page-frame";

export default function LoadingWorkspaceRoute() {
  return (
    <PageFrame
      eyebrow="Use Case Workspace"
      title="Opening workspace"
      description="Loading the active use case shell and runtime definition."
      chips={[
        { label: "Opening route", tone: "primary" },
        { label: "Preparing workspace", tone: "accent" },
      ]}
    >
      <section className="panel empty-state-panel">
        <p className="eyebrow">Opening workspace</p>
        <h3 className="section-heading">Preparing the use case shell</h3>
        <p className="section-subtitle">
          The portal is resolving the workspace route and loading the active runtime model.
        </p>
      </section>
    </PageFrame>
  );
}
