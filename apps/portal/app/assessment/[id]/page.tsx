import { DataAiDiagnosticWorkspace } from "@/app/use-cases/data-ai-capability-diagnostic/workspace-client";

export default async function CustomerAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DataAiDiagnosticWorkspace assessmentId={id} />;
}
