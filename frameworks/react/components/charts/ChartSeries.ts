import { ARENA_HEAT_STEPS, arenaCatColor, arenaCatIndex, arenaToneColor } from '../../DataVisuals.ts';
import { arenaWarnOnce } from '../../WarnOnce.ts';
import { arenaPhrase } from '../../Phrase.ts';
import { arenaRegionIndex } from '../../Thresholds.ts';
import { arenaHeatEdge, arenaNiceDomain, arenaNiceStep } from './ChartScales.ts';
import type { ArenaDomain } from './ChartScales.ts';
import type { ArenaGaugeBand, ArenaPointSeries, ArenaSeries, ArenaSeriesTone } from '../../Api.generated';

export interface ArenaChartTableRow {
  header: string;
  cells: string[];
}

export interface ArenaChartTable {
  columns: string[];
  rows: ArenaChartTableRow[];
}

export interface ArenaStackSegment {
  seriesIndex: number;
  from: number;
  to: number;
  outer: boolean;
}

export function arenaSeriesColors(series: ArenaSeries, count: number, fallbackSlot: number, chart: string): string[] {
  const { colorId, colorIds, tone } = series;
  if (tone && (colorId !== undefined || colorIds !== undefined)) {
    arenaWarnOnce(`${chart}: \`tone\` and \`colorId\`/\`colorIds\` are mutually exclusive — a series carries identity or meaning, never both. \`tone\` wins; remove the other.`);
  }
  if (tone) {
    const colour = arenaToneColor(tone) || arenaCatColor(1);
    return Array.from({ length: count }, () => colour);
  }
  if (colorIds) return Array.from({ length: count }, (_, index) => arenaCatColor(colorIds[index] ?? index + 1));
  return Array.from({ length: count }, () => arenaCatColor(colorId ?? fallbackSlot));
}

export type ArenaSwatchHue = { tone: ArenaSeriesTone } | { colorId: string };

export function arenaSwatchHue(
  series: { tone?: ArenaSeriesTone; colorId?: number; colorIds?: readonly number[] }, index: number, fallbackSlot: number,
): ArenaSwatchHue {
  const { tone, colorId, colorIds } = series;
  if (tone) return arenaToneColor(tone) ? { tone } : { colorId: '1' };
  if (colorIds) return { colorId: String(arenaCatIndex(colorIds[index] ?? index + 1)) };
  return { colorId: String(arenaCatIndex(colorId ?? fallbackSlot)) };
}

export function arenaSeriesPointCount(series: readonly ArenaSeries[]): number {
  let count = 0;
  for (const one of series) if (one.values.length > count) count = one.values.length;
  return count;
}

