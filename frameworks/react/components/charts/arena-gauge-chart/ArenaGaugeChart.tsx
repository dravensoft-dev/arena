import React from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import { arenaSrOnly, arenaAreaFill, arenaToneColor, arenaValueWriter, ARENA_INK_MUTED } from '../../../DataVisuals.ts';
import { arenaGaugeFraction } from '../ChartScales.ts';
import { arenaGaugeAngle, arenaGaugeAnchor, arenaGaugePoint, arenaGaugeRadii } from '../ChartPolar.ts';
import { arenaArcPath } from '../ChartMarks.ts';
import { arenaGaugeBand, arenaGaugeBands, arenaGaugeColor, arenaGaugeTable, arenaGaugeTicks } from '../ChartSeries.ts';
import { chartGaugeHeight, chartLabelGap } from '../../../Tokens.generated.js';

import type { ArenaCatSlot, ArenaGaugeBand, ArenaNumberFormat } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import type { ArenaGaugeChartClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaGaugeChart.classes.generated.ts';

export interface ArenaGaugeChartProps {
  className?: ArenaGaugeChartClass;


  /** The one reading. A single number is not a series, so it is not an ArenaSeries. The drawing clamps it to the scale and the words never do. The centre reading and the table write the number passed, so 130 on a scale of 0 to 100 draws the arc at the end and still says 130. A non-finite value is not a zero: the gauge draws the empty track and leaves the reading and its table cell empty. */
  value: number;

  /** Names the gauge for its accessible name and for the caption of its data table. Required and guarded rather than defaulted, because a fallback of the chart type would announce two gauges on one page identically. */
  label: string;

  /** The low end of the scale, where the arc begins. The start of the dial and the table both write it. */
  min?: number;

  /** The high end of the scale, where the arc ends and where the last band stops. A `max` not greater than `min` warns once and draws the empty track, because there is no scale to place a value on. */
  max?: number;

  /** What the scale means. Each band runs from its `from` to the next band's `from`, and the last to `max`, and the arc takes the colour of the band the value is in. A value below the first band is in no band and takes the `colorStart` slot. Absent, the arc is one identity colour and no band is drawn. Data rather than a threshold function, so the dial and the table are cut from the same list. An unsorted list is configuration and not data, so it warns once and is read in order of `from`. A band without a `label` throws, because a status colour never ships without its word. */
  bands?: readonly ArenaGaugeBand[];

  /** The identity slot of the arc when there are no `bands`, clamped to the ramp, `colorStart` when absent. With `bands` it is ignored with a development warning, because a chart carries identity or meaning and never both. */
  colorId?: number;

  /** The ramp slot the arc takes when there are no `bands` and no `colorId`, and the slot a value below the first band takes. With `bands`, the band's tone wins. Absent, 1. */
  colorStart?: ArenaCatSlot;

  /** Appended verbatim to every number the gauge writes: the centre reading, the end labels, the band edges and the accessible table. Carries its own leading space if one is wanted. */
  valueSuffix?: string;

  /** Drawn verbatim before every number the gauge writes, as valueSuffix is drawn after it, for a currency that precedes its amount. */
  valuePrefix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  valueFormat?: ArenaNumberFormat;

  /** The dial's height in px, the --chart-gauge-height token by default, a size at which a 270 degree dial with its end labels and its centre reading fits a tile. The radius is derived from it, so the band ring, the track and the reading move together. A number rather than a dimension string, because the gauge does arithmetic with it to place every mark. */
  height?: number;
}


const arenaGaugeChartStyles = arenaStyles(manifest);

export function ArenaGaugeChart({ className,
  value, label, min = 0, max = 100, bands, colorId, colorStart = 1, valueSuffix, valuePrefix, valueFormat,
  height = chartGaugeHeight,
}: ArenaGaugeChartProps) {
  const locale = useArenaLocale();
  const styles = arenaGaugeChartStyles();
  if (!label) throw new Error('ArenaGaugeChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (bands?.some((band) => !band.label)) {
    throw new Error('ArenaGaugeChart: every band needs a `label` (a status colour never ships without its word)');
  }
  const [ref, measured] = useArenaContainerWidth();

  const width = measured ?? 600;
  const cx = width / 2;
  const { cy, band: ring, track, label: labelR } = arenaGaugeRadii(width, height);
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });
  const sorted = arenaGaugeBands(bands ?? [], 'ArenaGaugeChart');
  const ticks = arenaGaugeTicks(sorted, min, max, 'ArenaGaugeChart');
  const index = arenaGaugeBand(sorted, value);
  const color = arenaGaugeColor(sorted, index, colorId, 'ArenaGaugeChart', colorStart);
  const fraction = arenaGaugeFraction(value, min, max);
  const word = sorted[index]?.label;
  const name = arenaPhrase(locale.gaugeChartName, { label });
  const table = arenaGaugeTable({
    measure: locale.gaugeTableMeasure, value: locale.gaugeTableValue, minimum: locale.gaugeTableMinimum,
    maximum: locale.gaugeTableMaximum, range: locale.gaugeTableRange,
  }, value, min, max, sorted, fmt);
  const reads = Number.isFinite(value);
  const arc = (r: { outer: number; inner: number }, from: number, to: number) =>
    arenaArcPath(cx, cy, r.outer, r.inner, arenaGaugeAngle(from), arenaGaugeAngle(to));

  return (
    <div className={arenaClassName('ArenaGaugeChart', styles.frame(), className, manifest.vocabulary)} ref={ref} data-arena-part={manifest.parts.frame} {...styles.$data.frame()} style={{ height }}>
      <svg width="100%" height={height} role="img" aria-label={name} style={{ display: 'block', overflow: 'visible' }}>
        {sorted.map((band, i) => {
          const from = arenaGaugeFraction(band.from, min, max);
          const to = arenaGaugeFraction(sorted[i + 1]?.from ?? max, min, max);
          return to > from && (
            <path key={i} d={arc(ring, from, to)} fill={arenaAreaFill(arenaToneColor(band.tone))} stroke="none" />
          );
        })}

        <path d={arc(track, 0, 1)} fill="var(--fill-track)" stroke="none" />

        {fraction > 0 && <path d={arc(track, 0, fraction)} fill={color} stroke="none" />}

        {ticks.map((tick) => {
          const f = arenaGaugeFraction(tick, min, max);
          const from = arenaGaugePoint(cx, cy, track.outer, f);
          const to = arenaGaugePoint(cx, cy, ring.outer, f);
          const at = arenaGaugePoint(cx, cy, labelR, f);
          return (
            <g key={tick}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="var(--edge-axis)" style={{ strokeWidth: 'var(--bw)' }} />
              <text x={at.x} y={at.y} textAnchor={arenaGaugeAnchor(f)} dominantBaseline="middle"
                fill={ARENA_INK_MUTED} fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>
                {fmt(tick)}
              </text>
            </g>
          );
        })}

        {reads && (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline={word ? undefined : 'middle'}
            fill="var(--ink-heading)" fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-lg)' }}>
            {fmt(value)}
          </text>
        )}

        {reads && word && (
          <text x={cx} y={cy + chartLabelGap} textAnchor="middle" dominantBaseline="hanging"
            fill={ARENA_INK_MUTED} fontFamily="var(--font-body)" style={{ fontSize: 'var(--dz-text-xs)' }}>
            {word}
          </text>
        )}
      </svg>

      <div style={arenaSrOnly}>
        <table>
          <caption>{name}</caption>
          <thead><tr>{table.columns.map((column, i) => <th key={i}>{column}</th>)}</tr></thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}><th scope="row">{row.header}</th>{row.cells.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
