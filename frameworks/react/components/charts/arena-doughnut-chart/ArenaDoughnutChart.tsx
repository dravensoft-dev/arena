import React, { useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import { arenaSrOnly, arenaValueWriter, ARENA_CHART_HEIGHT } from '../../../DataVisuals.ts';
import { arenaDoughnutSlices } from '../ChartScales.ts';
import { arenaArcPath } from '../ChartMarks.ts';
import { arenaDoughnutRadii } from '../ChartAxis.ts';
import { arenaLegendPlotWidth, arenaLegendStacked } from '../ChartLegend.ts';
import { arenaChartTable, arenaOneSeries, arenaSeriesColors, arenaSwatchHue } from '../ChartSeries.ts';

import type { ArenaChartLegendLayout, ArenaChartShape, ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import type { ArenaDoughnutChartClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaDoughnutChart.classes.generated.ts';

export interface ArenaDoughnutChartProps {
  className?: ArenaDoughnutChartClass;


  /** One label per slice, in the same order as the series' `values`. A label with no value at its index is dropped. */
  labels: readonly string[];

  /** The parts, as one series whose values are read as shares of their own total. Exactly one series: a ring of two series is a sunburst, which is a different chart and not this one, so a second warns in development and is ignored. Per-slice identity goes in that series' `colorIds`. */
  series: readonly ArenaSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  label: string;

  /** Whether the ring keeps its hole or fills to the centre. 'pie' is the same chart with the same slices, the same legend and the same table, drawn solid. It costs the centre percentage, which has nowhere to go once the hole is gone: over a wedge it would put the heading ink on a --color-cat slot, a pair nothing checks for contrast because nothing else draws it. The figure is not lost, it is in the legend row and in the accessible table, which is where every other number the chart writes already is. */
  shape?: ArenaChartShape;

  /** How each legend row arranges its label and its figure. 'inline' puts them on one line, which is what fits a wide tile; 'stacked' puts the label above the figure; 'auto' measures the legend column and stacks when the row does not give. It exists because the two do not degrade equally: on one line the figure does not yield, so the label is what gets truncated, and a legend of numbers with nothing saying what they count is the opposite of a legend. The threshold is already declared, as the chart-legend-min and chart-legend-max tokens the ring width is clamped between; what was missing was the behaviour. */
  legendLayout?: ArenaChartLegendLayout;

  /** A slice was activated, by pointer on the arc or on its legend row, or by keyboard on that row, which is a real button and answers Enter and Space without the component binding either. It carries the slice's index in the series' `values`. **In `values`, never in the drawn paths**, and that is the whole member: a slice worth zero paints nothing, so the shapes on screen and the entries in the array are two different lists, and a consumer indexing the SVG has to reproduce that omission from outside to translate one into the other. It is reverse engineering of a component's own DOM, which the next release breaks in silence. */
  onSliceActivate?: (index: number) => void;

  /** Appended verbatim to every number the chart draws: the legend value and the accessible table. Not the centre label, which is a percentage rather than a value. */
  valueSuffix?: string;

  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide, and a suffix alone cannot say it: "1234.5 Bs." would disagree with the table beside it reading "Bs. 1.234,50", and the accessible table would inherit the disagreement. */
  valuePrefix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. */
  valueFormat?: ArenaNumberFormat;
}


const arenaDoughnutChartStyles = arenaStyles(manifest);

export function ArenaDoughnutChart({ className, 
  labels, series, label, valueSuffix, valuePrefix, valueFormat,
  shape = 'doughnut', legendLayout = 'auto', onSliceActivate,
}: ArenaDoughnutChartProps) {
  const locale = useArenaLocale();
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
  const tonedSeries = { ...only, colorIds: only.colorIds ?? Array.from({ length: n }, (_, i) => i + 1) };
  const colors = arenaSeriesColors(tonedSeries, n, 1);

  const stacked = arenaLegendStacked(legendLayout, width);
  const styles = arenaDoughnutChartStyles({ stacked });
  const plotW = arenaLegendPlotWidth(width);
  const cx = plotW / 2;
  const cy = height / 2;
  const { outer: rOuter, inner: rInner } = arenaDoughnutRadii(plotW, height, shape);

  const name = arenaPhrase(shape === 'pie' ? locale.doughnutChartPieName : locale.doughnutChartName, { label });
  const table = arenaChartTable(locale.chartTableCategory, series.slice(0, 1), labels, fmt);

  const segments = arenaDoughnutSlices(values);

  return (
    <div className={arenaClassName('ArenaDoughnutChart', styles.frame(), className)} ref={ref} data-arena-part={manifest.parts.frame} {...styles.$data.frame()}>
      <svg width={plotW} height={height} role="img" aria-label={name}
        onPointerLeave={() => setHover(null)} style={{ display: 'block', flexShrink: 0 }}>
        {segments.map(({ index, from, to }) => to > from && (
          <path key={index} d={arenaArcPath(cx, cy, rOuter, rInner, from, to)} fill={colors[index]}

            stroke="var(--fill-surface)"
            opacity={hover === null || hover === index ? 1 : 0.55}
            onPointerEnter={() => setHover(index)} onClick={() => onSliceActivate?.(index)}
            style={{ transition: 'opacity var(--dur-hover) var(--ease-hover)', strokeWidth: 'var(--bw-strong)' }} />
        ))}
        {shape !== 'pie' && hover !== null && segments[hover] && (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fill="var(--ink-heading)" fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-lg)' }}>
            {`${segments[hover].percent}%`}
          </text>
        )}
      </svg>

      {

}
      <div role="group" aria-label={shape === 'pie' ? locale.doughnutChartPieLegend : locale.doughnutChartLegend}
        className={styles.legend()} data-arena-part={manifest.parts.legend} {...styles.$data.legend()}>
        {values.map((_, i) => (
          <button key={i} type="button" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            onClick={() => onSliceActivate?.(i)}
            className={styles.legendRow()} data-arena-part={manifest.parts.legendRow} {...styles.$data.legendRow()}
            style={{ opacity: hover === null || hover === i ? 1 : 0.55 }}>
            <span aria-hidden="true" className={arenaDoughnutChartStyles(arenaSwatchHue(tonedSeries, i, 1)).legendSwatch()} data-arena-part={manifest.parts.legendSwatch} {...arenaDoughnutChartStyles(arenaSwatchHue(tonedSeries, i, 1)).$data.legendSwatch()} />
            <span className={styles.legendText()} data-arena-part={manifest.parts.legendText} {...styles.$data.legendText()}>
              <span className={styles.legendLabel()} data-arena-part={manifest.parts.legendLabel} {...styles.$data.legendLabel()}>{labels[i] ?? ''}</span>
              <span className={styles.legendValue()} data-arena-part={manifest.parts.legendValue} {...styles.$data.legendValue()}>{fmt(values[i] ?? 0)}</span>
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
