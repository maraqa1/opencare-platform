import type { TrustState } from "@/lib/governance-registry";

export function TrustBadge({
  state,
  label,
}: {
  state: TrustState;
  label?: string;
}) {
  const text =
    label ??
    (state === "trusted"
      ? "Trusted"
      : state === "degraded"
        ? "Degraded"
        : state === "untrusted"
          ? "Untrusted"
          : "Unmapped");

  return <span className={`trust-badge ${state}`}>{text}</span>;
}
