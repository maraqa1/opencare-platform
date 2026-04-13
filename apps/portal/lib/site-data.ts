export const occupancyRows = [
  { department: "Medicine", occupied: 118, capacity: 130, rate: "90.8%" },
  { department: "Surgery", occupied: 71, capacity: 84, rate: "84.5%" },
  { department: "Emergency", occupied: 46, capacity: 52, rate: "88.4%" },
  { department: "ICU", occupied: 19, capacity: 22, rate: "86.3%" },
];

export const forecastRows = [
  { date: "2026-04-14", department: "Medicine", predicted: 118, confidence: "High" },
  { date: "2026-04-14", department: "Surgery", predicted: 71, confidence: "Medium" },
  { date: "2026-04-15", department: "Emergency", predicted: 48, confidence: "Medium" },
  { date: "2026-04-15", department: "ICU", predicted: 20, confidence: "High" },
];

export const anomalyRows = [
  {
    department: "Emergency",
    date: "2026-04-12",
    severity: "High",
    summary: "Census exceeded trailing baseline by 18%.",
  },
  {
    department: "ICU",
    date: "2026-04-12",
    severity: "Medium",
    summary: "Sustained high occupancy pressure over two shifts.",
  },
];

export const reportRows = [
  { name: "Daily Bed Occupancy Summary", format: "PDF", updated: "06:00 UTC" },
  { name: "Weekly Capacity Trend", format: "CSV", updated: "07:30 UTC" },
  { name: "Forecast Variance Snapshot", format: "PDF", updated: "08:15 UTC" },
];

export const dictionaryRows = [
  {
    code: "occupied_beds",
    label: "Occupied Beds",
    definition: "Beds currently assigned to admitted inpatients.",
  },
  {
    code: "licensed_capacity",
    label: "Licensed Capacity",
    definition: "Maximum licensed bed count by department.",
  },
  {
    code: "forecast_occupancy",
    label: "Forecast Occupancy",
    definition: "Projected occupancy from curated analytics marts.",
  },
];

export const runtimeStatusRows = [
  { runtime: "bed-forecast", schema: "analytics", output: "forecast_bed_occupancy" },
  { runtime: "anomaly", schema: "analytics", output: "anomaly_bed_occupancy" },
];

export const refreshRows = [
  { service: "Airbyte ingestion", status: "Scheduled", updated: "05:00 UTC" },
  { service: "dbt transformations", status: "Successful", updated: "05:35 UTC" },
  { service: "Superset cache refresh", status: "Healthy", updated: "05:45 UTC" },
];

export const platformHealthRows = [
  { service: "PostgreSQL", endpoint: "postgres:5432", state: "Healthy" },
  { service: "MinIO", endpoint: "minio:9000", state: "Healthy" },
  { service: "Redis", endpoint: "redis:6379", state: "Healthy" },
  { service: "Keycloak", endpoint: "keycloak:8080", state: "Healthy" },
  { service: "Superset", endpoint: "superset:8088", state: "Healthy" },
];
