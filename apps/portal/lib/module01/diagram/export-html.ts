import { calculateCompleteness } from "./completeness";
import type { ArchitectureDiagramModel } from "./model";
import { calculateRiskFlags } from "./risks";
import { architectureStatusLabel, renderArchitectureSvg } from "./render-svg";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const safeJson = (value: unknown) => JSON.stringify(value, null, 2).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
export interface ArchitectureExport { html: string; filename: string }

export function exportArchitectureHtml(model: ArchitectureDiagramModel, options: { assessmentSlug?: string; date?: string } = {}): ArchitectureExport {
  const rendered = renderArchitectureSvg(model), completeness = calculateCompleteness(model), risks = calculateRiskFlags(model);
  if (!rendered.validation.valid) throw new Error(rendered.validation.errors.join(" "));
  const rows = risks.map(risk => `<tr><td>${esc(risk.type.replace(/_/g, " "))}</td><td>${esc(risk.itemName)}</td><td>${esc(risk.summary)}</td><td>${esc(risk.domains.join("; "))}</td></tr>`).join("");
  const offlineSvg = rendered.svg.replace(' xmlns="http://www.w3.org/2000/svg"', "");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(model.title)}</title><style>body{font-family:Arial,sans-serif;color:#172233;margin:24px}h1{font-size:24px;margin:0 0 8px}.meta{color:#576574;margin:0 0 18px}.diagram{width:100%;overflow:auto}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}th,td{border:1px solid #ccd2da;padding:7px;text-align:left;vertical-align:top}th{background:#edf4f2}@page{size:A4 landscape;margin:10mm}@media print{body{margin:0}.diagram svg{max-height:150mm}table{page-break-before:auto}}</style></head><body><h1>${esc(model.title)}</h1><p class="meta">${esc(architectureStatusLabel(model))} · Detail completeness: ${completeness.label}</p><main class="diagram">${offlineSvg}</main><h2>Architecture risk flags</h2><table><thead><tr><th>Flag</th><th>Affected item</th><th>Summary</th><th>Diagnostic domains</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No calculated risk flags.</td></tr>'}</tbody></table><script type="application/json" id="architecture-model">${safeJson(model)}</script></body></html>`;
  const suppliedSlug = options.assessmentSlug || model.assessment_id;
  const slug = (!suppliedSlug || suppliedSlug.toLowerCase() === "unknown" ? "assessment" : suppliedSlug).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "assessment";
  const date = options.date || (/^\d{4}-\d{2}-\d{2}/.test(model.as_of) ? model.as_of.slice(0, 10) : "undated");
  return { html, filename: `${slug}-architecture-${date}.html` };
}