export function arenaSeriesDomain(series: readonly ArenaSeries[], count = 4): ArenaDomain {
  let min = 0;
  let max = 0;
  for (const one of series) {
    for (const value of one.values) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  return arenaNiceDomain(min, max, count);
}

export function arenaSparkDomain(values: readonly number[]): ArenaDomain {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (min > max) return { min: -1, max: 1, step: 1 };
  if (min === max) return { min: min - 1, max: max + 1, step: 1 };
  return { min, max, step: max - min };
}

export function arenaOneSeries(
  series: readonly ArenaSeries[], chart: string, why = 'A ring of two series is a sunburst, which is a different chart',
): ArenaSeries {
  if (series.length > 1) {
    arenaWarnOnce(`${chart}: reads one series and was given ${series.length}. ${why}; the rest are ignored.`);
  }
  return series[0] ?? { label: '', values: [] };
}

export function arenaChartTable(
  heading: string,
  series: readonly ArenaSeries[],
  labels: readonly string[],
  write: (value: number) => string,
): ArenaChartTable {
  const points = arenaSeriesPointCount(series);
  return {
    columns: [heading, ...series.map((one) => one.label)],
    rows: Array.from({ length: points }, (_, index) => ({
      header: labels[index] ?? '',
      cells: series.map((one) => (index < one.values.length ? write(one.values[index] as number) : '')),
    })),
  };
}

export function arenaHeatDomain(series: readonly ArenaSeries[]): ArenaDomain {
  let min = 0;
  let max = 0;
  for (const one of series) {
    for (const value of one.values) {
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  let step = arenaNiceStep((max - min) / ARENA_HEAT_STEPS);
  let lo = arenaHeatEdge({ min: 0, step }, Math.floor(Number((min / step).toPrecision(12))));
  while (arenaHeatEdge({ min: lo, step }, ARENA_HEAT_STEPS) < max) {
    step = arenaNiceStep(step * (1 + 1e-9));
    lo = arenaHeatEdge({ min: 0, step }, Math.floor(Number((min / step).toPrecision(12))));
  }
  return { min: lo, max: arenaHeatEdge({ min: lo, step }, ARENA_HEAT_STEPS), step };
}

export function arenaHeatmapTable(
  heading: string, series: readonly ArenaSeries[], labels: readonly string[], write: (value: number) => string,
): ArenaChartTable {
  const cols = Math.max(labels.length, arenaSeriesPointCount(series));
  return {
    columns: [heading, ...Array.from({ length: cols }, (_, index) => labels[index] ?? '')],
    rows: series.map((one) => ({
      header: one.label,
      cells: Array.from({ length: cols }, (_, index) => {
        const value = one.values[index];
        return value !== undefined && Number.isFinite(value) ? write(value) : '';
      }),
    })),
  };
}

export interface ArenaGaugeWords {
  measure: string;
  value: string;
  minimum: string;
  maximum: string;
  range: string;
}

export function arenaGaugeBands(bands: readonly ArenaGaugeBand[], chart: string): ArenaGaugeBand[] {
  const sorted = [...bands].sort((a, b) => a.from - b.from);
  if (sorted.some((band, index) => band !== bands[index])) {
    arenaWarnOnce(`${chart}: reads its bands in ascending order of \`from\` and was given them out of order. `
      + 'They are sorted before drawing; pass them sorted, because the order is configuration and not data.');
  }
  return sorted;
}

export function arenaGaugeBand(bands: readonly ArenaGaugeBand[], value: number): number {
  if (!Number.isFinite(value)) return -1;
  return arenaRegionIndex(value, bands.map((band) => band.from)) - 1;
}

export function arenaGaugeTicks(bands: readonly ArenaGaugeBand[], min: number, max: number, chart: string): number[] {
  if (!(max > min)) {
    arenaWarnOnce(`${chart}: \`max\` (${max}) is not greater than \`min\` (${min}), so the scale has no length. `
      + 'The empty track is drawn and no value or band is placed on it.');
    return [];
  }
  const ticks = [min];
  for (const band of bands) if (band.from > min && band.from < max && !ticks.includes(band.from)) ticks.push(band.from);
  ticks.push(max);
  return ticks;
}

export function arenaGaugeColor(
  bands: readonly ArenaGaugeBand[], index: number, colorId: number | undefined, chart: string,
): string {
  if (bands.length === 0) return arenaCatColor(colorId ?? 1);
  if (colorId !== undefined) {
    arenaWarnOnce(`${chart}: \`colorId\` is ignored while \`bands\` is given. A chart carries identity or meaning,`
      + ' never both, and the bands are the meaning.');
  }
  const band = bands[index];
  return band ? arenaToneColor(band.tone) : arenaCatColor(1);
}

export function arenaGaugeTable(
  words: ArenaGaugeWords, value: number, min: number, max: number, bands: readonly ArenaGaugeBand[],
  write: (value: number) => string,
): ArenaChartTable {
  return {
    columns: [words.measure, words.value],
    rows: [
      { header: words.value, cells: [Number.isFinite(value) ? write(value) : ''] },
      { header: words.minimum, cells: [write(min)] },
      { header: words.maximum, cells: [write(max)] },
      ...bands.map((band, index) => ({
        header: band.label,
        cells: [arenaPhrase(words.range, { from: write(band.from), to: write(bands[index + 1]?.from ?? max) })],
      })),
    ],
  };
}

export interface ArenaFunnelConversion {
  step: number | null;
  total: number | null;
}

export interface ArenaFunnelWords {
  stage: string;
  step: string;
  total: string;
}

function arenaFunnelRatio(numerator: number, denominator: number | undefined): number | null {
  if (!Number.isFinite(numerator) || denominator === undefined || !Number.isFinite(denominator) || !(denominator > 0)) {
    return null;
  }
  return numerator / denominator;
}

export function arenaFunnelConversions(values: readonly number[]): ArenaFunnelConversion[] {
  return values.map((value, index) => ({
    step: index === 0 ? null : arenaFunnelRatio(value, values[index - 1]),
    total: arenaFunnelRatio(value, values[0]),
  }));
}

export function arenaFunnelMax(values: readonly number[]): number {
  return values.reduce((widest, value) => (Number.isFinite(value) && value > widest ? value : widest), 0);
}

export function arenaFunnelTable(
  words: ArenaFunnelWords, series: ArenaSeries, labels: readonly string[],
  write: (value: number) => string, percent: (ratio: number) => string, conversion: boolean,
): ArenaChartTable {
  const conversions = arenaFunnelConversions(series.values);
  const ratio = (value: number | null | undefined): string => (value === null || value === undefined ? '' : percent(value));
  return {
    columns: conversion ? [words.stage, series.label, words.step, words.total] : [words.stage, series.label],
    rows: Array.from({ length: Math.max(labels.length, series.values.length) }, (_, index) => {
      const value = series.values[index];
      const cell = value !== undefined && Number.isFinite(value) ? write(value) : '';
      return {
        header: labels[index] ?? '',
        cells: conversion ? [cell, ratio(conversions[index]?.step), ratio(conversions[index]?.total)] : [cell],
      };
    }),
  };
}

export function arenaStackSegments(series: readonly ArenaSeries[], index: number): ArenaStackSegment[] {
  const segments: ArenaStackSegment[] = [];
  let up = 0;
  let down = 0;
  let lastUp = -1;
  let lastDown = -1;
  series.forEach((one, seriesIndex) => {
    const value = one.values[index];
    if (value === undefined) return;
    const from = value < 0 ? down : up;
    const to = from + value;
    if (value > 0) {
      up = to;
      lastUp = segments.length;
    } else if (value < 0) {
      down = to;
      lastDown = segments.length;
    }
    segments.push({ seriesIndex, from, to, outer: false });
  });
  const top = segments[lastUp];
  if (top) top.outer = true;
  const bottom = segments[lastDown];
  if (bottom) bottom.outer = true;
  return segments;
}

export function arenaStackDomain(series: readonly ArenaSeries[], count = 4): ArenaDomain {
  let min = 0;
  let max = 0;
  for (let index = 0; index < arenaSeriesPointCount(series); index += 1) {
    let up = 0;
    let down = 0;
    for (const one of series) {
      const value = one.values[index];
      if (value === undefined) continue;
      if (value < 0) down += value;
      else up += value;
    }
    if (down < min) min = down;
    if (up > max) max = up;
  }
  return arenaNiceDomain(min, max, count);
}

export function arenaTwoSeries(series: readonly ArenaSeries[], chart: string): ArenaSeries[] {
  if (series.length !== 2) {
    arenaWarnOnce(`${chart}: reads two series, one for each side of the centre line, and was given ${series.length}. A pyramid with one side is a bar chart and a pyramid with three has nowhere to put the third; the rest are ignored.`);
  }
  return [series[0] ?? { label: '', values: [] }, series[1] ?? { label: '', values: [] }];
}

export function arenaMirrorDomain(series: readonly ArenaSeries[], count = 4): ArenaDomain {
  let reach = 0;
  for (const one of series) {
    for (const value of one.values) {
      const size = Math.abs(value);
      if (size > reach) reach = size;
    }
  }
  return arenaNiceDomain(-reach, reach, count);
}

export function arenaRadarDomain(series: readonly ArenaSeries[], count = 4): ArenaDomain {
  let max = 0;
  for (const one of series) {
    for (const value of one.values) {
      if (value > max) max = value;
    }
  }
  return arenaNiceDomain(0, max, count);
}

export interface ArenaPointDomains {
  x: ArenaDomain;
  y: ArenaDomain;
}

export function arenaPointCount(series: readonly ArenaPointSeries[]): number {
  let count = 0;
  for (const one of series) count += Math.min(one.x.length, one.y.length);
  return count;
}

export function arenaPointSeriesDomain(series: readonly ArenaPointSeries[], count = 4): ArenaPointDomains {
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  for (const one of series) {
    const pairs = Math.min(one.x.length, one.y.length);
    for (let index = 0; index < pairs; index += 1) {
      const x = one.x[index] as number;
      const y = one.y[index] as number;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { x: arenaNiceDomain(minX, maxX, count), y: arenaNiceDomain(minY, maxY, count) };
}

export function arenaPointSeriesColor(series: ArenaPointSeries, fallbackSlot: number, chart: string): string {
  const { colorId, tone } = series;
  if (tone && colorId !== undefined) {
    arenaWarnOnce(`${chart}: \`tone\` and \`colorId\` are mutually exclusive — a series carries identity or meaning, never both. \`tone\` wins; remove the other.`);
  }
  if (tone) return arenaToneColor(tone) || arenaCatColor(1);
  return arenaCatColor(colorId ?? fallbackSlot);
}

export function arenaPointSized(series: readonly ArenaPointSeries[]): boolean {
  for (const one of series) if (one.r !== undefined && one.r.length > 0) return true;
  return false;
}

export function arenaPointSizeRange(series: readonly ArenaPointSeries[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const one of series) {
    if (one.r === undefined) continue;
    const pairs = Math.min(one.x.length, one.y.length, one.r.length);
    for (let index = 0; index < pairs; index += 1) {
      const size = one.r[index] as number;
      if (size < min) min = size;
      if (size > max) max = size;
    }
  }
  if (!(min <= max)) return { min: 0, max: 0 };
  return { min, max };
}

export function arenaPointTable(
  seriesHeading: string,
  series: readonly ArenaPointSeries[],
  xHeading: string,
  yHeading: string,
  sizeHeading: string,
  write: (value: number) => string,
): ArenaChartTable {
  const sized = arenaPointSized(series);
  const rows: ArenaChartTableRow[] = [];
  for (const one of series) {
    const pairs = Math.min(one.x.length, one.y.length);
    for (let index = 0; index < pairs; index += 1) {
      const cells = [write(one.x[index] as number), write(one.y[index] as number)];
      if (sized) {
        const size = one.r === undefined ? undefined : one.r[index];
        cells.push(size === undefined ? '' : write(size));
      }
      rows.push({ header: one.label, cells });
    }
  }
  const columns = [seriesHeading, xHeading, yHeading];
  if (sized) columns.push(sizeHeading);
  return { columns, rows };
}
