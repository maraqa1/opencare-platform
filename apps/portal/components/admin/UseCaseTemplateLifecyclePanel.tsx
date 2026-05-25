"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { UseCaseTemplatePackage } from "./use-case-template-types";

function allowedActions(pkg: UseCaseTemplatePackage) {
  const actions = ["validate", "compile"];
  if (pkg.compile_status === "compiled") {
    actions.push("plan-materialization", "materialize");
  }
  if (pkg.materialization_status === "materialized") {
    actions.push(pkg.enabled ? "exclude" : "activate");
  }
  if (pkg.activation_status === "active") {
    actions.push("verify-live", "remove-operational");
  }
  actions.push("uninstall");
  return actions;
}

type WorkflowAction =
  | "validate"
  | "compile"
  | "plan-materialization"
  | "materialize"
  | "activate"
  | "verify-live";

type WorkflowStep = {
  key: string;
  label: string;
  action: WorkflowAction;
  complete: boolean;
};

function isValidationSatisfied(pkg: UseCaseTemplatePackage) {
  return ["passed", "warning", "validated"].includes(pkg.package_validation_status ?? "");
}

function isCompileSatisfied(pkg: UseCaseTemplatePackage) {
  return pkg.compile_status === "compiled";
}

function isMaterializationPlanned(pkg: UseCaseTemplatePackage) {
  return Boolean(pkg.materialization_report?.plan);
}

function isMaterialized(pkg: UseCaseTemplatePackage) {
  return pkg.materialization_status === "materialized";
}

function isActivated(pkg: UseCaseTemplatePackage) {
  return pkg.activation_status === "active" || pkg.activation_status === "live_verified";
}

function isLiveVerified(pkg: UseCaseTemplatePackage) {
  return pkg.live_verification_status === "degraded" || pkg.live_verification_status === "live_verified";
}

function workflowSteps(pkg: UseCaseTemplatePackage): WorkflowStep[] {
  return [
    {
      key: "validation",
      label: "Validate package",
      action: "validate",
      complete: isValidationSatisfied(pkg),
    },
    {
      key: "compile",
      label: "Compile runtime definition",
      action: "compile",
      complete: isCompileSatisfied(pkg),
    },
    {
      key: "plan",
      label: "Plan materialization",
      action: "plan-materialization",
      complete: isMaterializationPlanned(pkg),
    },
    {
      key: "materialize",
      label: "Materialize workspace",
      action: "materialize",
      complete: isMaterialized(pkg),
    },
    {
      key: "activate",
      label: "Activate use case",
      action: "activate",
      complete: isActivated(pkg),
    },
    {
      key: "verify",
      label: "Verify live readiness",
      action: "verify-live",
      complete: isLiveVerified(pkg),
    },
  ];
}

function actionLabel(action: string) {
  if (action === "exclude") return "Exclude";
  if (action === "uninstall") return "Delete";
  if (action === "plan-materialization") return "Plan Materialization";
  if (action === "verify-live") return "Verify Live";
  if (action === "materialize") return "Materialize";
  if (action === "activate") return "Activate";
  if (action === "remove-operational") return "Remove Operationally";
  return action[0].toUpperCase() + action.slice(1);
}

