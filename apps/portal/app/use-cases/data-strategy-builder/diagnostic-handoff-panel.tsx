"use client";

import { useEffect, useState } from "react";

import {
  type DiagnosticStrategyHandoff,
  loadLatestDiagnosticStrategyHandoff,
} from "@/lib/data-ai-diagnostic-handoff";

function formatMaturity(value: number | null) {
  return value === null ? "No maturity baseline" : `${value.toFixed(1)} / 4`;
}

export default function DiagnosticHandoffPanel() {
  const [handoff, setHandoff] = useState<DiagnosticStrategyHandoff | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHandoff(loadLatestDiagnosticStrategyHandoff());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <aside className="data-strategy-handoff-panel" aria-label="Diagnostic handoff status">
        <span>Diagnostic input</span>
        <strong>Checking local handoff</strong>
        <p>Looking for the latest Module 01 strategy input contract.</p>
      </aside>
    );
  }

  if (!handoff) {
    return (
      <aside className="data-strategy-handoff-panel" aria-label="Diagnostic handoff status">
        <span>Diagnostic input</span>
        <strong>Needs Module 01 output</strong>
        <p>No local diagnostic handoff found. Generate the Module 01 report to make the strategy input available.</p>
      </aside>
    );
  }

  const organisation = handoff.customerContext.organisationName ?? "Customer context not captured";
  const priorityGaps = handoff.priorityGaps.slice(0, 3);

  return (
    <aside className="data-strategy-handoff-panel ready" aria-label="Diagnostic handoff status">
      <span>Module 01 handoff loaded</span>
      <strong>{formatMaturity(handoff.assessmentSummary.overallMaturity)}</strong>
      <p>{organisation}</p>
      <dl>
        <div>
          <dt>Questions scored</dt>
          <dd>{handoff.assessmentSummary.questionsScored} / {handoff.assessmentSummary.totalQuestions}</dd>
        </div>
        <div>
          <dt>Evidence coverage</dt>
          <dd>{handoff.assessmentSummary.evidenceCoveragePct ?? "No data"}%</dd>
        </div>
        <div>
          <dt>Priority gaps</dt>
          <dd>{handoff.priorityGaps.length}</dd>
        </div>
      </dl>
      <div>
        <small>Top strategy inputs</small>
        {priorityGaps.length ? (
          <ul>
            {priorityGaps.map((gap) => (
              <li key={`${gap.domain}-${gap.question}`}>{gap.domain}: {gap.action || gap.question}</li>
            ))}
          </ul>
        ) : (
          <p>No priority gaps included in the handoff.</p>
        )}
      </div>
    </aside>
  );
}
