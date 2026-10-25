import type { ArenaLinePoint } from './ChartScales.ts';

export function arenaBarPath(x: number, w: number, yValue: number, yZero: number, r: number): string {
  const top = Math.min(yValue, yZero);
  const bottom = Math.max(yValue, yZero);
  const rr = Math.max(0, Math.min(r, w / 2, bottom - top));
  if (yValue > yZero) {
    return `M${x},${top} L${x},${bottom - rr} Q${x},${bottom} ${x + rr},${bottom}`
      + ` L${x + w - rr},${bottom} Q${x + w},${bottom} ${x + w},${bottom - rr} L${x + w},${top} Z`;
  }
  return `M${x},${bottom} L${x},${top + rr} Q${x},${top} ${x + rr},${top}`
    + ` L${x + w - rr},${top} Q${x + w},${top} ${x + w},${top + rr} L${x + w},${bottom} Z`;
}

export function arenaBarPathH(y: number, h: number, xValue: number, xZero: number, r: number): string {
  const left = Math.min(xValue, xZero);
  const right = Math.max(xValue, xZero);
  const rr = Math.max(0, Math.min(r, h / 2, right - left));
  if (xValue > xZero) {
    return `M${left},${y} L${right - rr},${y} Q${right},${y} ${right},${y + rr}`
      + ` L${right},${y + h - rr} Q${right},${y + h} ${right - rr},${y + h} L${left},${y + h} Z`;
  }
  return `M${right},${y} L${left + rr},${y} Q${left},${y} ${left},${y + rr}`
    + ` L${left},${y + h - rr} Q${left},${y + h} ${left + rr},${y + h} L${right},${y + h} Z`;
}

export function arenaArcPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    const mid = a0 + Math.PI;
    return `${arenaArcPath(cx, cy, rOuter, rInner, a0, mid)} ${arenaArcPath(cx, cy, rOuter, rInner, mid, a1)}`;
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const pt = (r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = pt(rOuter, a0);
  const [x1, y1] = pt(rOuter, a1);
  if (rInner <= 0) {
    return `M${cx},${cy} L${x0},${y0} A${rOuter},${rOuter} 0 ${large} 1 ${x1},${y1} Z`;
  }
  const [x2, y2] = pt(rInner, a1);
  const [x3, y3] = pt(rInner, a0);
  return `M${x0},${y0} A${rOuter},${rOuter} 0 ${large} 1 ${x1},${y1}`
    + ` L${x2},${y2} A${rInner},${rInner} 0 ${large} 0 ${x3},${y3} Z`;
}

export function arenaLinePoints(points: readonly ArenaLinePoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function arenaLineAreaPath(points: readonly ArenaLinePoint[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return '';
  const line = points.map((point) => `${point.x},${point.y}`).join(' L');
  return `M${first.x},${baseline} L${line} L${last.x},${baseline} Z`;
}

export function arenaCurveTangents(points: readonly ArenaLinePoint[]): number[] {
  const n = points.length;
  if (n < 2) return points.map(() => 0);
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) return points.map(() => 0);
    const dx = b.x - a.x;
    slopes.push(dx === 0 ? 0 : (b.y - a.y) / dx);
  }
  const m: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before === undefined) m.push(after ?? 0);
    else if (after === undefined) m.push(before);
    else if (before * after <= 0) m.push(0);
    else m.push((before + after) / 2);
  }
  for (let i = 0; i < n - 1; i += 1) {
    const d = slopes[i] ?? 0;
    if (d === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = (m[i] ?? 0) / d;
    const b = (m[i + 1] ?? 0) / d;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d;
      m[i + 1] = t * b * d;
    }
  }
  return m;
}

export function arenaCurveSegments(points: readonly ArenaLinePoint[]): string {
  const m = arenaCurveTangents(points);
  let path = '';
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) break;
    const dx = (b.x - a.x) / 3;
    path += ` C${a.x + dx},${a.y + (m[i] ?? 0) * dx} ${b.x - dx},${b.y - (m[i + 1] ?? 0) * dx} ${b.x},${b.y}`;
  }
  return path;
}

export function arenaCurvePath(points: readonly ArenaLinePoint[]): string {
  const first = points[0];
  if (!first) return '';
  return `M${first.x},${first.y}${arenaCurveSegments(points)}`;
}

export function arenaCurveAreaPath(points: readonly ArenaLinePoint[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return '';
  return `M${first.x},${baseline} L${first.x},${first.y}${arenaCurveSegments(points)} L${last.x},${baseline} Z`;
}

export interface ArenaFunnelEdge {
  y: number;
  width: number;
}

export function arenaFunnelRect(
  cx: number, y: number, h: number, width: number,
): { x: number; y: number; width: number; height: number } {
  return { x: cx - width / 2, y, width, height: h };
}

export function arenaFunnelConnector(cx: number, a: ArenaFunnelEdge, b: ArenaFunnelEdge): string {
  return `M${cx - a.width / 2},${a.y} L${cx + a.width / 2},${a.y}`
    + ` L${cx + b.width / 2},${b.y} L${cx - b.width / 2},${b.y} Z`;
}
