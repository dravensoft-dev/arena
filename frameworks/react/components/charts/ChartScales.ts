import { chartBubbleRMin, chartBubbleRMax } from '../../Tokens.generated.js';
export interface ArenaLinePoint {
  x: number;
  y: number;
}

export interface ArenaDoughnutSlice {
  index: number;
  from: number;
  to: number;
  share: number;
  percent: number;
}

export interface ArenaLinearScale {
  min: number;
  max: number;
  from: number;
  to: number;
}

export interface ArenaDomain {
  min: number;
  max: number;
  step: number;
}

export interface ArenaBandScale {
  start: number;
  step: number;
  band: number;
  count: number;
}

export interface ArenaPointScale {
  start: number;
  span: number;
  step: number;
  count: number;
}

export function arenaLinearScale(min: number, max: number, from: number, to: number): ArenaLinearScale {
  return { min, max, from, to };
}

export function arenaScaleValue(scale: ArenaLinearScale, value: number): number {
  const span = scale.max - scale.min;
  if (span === 0) return scale.from;
  return scale.from + (scale.to - scale.from) * ((value - scale.min) / span);
}

export function arenaScaleInvert(scale: ArenaLinearScale, px: number): number {
  const span = scale.to - scale.from;
  if (span === 0) return scale.min;
  return scale.min + (scale.max - scale.min) * ((px - scale.from) / span);
}

export function arenaGaugeFraction(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !(max > min)) return 0;
  return Math.min(1, Math.max(0, arenaScaleValue(arenaLinearScale(min, max, 0, 1), value)));
}

export function arenaScaleZero(scale: ArenaLinearScale): number {
  return arenaScaleValue(scale, 0);
}

export function arenaNiceStep(rough: number): number {
  if (!(rough > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

export function arenaNiceDomain(min: number, max: number, count = 4): ArenaDomain {
  if (min >= 0) {
    const step = arenaNiceStep(max / count);
    return { min: 0, max: Math.max(step, Math.ceil(max / step) * step), step };
  }
  const step = arenaNiceStep(Math.max(-min, max) / count);
  return {
    min: -Math.ceil(-min / step) * step,
    max: Math.ceil(Math.max(0, max) / step) * step,
    step,
  };
}

export function arenaDomainTicks(domain: ArenaDomain): number[] {
  const steps = Math.round((domain.max - domain.min) / domain.step);
  return Array.from({ length: steps + 1 }, (_, index) => domain.min + domain.step * index);
}

export function arenaBandScale(count: number, start: number, span: number, gap: number): ArenaBandScale {
  const step = span / Math.max(1, count);
  return { start, step, band: Math.max(1, step - gap), count };
}

export function arenaBandStart(scale: ArenaBandScale, index: number): number {
  return scale.start + index * scale.step;
}

export function arenaBandMark(scale: ArenaBandScale, index: number): number {
  return arenaBandStart(scale, index) + (scale.step - scale.band) / 2;
}

export function arenaBandCenter(scale: ArenaBandScale, index: number): number {
  return arenaBandStart(scale, index) + scale.step / 2;
}

export function arenaBandIndex(scale: ArenaBandScale, px: number): number {
  if (scale.count <= 0) return -1;
  const raw = Math.floor((px - scale.start) / scale.step);
  return Math.min(scale.count - 1, Math.max(0, raw));
}

export function arenaBandSubBand(
  scale: ArenaBandScale, index: number, seriesCount: number, seriesIndex: number, gap: number,
): { x: number; width: number } {
  const lanes = Math.max(1, seriesCount);
  const lane = scale.band / lanes;
  return {
    x: arenaBandMark(scale, index) + lane * seriesIndex,
    width: Math.max(1, lane - (lanes > 1 ? gap : 0)),
  };
}

export function arenaFunnelBands(count: number, start: number, span: number): ArenaBandScale {
  return arenaBandScale(count, start, span, span / Math.max(1, count) / 3);
}

export function arenaFunnelWidth(scale: ArenaLinearScale, value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, arenaScaleValue(scale, value) - scale.from);
}

export function arenaPointScale(count: number, start: number, span: number): ArenaPointScale {
  return { start, span, step: count <= 1 ? 0 : span / (count - 1), count };
}

export function arenaPointAt(scale: ArenaPointScale, index: number): number {
  if (scale.count <= 1) return scale.start + scale.span / 2;
  return scale.start + scale.step * index;
}

export function arenaNearestPointIndex(points: readonly ArenaLinePoint[], x: number): number {
  let best = -1;
  let nearest = Infinity;
  points.forEach((point, index) => {
    const distance = Math.abs(point.x - x);
    if (distance < nearest) {
      best = index;
      nearest = distance;
    }
  });
  return best;
}

export function arenaDoughnutSlices(values: readonly number[]): ArenaDoughnutSlice[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  let angle = -Math.PI / 2;
  return values.map((value, index) => {
    const share = total > 0 ? Math.max(0, value) / total : 0;
    const from = angle;
    const to = angle + share * Math.PI * 2;
    angle = to;
    return { index, from, to, share, percent: Math.round(share * 100) };
  });
}

export function arenaNearestPoint(points: readonly ArenaLinePoint[], x: number, y: number): number {
  let best = -1;
  let reach = Infinity;
  points.forEach((point, index) => {
    const dx = point.x - x;
    const dy = point.y - y;
    const away = dx * dx + dy * dy;
    if (away < reach) {
      reach = away;
      best = index;
    }
  });
  return best;
}

export interface ArenaRadiusScale {
  min: number;
  max: number;
  rMin: number;
  rMax: number;
}

export function arenaRadiusScale(min: number, max: number): ArenaRadiusScale {
  return { min, max, rMin: chartBubbleRMin, rMax: chartBubbleRMax };
}

export function arenaRadiusAt(scale: ArenaRadiusScale, value: number): number {
  const span = scale.max - scale.min;
  const t = span === 0 ? 1 : (value - scale.min) / span;
  const held = t < 0 ? 0 : t > 1 ? 1 : t;
  const area = scale.rMin * scale.rMin + held * (scale.rMax * scale.rMax - scale.rMin * scale.rMin);
  return Math.sqrt(area);
}
