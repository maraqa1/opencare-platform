import { ComplianceSummary } from "@/components/ComplianceSummary";
import { DataQualitySummary } from "@/components/DataQualitySummary";
import { ImpactAnalysis } from "@/components/ImpactAnalysis";
import { LineageDAG } from "@/components/LineageDAG";
import { SourceFreshness } from "@/components/SourceFreshness";

export function GovernanceView() {
  return (
    <div className="governance-stack">
      <LineageDAG modelName="fct_bed_occupancy" />
      <div className="governance-grid">
        <SourceFreshness />
        <ImpactAnalysis />
      </div>
      <DataQualitySummary />
      <ComplianceSummary />
    </div>
  );
}