export function UseCaseTemplateLifecyclePanel({ pkg }: { pkg: UseCaseTemplatePackage }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState("");
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const packageRef = pkg.id ?? pkg.package_id;
  const steps = useMemo(() => workflowSteps(pkg), [pkg]);
  const progressCount = steps.filter((step) => step.complete).length + completedActions.filter((action) => !steps.some((step) => step.action === action && step.complete)).length;
  const progressPercent = Math.round((progressCount / steps.length) * 100);

  async function executeAction(action: string) {
    setPendingAction(action);
    try {
      const response = await fetch(`/api/portal/api/v1/admin/use-case-templates/${encodeURIComponent(packageRef)}/${action}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: action === "uninstall" ? JSON.stringify({ confirm: true, preserve_audit: true }) : undefined,
      });
      const payload = (await response.json()) as { status?: string; detail?: string };
      if (!response.ok || payload.status !== "ok") {
        throw new Error(payload.detail ?? `Unable to ${action} package.`);
      }
      setCompletedActions((current) => (current.includes(action) ? current : [...current, action]));
      return true;
    } finally {
      setPendingAction(null);
    }
  }

  async function runWorkflow() {
    setMessage("");
    setWorkflowError("");
    setCompletedActions([]);
    setWorkflowRunning(true);
    try {
      for (const step of steps) {
        if (step.complete) {
          continue;
        }
        const ok = await executeAction(step.action);
        if (!ok) {
          break;
        }
      }
      setMessage("Automated materialization workflow completed.");
      router.refresh();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Workflow failed.";
      setWorkflowError(detail);
      setMessage(detail);
    } finally {
      setWorkflowRunning(false);
    }
  }

  async function runAction(action: string) {
    const confirmed =
      action !== "uninstall" ||
      window.confirm("Uninstall this package? This removes active visibility and requires explicit confirmation.");
    if (!confirmed) {
      return;
    }

    setMessage("");
    setWorkflowError("");
    try {
      const ok = await executeAction(action);
      if (ok) {
        setMessage(`Action "${action}" completed.`);
        if (action === "uninstall") {
          router.push("/admin/use-case-templates");
          return;
        }
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} package.`);
    }
  }

  return (
    <article className="panel span-12">
      <p className="eyebrow">Lifecycle</p>
      <h3 className="section-heading">
        Compile, materialize, activate, verify, exclude, or uninstall
      </h3>
      <p className="section-subtitle">
        Preview can be partial. Live cannot be partial. Activation is only allowed after compile and materialization succeed.
      </p>
      <div className="native-workflow-shell">
        <div className="native-workflow-header">
          <div>
            <p className="eyebrow">Guided workflow</p>
            <h4 className="section-heading">Automatic package progress</h4>
            <p className="section-subtitle">
              Run validation, compile, planning, materialization, activation, and live verification automatically.
            </p>
          </div>
          <button
            className="button primary"
            disabled={workflowRunning}
            onClick={() => void runWorkflow()}
            type="button"
          >
            {workflowRunning ? (
              <span className="native-workflow-button">
                <span className="native-workflow-clock" aria-hidden="true">◔</span>
                Running workflow
              </span>
            ) : (
              "Run Guided Workflow"
            )}
          </button>
        </div>
        <div className="native-workflow-progress">
          <div className="native-workflow-progress-bar">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="native-workflow-progress-label">{progressPercent}% complete</span>
        </div>
        <div className="native-workflow-steps">
          {steps.map((step) => {
            const isRunning = pendingAction === step.action;
            const isComplete = step.complete || completedActions.includes(step.action);
            const state = isRunning ? "running" : isComplete ? "complete" : "pending";
            return (
              <div className={`native-workflow-step ${state}`} key={step.key}>
                <span className="native-workflow-step-icon" aria-hidden="true">
                  {isRunning ? "◔" : isComplete ? "✓" : "○"}
                </span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{isRunning ? "In progress..." : isComplete ? "Completed" : "Waiting"}</p>
                </div>
              </div>
            );
          })}
        </div>
        {workflowError ? <p className="section-subtitle">{workflowError}</p> : null}
      </div>
      <div className="metric-grid compact">
        <div className="forecast-stat"><p className="eyebrow">Validation</p><strong>{pkg.package_validation_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Compile</p><strong>{pkg.compile_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Materialization</p><strong>{pkg.materialization_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Activation</p><strong>{pkg.activation_status ?? "n/a"}</strong></div>
        <div className="forecast-stat"><p className="eyebrow">Live verify</p><strong>{pkg.live_verification_status ?? "n/a"}</strong></div>
      </div>
      <details className="native-workflow-advanced">
        <summary>Advanced step controls</summary>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
        {allowedActions(pkg).map((action) => (
          <button
            className={action === "activate" || action === "materialize" ? "button primary" : action === "uninstall" ? "button secondary" : "secondary-link"}
            disabled={workflowRunning}
            key={action}
            onClick={() => void runAction(action)}
            type="button"
          >
            {pendingAction === action ? "Working..." : actionLabel(action)}
          </button>
        ))}
        </div>
      </details>
      {message ? <p className="section-subtitle">{message}</p> : null}
    </article>
  );
}
