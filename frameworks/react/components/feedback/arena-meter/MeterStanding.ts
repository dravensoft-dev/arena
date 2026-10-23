import type { ArenaLocale } from '../../../Api.generated.ts';
import { arenaRegionIndex } from '../../../Thresholds.ts';

export type ArenaMeterStanding = 'optimum' | 'fair' | 'poor' | 'none';

export type ArenaMeterRange = {
  readonly min: number;
  readonly max: number;
  readonly low: number;
  readonly high: number;
  readonly optimum: number;
  readonly thresholds: boolean;
};

export function arenaMeterRange(min: number, max: number, low?: number, high?: number, optimum?: number): ArenaMeterRange {
  const floor = Number.isFinite(min) ? min : 0;
  const top = Number.isFinite(max) ? max : 100;
  const ceiling = top > floor ? top : floor;
  const clamp = (n: number) => Math.min(ceiling, Math.max(floor, n));
  const given = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n);
  const lowEdge = given(low) ? clamp(low) : floor;
  const highEdge = given(high) ? Math.max(lowEdge, clamp(high)) : ceiling;
  return {
    min: floor,
    max: ceiling,
    low: lowEdge,
    high: highEdge,
    optimum: given(optimum) ? clamp(optimum) : (floor + ceiling) / 2,
    thresholds: given(low) || given(high) || given(optimum),
  };
}

export function arenaMeterValue(value: number, range: ArenaMeterRange): number {
  if (!Number.isFinite(value)) return range.min;
  return Math.min(range.max, Math.max(range.min, value));
}

export function arenaMeterShare(value: number, range: ArenaMeterRange): number {
  const span = range.max - range.min;
  if (span <= 0) return 0;
  return ((arenaMeterValue(value, range) - range.min) / span) * 100;
}

export function arenaMeterStanding(value: number, range: ArenaMeterRange): ArenaMeterStanding {
  if (!range.thresholds) return 'none';
  const edges = range.high < range.max ? [range.low, range.high] : [range.low];
  const held = arenaRegionIndex(arenaMeterValue(value, range), edges);
  const best = arenaRegionIndex(range.optimum, edges);
  const apart = Math.abs(held - best);
  if (apart === 0) return 'optimum';
  return apart === 1 ? 'fair' : 'poor';
}

export function arenaMeterWord(standing: ArenaMeterStanding, locale: Pick<ArenaLocale, 'meterOptimum' | 'meterFair' | 'meterPoor'>): string | undefined {
  if (standing === 'optimum') return locale.meterOptimum;
  if (standing === 'fair') return locale.meterFair;
  return standing === 'poor' ? locale.meterPoor : undefined;
}

export function arenaMeterReadout(value: number, range: ArenaMeterRange, valueText?: string): string {
  if (valueText?.trim()) return valueText;
  return String(Number.isFinite(value) ? value : range.min);
}

export function arenaMeterValueText(readout: string, word: string | undefined): string {
  return word === undefined ? readout : `${readout}, ${word}`;
}
