import { chartLabelGap, chartPadBottom, chartPadLeft } from '../../Tokens.generated';
import type { ArenaDomain, ArenaLinePoint } from './ChartScales';

export function arenaPolarAngle(index: number, count: number): number {
  if (count <= 0) return -Math.PI / 2;
  return -Math.PI / 2 + (Math.PI * 2 * index) / count;
}

export function arenaPolarPoint(cx: number, cy: number, r: number, index: number, count: number): ArenaLinePoint {
  const angle = arenaPolarAngle(index, count);
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function arenaPolarIndex(cx: number, cy: number, x: number, y: number, count: number): number {
  if (count <= 0) return -1;
  const step = (Math.PI * 2) / count;
  const turn = (Math.atan2(y - cy, x - cx) + Math.PI / 2) / step;
  return ((Math.round(turn) % count) + count) % count;
}

export function arenaRadarRings(domain: ArenaDomain): number[] {
  const rings: number[] = [];
  if (domain.step <= 0) return rings;
  for (let value = domain.step; value <= domain.max + 1e-9; value += domain.step) rings.push(value);
  return rings;
}

export function arenaPolarAnchor(index: number, count: number): 'start' | 'middle' | 'end' {
  const across = Math.cos(arenaPolarAngle(index, count));
  if (Math.abs(across) < 1e-6) return 'middle';
  return across > 0 ? 'start' : 'end';
}

export function arenaRadarRadius(plotWidth: number, height: number): number {
  return Math.max(1, Math.min(plotWidth, height) / 2 - chartPadBottom);
}

export function arenaRadarLabelRadius(plotWidth: number, height: number): number {
  return arenaRadarRadius(plotWidth, height) + chartLabelGap;
}

const GAUGE_START = (Math.PI * 5) / 4;
const GAUGE_SWEEP = (Math.PI * 3) / 2;

export interface ArenaGaugeRadii {
  cy: number;
  band: { outer: number; inner: number };
  track: { outer: number; inner: number };
  label: number;
}

export function arenaGaugeAngle(fraction: number): number {
  return -Math.PI / 2 + GAUGE_START + fraction * GAUGE_SWEEP;
}

export function arenaGaugePoint(cx: number, cy: number, r: number, fraction: number): ArenaLinePoint {
  const angle = arenaGaugeAngle(fraction);
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function arenaGaugeAnchor(fraction: number): 'start' | 'middle' | 'end' {
  const across = Math.cos(arenaGaugeAngle(fraction));
  if (Math.abs(across) < 0.3) return 'middle';
  return across > 0 ? 'start' : 'end';
}

export function arenaGaugeRadii(width: number, height: number): ArenaGaugeRadii {
  const tall = 1 + Math.SQRT1_2;
  const r = Math.max(1, Math.min(width / 2 - chartPadLeft, (height - chartPadBottom * 2) / tall));
  return {
    cy: height / 2 + (r * (2 - tall)) / 2,
    band: { outer: r, inner: r * 0.94 },
    track: { outer: r * 0.88, inner: r * 0.7 },
    label: r + chartLabelGap,
  };
}
