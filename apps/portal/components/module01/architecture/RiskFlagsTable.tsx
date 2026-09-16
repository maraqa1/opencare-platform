import { calculateRiskFlags, type ArchitectureDiagramModel } from "@/lib/module01/diagram";

export function RiskFlagsTable({ model }: { model: ArchitectureDiagramModel }) {
  const flags = calculateRiskFlags(model);
  return <div className="architecture-risk-table"><h4>Architecture risk flags</h4>
    {flags.length ? <div className="architecture-table-scroll"><table><thead><tr><th>Flag</th><th>Affected item</th><th>Summary</th><th>Diagnostic domains</th></tr></thead><tbody>{flags.map((flag, index) => <tr key={`${flag.itemId}-${flag.type}-${index}`}><td>{flag.type.replaceAll("_", " ")}</td><td>{flag.itemName}</td><td>{flag.summary}</td><td>{flag.domains.join("; ")}</td></tr>)}</tbody></table></div> : <p>No calculated risk flags.</p>}
  </div>;
}

