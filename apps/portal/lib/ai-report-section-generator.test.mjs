import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const generatorSource = readFileSync(join(here, "ai-report-section-generator.ts"), "utf8");
const routeSource = readFileSync(
  join(here, "..", "app", "api", "data-ai-diagnostic", "report", "route.ts"),
  "utf8",
);
const clientSource = readFileSync(
  join(here, "..", "app", "use-cases", "data-ai-capability-diagnostic", "workspace-client.tsx"),
  "utf8",
);

assert(generatorSource.includes("generateReportSection"));
assert(generatorSource.includes("Return ONLY valid JSON."));
assert(generatorSource.includes("candidate.slice(start, end + 1)"));
assert(generatorSource.includes("source: \"fallback\""));
assert(generatorSource.includes("attempt <= 2"));

assert(routeSource.includes("reportSectionConfigs"));
assert(routeSource.includes("mode: \"section_by_section\""));
assert(routeSource.includes("generateReportSection"));
assert(routeSource.includes("sectionFallbacks"));
assert(!routeSource.includes("requiredShape"));
assert(!routeSource.includes("Generate a concise consulting-grade Data and AI capability diagnostic report narrative"));

assert(clientSource.includes("section-by-section validation"));
assert(clientSource.includes("sectionFallbacks"));

console.log("ai-report-section-generator tests passed");
