export function DiagramLegend() {
  return <div className="architecture-legend" aria-label="Architecture diagram legend">
    <span><i className="legend-automated" />Automated flow</span>
    <span><i className="legend-manual" />Manual process</span>
    <span><i className="legend-missing" />Detail missing</span>
    <span><b className="legend-risk">2</b>Risk flag</span>
    <span><b className="legend-issue">!</b>Known issue</span>
  </div>;
}

