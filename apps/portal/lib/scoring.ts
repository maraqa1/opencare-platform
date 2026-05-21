export function urgencyMultiplier(daysToDeadline?: number | null) {
  if (daysToDeadline == null) return 1.0;
  if (daysToDeadline < 0) return 2.5;
  if (daysToDeadline <= 2) return 2.0;
  if (daysToDeadline <= 7) return 1.5;
  if (daysToDeadline <= 14) return 1.2;
  return 1.0;
}

export function priorityScore(expectedRecovery?: number | null, effort?: number | null, daysToDeadline?: number | null) {
  if (!expectedRecovery || !effort) return 0;
  return Math.round((expectedRecovery / effort) * urgencyMultiplier(daysToDeadline) * 100) / 100;
}

export function scoreBand(score?: number | null) {
  if (score == null) return "Unknown";
  if (score >= 3000) return "High";
  if (score >= 1500) return "Medium";
  return "Low";
}
