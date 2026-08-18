import { ARENA_PAD } from '../../DataVisuals.ts';
import { chartLabelGap, chartRingInset, chartPadCategory, chartTickChar } from '../../Tokens.generated.js';
import type { ArenaChartShape } from '../../Api.generated';
import type { ArenaDomain, ArenaLinearScale } from './ChartScales.ts';
import { arenaScaleValue, arenaScaleZero, arenaDomainTicks } from './ChartScales.ts';

export interface ArenaPlotBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ArenaAxisTick {
  value: number;
  y: number;
  label: string;
}

export interface ArenaAxisModel {
  ticks: ArenaAxisTick[];
  zeroY: number;
}

export interface ArenaAxisTickX {
  value: number;
  x: number;
  label: string;
}

export interface ArenaAxisModelX {
  ticks: ArenaAxisTickX[];
  zeroX: number;
}

export function arenaValueGutter(domain: ArenaDomain, write: (value: number) => string): number {
  let widest = 0;
  for (const value of arenaDomainTicks(domain)) {
    const length = write(value).length;
    if (length > widest) widest = length;
  }
  return Math.max(ARENA_PAD.l, Math.ceil(widest * chartTickChar) + chartLabelGap);
}

export function arenaPlotBox(width: number, height: number, gutter: number = ARENA_PAD.l): ArenaPlotBox {
  return {
    x: gutter,
    y: ARENA_PAD.t,
    w: Math.max(1, width - gutter - ARENA_PAD.r),
    h: Math.max(1, height - ARENA_PAD.t - ARENA_PAD.b),
  };
}

export function arenaAxisTicks(
  scale: ArenaLinearScale, values: readonly number[], write: (value: number) => string,
): ArenaAxisTick[] {
  return values.map((value) => ({ value, y: arenaScaleValue(scale, value), label: write(value) }));
}

export function arenaAxisModel(
  scale: ArenaLinearScale, domain: ArenaDomain, write: (value: number) => string,
): ArenaAxisModel {
  return {
    ticks: arenaAxisTicks(scale, arenaDomainTicks(domain), write),
    zeroY: arenaScaleZero(scale),
  };
}

export function arenaTickLabelX(gutter: number = ARENA_PAD.l): number {
  return gutter - chartLabelGap;
}

export function arenaCategoryLabelY(height: number): number {
  return height - chartLabelGap;
}
export function arenaCategoryAnchor(index: number, count: number): 'start' | 'middle' | 'end' {
  if (count < 2) return 'middle';
  if (index === 0) return 'start';
  if (index === count - 1) return 'end';
  return 'middle';
}

export function arenaDoughnutRadii(
  plotWidth: number, height: number, shape: ArenaChartShape,
): { outer: number; inner: number } {
  const outer = Math.max(1, Math.min(plotWidth, height) / 2 - chartRingInset);
  return { outer, inner: shape === 'pie' ? 0 : outer * 0.62 };
}

export function arenaPlotBoxH(width: number, height: number): ArenaPlotBox {
  return {
    x: chartPadCategory,
    y: ARENA_PAD.t,
    w: Math.max(1, width - chartPadCategory - ARENA_PAD.r),
    h: Math.max(1, height - ARENA_PAD.t - ARENA_PAD.b),
  };
}

export function arenaAxisTicksX(
  scale: ArenaLinearScale, values: readonly number[], write: (value: number) => string,
): ArenaAxisTickX[] {
  return values.map((value) => ({ value, x: arenaScaleValue(scale, value), label: write(value) }));
}

export function arenaAxisModelX(
  scale: ArenaLinearScale, domain: ArenaDomain, write: (value: number) => string,
): ArenaAxisModelX {
  return {
    ticks: arenaAxisTicksX(scale, arenaDomainTicks(domain), write),
    zeroX: arenaScaleZero(scale),
  };
}

export function arenaCategoryLabelX(): number {
  return chartPadCategory - chartLabelGap;
}

export function arenaTickLabelY(height: number): number {
  return height - chartLabelGap;
}
