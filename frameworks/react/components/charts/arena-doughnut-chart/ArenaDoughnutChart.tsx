import React, { useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import { arenaSrOnly, arenaValueWriter, ARENA_CHART_HEIGHT } from '../../../DataVisuals.ts';
import { arenaDoughnutSlices } from '../ChartScales.ts';
import { arenaArcPath } from '../ChartMarks.ts';
import { arenaDoughnutRadii } from '../ChartAxis.ts';
import { arenaLegendPlotWidth, arenaLegendStacked } from '../ChartLegend.ts';
import { arenaChartTable, arenaOneSeries, arenaSeriesColors } from '../ChartSeries.ts';

import type { ArenaChartLegendLayout, ArenaChartShape, ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';

export interface ArenaDoughnutChartProps {

  /** One label per slice, in the same order as the series' `values`. A label with no value at its index is dropped. */
  labels: readonly string[];

  /** The parts, as one series whose values are read as shares of their own total. Exactly one series: a ring of two series is a sunburst, which is a different chart and not this one, so a second warns in development and is ignored. Per-slice identity goes in that series' `slots`. */
  series: readonly ArenaSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  label: string;

  /** Whether the ring keeps its hole or fills to the centre. 'pie' is the same chart with the same slices, the same legend and the same table, drawn solid. It costs the centre percentage, which has nowhere to go once the hole is gone: over a wedge it would put --bone on a --color-cat slot, a pair nothing checks for contrast because nothing had drawn it. The figure is not lost, it is in the legend row and in the accessible table, which is where every other number the chart writes already is. */
  shape?: ArenaChartShape;

  /** How each legend row arranges its label and its figure. 'inline' puts them on one line, which is what fits a wide tile; 'stacked' puts the label above the figure; 'auto' measures the legend column and stacks when the row does not give. It exists because the two do not degrade equally: on one line the figure does not yield, so the label is what gets truncated, and a legend of numbers with nothing saying what they count is the opposite of a legend. The threshold is already declared, as the chart-legend-min and chart-legend-max tokens the ring width is clamped between; what was missing was the behaviour. */
  legendLayout?: ArenaChartLegendLayout;

  /** A slice was activated, by pointer on the arc or on its legend row, or by keyboard on that row, which is a real button and answers Enter and Space without the component binding either. It carries the slice's index in the series' `values`. **In `values`, never in the drawn paths**, and that is the whole member: a slice worth zero paints nothing, so the shapes on screen and the entries in the array are two different lists, and a consumer indexing the SVG has to reproduce that omission from outside to translate one into the other. It is reverse engineering of a component's own DOM, which the next release breaks in silence. */
  onSliceActivate?: (index: number) => void;

  /** Appended verbatim to every number the chart draws: the legend value and the accessible table. Not the centre label, which is a percentage rather than a value. */
  valueSuffix?: string;

  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. */
  valuePrefix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. */
  valueFormat?: ArenaNumberFormat;
}


export function ArenaDoughnutChart({
  labels, series, label, valueSuffix, valuePrefix, valueFormat,
  shape = 'doughnut', legendLayout = 'auto', onSliceActivate,
}: ArenaDoughnutChartProps) {
  if (!label) throw new Error('ArenaDoughnutChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (!labels) throw new Error('ArenaDoughnutChart: `labels` is required');
  if (!series) throw new Error('ArenaDoughnutChart: `series` is required');
  const [ref, measured] = useArenaContainerWidth();
  const [hover, setHover] = useState<number | null>(null);

  const width = measured ?? 600;
  const height = ARENA_CHART_HEIGHT;
  const only = arenaOneSeries(series, 'ArenaDoughnutChart');
  const values = only.values;
  const n = values.length;
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });
  const colors = arenaSeriesColors(
    { ...only, slots: only.slots ?? Array.from({ length: n }, (_, i) => i + 1) }, n, 1,
  );

  const stacked = arenaLegendStacked(legendLayout, width);
  const plotW = arenaLegendPlotWidth(width);
  const cx = plotW / 2;
  const cy = height / 2;
  const { outer: rOuter, inner: rInner } = arenaDoughnutRadii(plotW, height, shape);

  const name = shape === 'pie' ? `${label} — pie chart` : `${label} — doughnut chart`;
  const table = arenaChartTable('Category', series.slice(0, 1), labels, fmt);

  const segments = arenaDoughnutSlices(values);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height, display: 'flex', gap: 'var(--chart-legend-gap)' }}>
      <svg width={plotW} height={height} role="img" aria-label={name}
        onPointerLeave={() => setHover(null)} style={{ display: 'block', flexShrink: 0 }}>
        {segments.map(({ index, from, to }) => to > from && (
          <path key={index} d={arenaArcPath(cx, cy, rOuter, rInner, from, to)} fill={colors[index]}

            stroke="var(--surface-card)"
            opacity={hover === null || hover === index ? 1 : 0.55}
            onPointerEnter={() => setHover(index)} onClick={() => onSliceActivate?.(index)}
            style={{ transition: 'opacity var(--dur-hover) var(--ease-hover)', strokeWidth: 'var(--bw-strong)' }} />
        ))}
        {shape !== 'pie' && hover !== null && segments[hover] && (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fill="var(--bone)" fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-lg)' }}>
            {segments[hover].percent}%
          </text>
        )}
      </svg>

      {

}
      <div role="group" aria-label={shape === 'pie' ? 'Pie chart legend' : 'Doughnut chart legend'}
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'calc(var(--sp-1) * 1.5)', overflow: 'auto' }}>
        {values.map((_, i) => (
          <button key={i} type="button" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            onClick={() => onSliceActivate?.(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--sp-1) * 2)', cursor: 'pointer', opacity: hover === null || hover === i ? 1 : 0.55,
              background: 'none', border: 0, padding: 0, margin: 0, font: 'inherit', color: 'inherit', textAlign: 'left', width: '100%' }}>
            <span aria-hidden="true" style={{ width: 'calc(var(--sp-1) * 2.5)', height: 'calc(var(--sp-1) * 2.5)', borderRadius: 'var(--r-xs)', background: colors[i], flexShrink: 0 }} />
            <span style={stacked
              ? { display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', alignItems: 'stretch' }
              : { display: 'flex', flex: 1, minWidth: 0, alignItems: 'baseline', gap: 'calc(var(--sp-1) * 2)', justifyContent: 'space-between' }}>
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontSize: 'var(--dz-text-sm)', color: 'var(--text-body)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labels[i] ?? ''}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-sm)', color: 'var(--mute)' }}>{fmt(values[i] ?? 0)}</span>
            </span>
          </button>
        ))}
      </div>

      <table style={arenaSrOnly}>
        <caption>{name}</caption>
        <thead><tr>{table.columns.map((column, i) => <th key={i}>{column}</th>)}</tr></thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}><th scope="row">{row.header}</th>{row.cells.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
