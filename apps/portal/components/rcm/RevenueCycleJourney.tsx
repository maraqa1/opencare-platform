"use client";

import { timestamp } from "@/lib/format";

import styles from "./RevenueCycleJourney.module.css";
import { EmptyView, ErrorView, LoadingView } from "./shared/ViewStates";
import { useRCMFetch } from "./useRCMFetch";
import type { RcmJourneyResponse } from "./types";

const STATUS_CLASS_MAP = {
  healthy: styles.statusHealthy,
  watch: styles.statusWatch,
  critical: styles.statusCritical,
  unavailable: styles.statusUnavailable,
} as const;

const CARD_CLASS_MAP = {
  healthy: styles.healthy,
  watch: styles.watch,
  critical: styles.critical,
  unavailable: styles.unavailable,
} as const;

function toneClass(value: string) {
  return CARD_CLASS_MAP[value as keyof typeof CARD_CLASS_MAP] ?? CARD_CLASS_MAP.unavailable;
}

function statusClass(value: string) {
  return STATUS_CLASS_MAP[value as keyof typeof STATUS_CLASS_MAP] ?? STATUS_CLASS_MAP.unavailable;
}

export function RevenueCycleJourney({ filters }: { filters?: Record<string, string> }) {
  const { data, loading, error, stale, refetch } = useRCMFetch<RcmJourneyResponse>("journey", filters);

  if (loading) {
    return (
      <section className={styles.shell}>
        <article className={styles.loadingCard}>
          <LoadingView />
        </article>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.shell}>
        <article className={styles.loadingCard}>
          <ErrorView message={error} onRetry={refetch} />
        </article>
      </section>
    );
  }

  if (!data || data.stages.length === 0) {
    return (
      <section className={styles.shell}>
        <article className={styles.loadingCard}>
          <EmptyView message="The revenue cycle journey will appear once the filtered marts return stage metrics." />
        </article>
      </section>
    );
  }

  return (
    <section className={styles.shell}>
      <article className={styles.hero}>
        <p className={styles.eyebrow}>Revenue Cycle Journey</p>
        <h2 className={styles.title}>From Care Delivered to Cash Collected - Revenue Cycle Journey</h2>
        <p className={styles.subtitle}>
          Follow every riyal from clinical activity through coding, billing, payer adjudication,
          receivables, recovery, and final cash collection.
        </p>
        <p className={styles.generatedAt}>
          {`Generated ${timestamp(data.generated_at)}${stale ? " - freshness warning" : ""}`}
        </p>
      </article>

      <div className={styles.stageRail}>
        {data.stages.map((stage) => (
          <article
            key={stage.stage_id}
            className={`${styles.stageCard} ${toneClass(stage.risk_class)}`}
            title={stage.risk_note ?? stage.stage_note}
          >
            <div className={styles.stageTop}>
              <span className={styles.stageNumber}>{stage.stage_order}</span>
              <span className={`${styles.statusBadge} ${statusClass(stage.risk_class)}`}>
                {stage.status}
              </span>
            </div>

            <div>
              <h3 className={styles.stageName}>{stage.stage_name}</h3>
              <p className={styles.stageNote}>{stage.stage_note}</p>
            </div>

            <div className={styles.metricGrid}>
              {stage.metrics.map((metric) => (
                <div
                  key={`${stage.stage_id}-${metric.label}`}
                  className={`${styles.metricChip} ${metric.available ? "" : styles.metricChipMuted}`}
                >
                  <p className={styles.metricLabel}>{metric.label}</p>
                  <p className={styles.metricValue}>{metric.formatted_value}</p>
                </div>
              ))}
            </div>

            <div className={styles.riskNote}>{stage.risk_note ?? "No additional risk note provided."}</div>
          </article>
        ))}
      </div>

      <article className={styles.riskStrip}>
        <p className={styles.eyebrow}>Current Revenue Risk Concentration</p>
        <h3 className={styles.riskHeading}>Current Revenue Risk Concentration</h3>
        <p className={styles.riskCopy}>
          Revenue risk is concentrated in denied claims, aged receivables, DNFB backlog, and underpayments.
        </p>
        <div className={styles.riskChips}>
          {data.risk_concentration.map((chip) => (
            <div key={chip.label} className={`${styles.riskChip} ${toneClass(chip.risk_class)}`}>
              <span className={styles.riskChipLabel}>{chip.label}</span>
              <span className={styles.riskChipValue}>{chip.formatted_value}</span>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.quality}>
        <div>
          <p className={styles.eyebrow}>Data Quality</p>
          <h3 className={styles.riskHeading}>Availability and warnings</h3>
          <ul className={styles.qualityList}>
            {data.data_quality.warnings.length > 0 ? (
              data.data_quality.warnings.map((warning) => <li key={warning}>{warning}</li>)
            ) : (
              <li>No active data-quality warnings.</li>
            )}
          </ul>
        </div>
        <div>
          <p className={styles.eyebrow}>Source Tables</p>
          <h3 className={styles.riskHeading}>Current source coverage</h3>
          <div className={styles.tableList}>
            {data.data_quality.source_tables.map((tableName) => (
              <span className={styles.tableChip} key={tableName}>
                {tableName}
              </span>
            ))}
          </div>
          {data.data_quality.missing_metrics.length > 0 && (
            <ul className={styles.qualityList}>
              {data.data_quality.missing_metrics.map((metricName) => (
                <li key={metricName}>{metricName}</li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </section>
  );
}
