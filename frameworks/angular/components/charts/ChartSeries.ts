import { arenaCatColor, arenaToneColor } from '../../DataVisuals';
import { arenaWarnOnce } from '../../WarnOnce';
import { arenaNiceDomain } from './ChartScales';
import type { ArenaDomain } from './ChartScales';
import type { ArenaPointSeries, ArenaSeries } from '../../Api.generated';

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

export function arenaSeriesColors(series: ArenaSeries, count: number, fallbackSlot: number): string[] {
  const { slot, slots, tone } = series;
  if (tone && (slot !== undefined || slots !== undefined)) {
    arenaWarnOnce('chart: `tone` and `slot`/`slots` are mutually exclusive — a series carries identity or meaning, never both. `tone` wins; remove the other.');
  }
  if (tone) {
    const colour = arenaToneColor(tone) || arenaCatColor(1);
    return Array.from({ length: count }, () => colour);
  }
  if (slots) return Array.from({ length: count }, (_, index) => arenaCatColor(slots[index] ?? index + 1));
  return Array.from({ length: count }, () => arenaCatColor(slot ?? fallbackSlot));
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

export function arenaOneSeries(series: readonly ArenaSeries[], chart: string): ArenaSeries {
  if (series.length > 1) {
    arenaWarnOnce(`${chart}: reads one series and was given ${series.length}. A ring of two series is a sunburst, which is a different chart; the rest are ignored.`);
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

export function arenaPointSeriesColor(series: ArenaPointSeries, fallbackSlot: number): string {
  const { slot, tone } = series;
  if (tone && slot !== undefined) {
    arenaWarnOnce('chart: `tone` and `slot` are mutually exclusive — a series carries identity or meaning, never both. `tone` wins; remove the other.');
  }
  if (tone) return arenaToneColor(tone) || arenaCatColor(1);
  return arenaCatColor(slot ?? fallbackSlot);
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
