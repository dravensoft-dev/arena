import { ARENA_PAD } from '../../DataVisuals.ts';
import {
  chartLabelGap, chartRingInset, chartPadCategory, chartPointR, chartTickChar, chartHeatmapRowH, chartLegendStrip,
} from '../../Tokens.generated.js';
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

export function arenaSparkBox(width: number, height: number): ArenaPlotBox {
  return {
    x: chartPointR,
    y: chartPointR,
    w: Math.max(1, width - chartPointR * 2),
    h: Math.max(1, height - chartPointR * 2),
  };
}

export function arenaTooltipShift(x: number, box: ArenaPlotBox): number {
  return Math.min(1, Math.max(0, (x - box.x) / box.w));
}

export function arenaSparkTooltipTop(y: number, plot: number): string {
  return `calc(50% + ${y - plot / 2}px - var(--chart-tooltip-offset))`;
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

export function arenaTextGutter(texts: readonly string[]): number {
  let widest = 0;
  for (const text of texts) if (text.length > widest) widest = text.length;
  return Math.max(ARENA_PAD.l, Math.ceil(widest * chartTickChar) + chartLabelGap);
}

export function arenaFunnelBox(width: number, height: number, gutter: number): ArenaPlotBox {
  return {
    x: chartPadCategory,
    y: ARENA_PAD.t,
    w: Math.max(1, width - chartPadCategory - gutter - ARENA_PAD.r),
    h: Math.max(1, height - ARENA_PAD.t * 2),
  };
}

export function arenaHeatmapHeight(rows: number): number {
  return Math.max(1, rows) * chartHeatmapRowH + ARENA_PAD.t + ARENA_PAD.b + chartLegendStrip;
}

export function arenaHeatmapBox(width: number, plotH: number): ArenaPlotBox {
  return {
    x: chartPadCategory,
    y: ARENA_PAD.t,
    w: Math.max(1, width - chartPadCategory - ARENA_PAD.r),
    h: Math.max(1, plotH - ARENA_PAD.t - ARENA_PAD.b),
  };
}

export function arenaHeatmapWidth(available: number, cols: number, minCellWidth: number | undefined): number {
  if (!minCellWidth || !(minCellWidth > 0)) return available;
  return Math.max(available, chartPadCategory + ARENA_PAD.r + minCellWidth * cols);
}

export function arenaLabelStride(step: number, texts: readonly string[]): number {
  let widest = 0;
  for (const text of texts) if (text.length > widest) widest = text.length;
  return Math.max(1, Math.ceil((Math.ceil(widest * chartTickChar) + chartLabelGap) / step));
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

/** The rectangle that clips the category names of a horizontal chart: the gutter, from the card's start edge to the plot's, over the whole plot height. */
export function arenaCategoryGutter(plotH: number): ArenaPlotBox {
  return { x: 0, y: 0, w: chartPadCategory, h: plotH };
}

export function arenaTickLabelY(height: number): number {
  return height - chartLabelGap;
}
