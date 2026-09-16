import { GEOMETRY, type BoxLayout, type DiagramLayout, type LayoutConnection } from "./layout";

export interface Point { x: number; y: number }
export interface RoutedConnection { connection: LayoutConnection; points: Point[]; label: { x: number; y: number; width: number; height: number; text: string; keyed: boolean; key?: number }; warning?: string }
const horizontal = (a: Point, b: Point) => a.y === b.y;
const segmentHitsBox = (a: Point, b: Point, box: BoxLayout, endpoints: Set<string>) => {
  if (endpoints.has(box.id)) return false;
  const left = box.x - GEOMETRY.inflate, right = box.x + box.width + GEOMETRY.inflate, top = box.y - GEOMETRY.inflate, bottom = box.y + box.height + GEOMETRY.inflate;
  if (horizontal(a, b)) return a.y >= top && a.y <= bottom && Math.max(a.x, b.x) >= left && Math.min(a.x, b.x) <= right;
  return a.x >= left && a.x <= right && Math.max(a.y, b.y) >= top && Math.min(a.y, b.y) <= bottom;
};
const routeHits = (points: Point[], boxes: BoxLayout[], endpoints: Set<string>) => points.slice(1).some((point, i) => boxes.some(box => segmentHitsBox(points[i], point, box, endpoints)));

function labelText(edge: LayoutConnection) {
  const frequency = edge.frequency === "unknown" ? "frequency unknown" : edge.frequency.replace(/_/g, " ");
  const label = edge.label.length > 28 ? `${edge.label.slice(0, 27)}…` : edge.label;
  return `${label} · ${frequency}${edge.count > 1 ? ` (${edge.count})` : ""}`;
}

export function routeDiagram(layout: DiagramLayout): RoutedConnection[] {
  const result: RoutedConnection[] = [], labelBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  let backIndex = 0;
  for (const [edgeIndex, connection] of layout.connections.entries()) {
    const from = layout.boxes.find(box => box.id === connection.from), to = layout.boxes.find(box => box.id === connection.to);
    if (!from || !to) continue;
    const pairKey = [connection.from, connection.to].sort().join("|");
    const parallels = layout.connections.filter(edge => [edge.from, edge.to].sort().join("|") === pairKey);
    const parallelOffset = (parallels.findIndex(edge => edge.id === connection.id) - (parallels.length - 1) / 2) * 12;
    let points: Point[]; const endpoints = new Set([from.id, to.id]);
    if (from.id === to.id) {
      const x = from.x + from.width, y = from.y + from.height / 2;
      points = [{ x, y: y - 12 }, { x: x + 28, y: y - 12 }, { x: x + 28, y: y + 12 }, { x, y: y + 12 }];
    } else if (from.bottom || to.bottom) {
      const lower = from.bottom ? from : to, upper = from.bottom ? to : from;
      const start = { x: lower.x + lower.width / 2, y: lower.y };
      const enterLeft = start.x <= upper.x + upper.width / 2;
      const channel = enterLeft ? upper.x - 24 - (edgeIndex % 3) * 12 : upper.x + upper.width + 24 + (edgeIndex % 3) * 12;
      const end = { x: enterLeft ? upper.x : upper.x + upper.width, y: upper.y + upper.height / 2 };
      const route = [start, { x: start.x, y: layout.bottomCorridorY }, { x: channel, y: layout.bottomCorridorY }, { x: channel, y: end.y }, end];
      points = from.bottom ? route : [...route].reverse();
    } else if (to.x > from.x) {
      const start = { x: from.x + from.width, y: from.y + from.height / 2 + parallelOffset }, end = { x: to.x, y: to.y + to.height / 2 + parallelOffset };
      if (start.y === end.y) points = [start, end];
      else { const channel = from.x + from.width + 24 + (edgeIndex % 4) * 12; points = [start, { x: channel, y: start.y }, { x: channel, y: end.y }, end]; }
    } else if (to.x === from.x) {
      const upper = from.y < to.y ? from : to, lower = from.y < to.y ? to : from; const side = from.x + from.width + 24 + (edgeIndex % 3) * 12;
      const path = [{ x: upper.x + upper.width / 2, y: upper.y + upper.height }, { x: side, y: upper.y + upper.height }, { x: side, y: lower.y }, { x: lower.x + lower.width / 2, y: lower.y }];
      points = from === upper ? path : [...path].reverse();
    } else {
      const offset = 24 + backIndex * 12, corridor = layout.topCorridorY - backIndex++ * 12;
      const start = { x: from.x + from.width, y: from.y + from.height / 2 }, startChannel = from.x + from.width + offset;
      const end = { x: to.x, y: to.y + to.height / 2 }, endChannel = to.x - offset;
      points = [start, { x: startChannel, y: start.y }, { x: startChannel, y: corridor }, { x: endChannel, y: corridor }, { x: endChannel, y: end.y }, end];
    }
    let warning: string | undefined;
    if (routeHits(points, layout.boxes, endpoints)) {
      const corridor = layout.topCorridorY - backIndex++ * 12, start = points[0], end = points[points.length - 1];
      points = [start, { x: start.x, y: corridor }, { x: end.x, y: corridor }, end];
      if (routeHits(points, layout.boxes, endpoints)) warning = `Layout warning for connection ${connection.id}.`;
    }
    const segments = points.slice(1).map((point, i) => ({ a: points[i], b: point, length: horizontal(points[i], point) ? Math.abs(point.x - points[i].x) : 0 })).filter(item => item.length > 0).sort((a, b) => b.length - a.length);
    const text = labelText(connection), width = Math.min(230, Math.max(62, text.length * 6.4)), height = 18;
    const candidates = segments.flatMap(segment => { const mid = (segment.a.x + segment.b.x) / 2; return [-10, 18].flatMap(yOffset => [0, -16, 16].map(xOffset => ({ x: mid - width / 2 + xOffset, y: segment.a.y + yOffset - height, width, height }))); });
    const collides = (box: { x: number; y: number; width: number; height: number }) => layout.boxes.some(node => box.x < node.x + node.width && box.x + box.width > node.x && box.y < node.y + node.height && box.y + box.height > node.y) || labelBoxes.some(other => box.x < other.x + other.width && box.x + box.width > other.x && box.y < other.y + other.height && box.y + box.height > other.y);
    const chosen = candidates.find(candidate => !collides(candidate));
    const keyed = !chosen, label = chosen ?? { x: points[Math.floor(points.length / 2)].x, y: points[Math.floor(points.length / 2)].y - 9, width: 18, height: 18 };
    labelBoxes.push(label); result.push({ connection, points, label: { ...label, text, keyed, ...(keyed ? { key: result.filter(item => item.label.keyed).length + 1 } : {}) }, warning });
  }
  return result;
}
