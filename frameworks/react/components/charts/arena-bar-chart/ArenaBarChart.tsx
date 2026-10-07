import React, { useEffect, useRef, useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import { arenaSrOnly, arenaPlotWidth, arenaRailStyle, arenaValueWriter, ARENA_CHART_HEIGHT } from '../../../DataVisuals.ts';
import {
  arenaLinearScale, arenaBandScale, arenaBandCenter, arenaBandIndex, arenaBandMark, arenaBandSubBand, arenaScaleValue,
} from '../ChartScales.ts';
import { arenaBarPath } from '../ChartMarks.ts';
import { arenaPlotBox, arenaAxisModel, arenaTickLabelX, arenaCategoryLabelY, arenaValueGutter } from '../ChartAxis.ts';
import {
  arenaChartTable, arenaSeriesColors, arenaSwatchHue, arenaSeriesDomain, arenaSeriesPointCount, arenaStackSegments, arenaStackDomain,
} from '../ChartSeries.ts';
import { arenaLegendStrip } from '../ChartLegend.ts';
import { arenaTooltipAnchor } from '../ChartTooltip.ts';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer.ts';
import { chartBarGap, chartSeriesGap, chartBarRadius } from '../../../Tokens.generated.js';

import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import type { ArenaBarChartClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaBarChart.classes.generated.ts';

export interface ArenaBarChartProps {
  className?: ArenaBarChartClass;


  /** One label per category, in the same order as every series' `values`. A category with no value in a series is drawn for the series that do have one. */
  labels: readonly string[];

  /** The plotted series, drawn as one group of bars per category. One series is the common case and draws exactly what it drew before; two or more share each category's band, so the bars of one category stand side by side and the reader compares within a category before comparing across. The ramp clamps at its last slot rather than cycling, so a ninth series folds into "Other" upstream, never into a colour already spent. */
  series: readonly ArenaSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  label: string;

  /** Sit each series on the one below it inside a single band per category, rather than standing them side by side. Stack when the series are parts of one total and that total is the thing being read; leave it off when the comparison is between the series, because a segment that does not start at zero is one a reader cannot measure against its neighbours. Positive and negative values stack on their own runs, so a category holding both grows in both directions from the zero line and the axis is sized from the two sums rather than from the largest single value. A series with no value at a category contributes no segment, and the segment above it sits on the one below rather than floating over a gap: a missing number is not a zero here either. Only the outermost segment of each direction is rounded, so the joints inside a bar stay square and read as joints. */
  stack?: boolean;

  /** Appended verbatim to every number the chart draws: the axis ticks, the tooltip and the accessible table. Carries its own leading space if one is wanted. */
  valueSuffix?: string;

  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. */
  valuePrefix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. */
  valueFormat?: ArenaNumberFormat;

  /** The plot's height in px, the --chart-height token by default. A number rather than a dimension string, because the chart does arithmetic with it to place every mark, and a caller-supplied "20rem" is neither a token nor a derivation of one. */
  height?: number;

  /** The narrowest gap, in px, the chart draws between two adjacent points. Below it the chart stops compressing and overflows its container horizontally instead, scrolled and anchored to the most recent point: marker spacing is a legibility constant, not something that yields to the viewport, and thirty days in 390px is unreadable at any font size. Absent, the chart fits whatever width it is given. The rail it scrolls in is the same region the data cursor lives in, and it is keyboard-reachable whether it overflows or not. */
  minPointSpacing?: number;
}


const arenaBarChartStyles = arenaStyles(manifest);

export function ArenaBarChart({ className, 
  labels, series, label, stack = false, valueSuffix, valuePrefix, valueFormat,
  height = ARENA_CHART_HEIGHT, minPointSpacing,
}: ArenaBarChartProps) {
  const locale = useArenaLocale();
  const styles = arenaBarChartStyles();
  if (!label) throw new Error('ArenaBarChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (!labels) throw new Error('ArenaBarChart: `labels` is required');
  if (!series) throw new Error('ArenaBarChart: `series` is required');
  const [ref, measured] = useArenaContainerWidth();
  const rail = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const available = measured ?? 600;
  const n = arenaSeriesPointCount(series);
  const width = arenaPlotWidth(available, n, minPointSpacing);
  const scrolls = width > available;
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });

  useEffect(() => {
    const box = rail.current;
    if (!box || !scrolls) return;
    box.scrollLeft = box.scrollWidth - box.clientWidth;
  }, [scrolls, width]);

  const domain = stack ? arenaStackDomain(series) : arenaSeriesDomain(series);
  const strip = arenaLegendStrip(height, series.length);
  const gutter = arenaValueGutter(domain, fmt);
  const box = arenaPlotBox(width, strip.plotH, gutter);
  const yScale = arenaLinearScale(domain.min, domain.max, box.y + box.h, box.y);
  const bands = arenaBandScale(n, box.x, box.w, chartBarGap);
  const axis = arenaAxisModel(yScale, domain, fmt);
  const colors = series.map((one, s) => arenaSeriesColors(one, n, s + 1));
  const table = arenaChartTable(locale.chartTableCategory, series, labels, fmt);

  const name = arenaPhrase(locale.barChartName, { label });

  const onPointer = (e: React.PointerEvent<SVGRectElement>, phase: string) => {
    if (!arenaPointerUpdates(e.pointerType, phase)) return;
    const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svg) return;
    const index = arenaBandIndex(bands, e.clientX - svg.left);
    if (index >= 0) setHover(index);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!arenaCursorHandles(e.key, 'x')) return;
    e.preventDefault();
    setHover(arenaCursorStep(hover, e.key, n, 'x'));
  };

  return (
    <div className={arenaClassName('ArenaBarChart', styles.frame(), className)} ref={ref} data-arena-part={manifest.parts.frame} {...styles.$data.frame()} style={{ height }}>
      <div ref={rail} style={arenaRailStyle} tabIndex={0} role="group" aria-label={name} onKeyDown={onKeyDown}>
      <svg width={scrolls ? width : '100%'} height={strip.plotH} role="img" aria-label={name}
        style={{ display: 'block', overflow: 'visible' }}>
        {}
        {axis.ticks.map((tick, i) => (
          <g key={i}>
            <line x1={box.x} x2={box.x + box.w} y1={tick.y} y2={tick.y}
              stroke="var(--edge-separator)" style={{ strokeWidth: 'var(--bw)' }} />
            <text x={arenaTickLabelX(gutter)} y={tick.y} textAnchor="end" dominantBaseline="middle"
              fill="color-mix(in oklab,var(--ink-muted) var(--level-ink-muted),transparent)" fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>{tick.label}</text>
          </g>
        ))}
        <line x1={box.x} x2={box.x + box.w} y1={axis.zeroY} y2={axis.zeroY}
          stroke="var(--edge-axis)" style={{ strokeWidth: 'var(--bw)' }} />

        {Array.from({ length: n }, (_, i) => (
          <g key={i}>
            {stack ? arenaStackSegments(series, i).map((segment) => (
              <path key={segment.seriesIndex}
                d={arenaBarPath(arenaBandMark(bands, i), bands.band, arenaScaleValue(yScale, segment.to),
                  arenaScaleValue(yScale, segment.from), segment.outer ? chartBarRadius : 0)}
                fill={colors[segment.seriesIndex]?.[i]}
                opacity={hover === null || hover === i ? 1 : 0.55}
                style={{ transition: 'opacity var(--dur-hover) var(--ease-hover)' }} />
            )) : series.map((one, s) => {
              const value = one.values[i];
              if (value === undefined) return null;
              const y = arenaScaleValue(yScale, value);
              const sub = arenaBandSubBand(bands, i, series.length, s, chartSeriesGap);
              return (
                <path key={s} d={arenaBarPath(sub.x, sub.width, y, axis.zeroY, chartBarRadius)} fill={colors[s]?.[i]}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                  style={{ transition: 'opacity var(--dur-hover) var(--ease-hover)' }} />
              );
            })}
          </g>
        ))}

        {

}
        {Array.from({ length: n }, (_, i) => (
          <text key={i} x={arenaBandCenter(bands, i)} y={arenaCategoryLabelY(strip.plotH)} textAnchor="middle"
            fill="color-mix(in oklab,var(--ink-muted) var(--level-ink-muted),transparent)" fontFamily="var(--font-body)" style={{ fontSize: 'var(--dz-text-xs)' }}>{labels[i] ?? ''}</text>
        ))}

        {
}
        <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent"
          onPointerMove={(e) => onPointer(e, 'move')} onPointerDown={(e) => onPointer(e, 'down')}
          onPointerLeave={(e) => { if (arenaPointerClears(e.pointerType)) setHover(null); }}
          onPointerCancel={() => setHover(null)} />
      </svg>
      </div>

      {strip.stripH > 0 && (
        <div aria-hidden="true" className={styles.legend()} data-arena-part={manifest.parts.legend} {...styles.$data.legend()} style={{ height: strip.stripH }}>
          {series.map((one, s) => (
            <span key={s} className={styles.legendItem()} data-arena-part={manifest.parts.legendItem} {...styles.$data.legendItem()}>
              <span className={arenaBarChartStyles(arenaSwatchHue(one, 0, s + 1)).legendSwatch()} data-arena-part={manifest.parts.legendSwatch} {...arenaBarChartStyles(arenaSwatchHue(one, 0, s + 1)).$data.legendSwatch()} />
              <span className={styles.legendLabel()} data-arena-part={manifest.parts.legendLabel} {...styles.$data.legendLabel()}>{one.label}</span>
            </span>
          ))}
        </div>
      )}

      {hover !== null && hover < n && (
        <div className={styles.tooltip()} data-arena-part={manifest.parts.tooltip} {...styles.$data.tooltip()} style={{
          ...arenaTooltipAnchor(arenaBandCenter(bands, hover),
            Math.min(...(stack
              ? arenaStackSegments(series, hover).map((segment) => arenaScaleValue(yScale, segment.to))
              : series.map((one) => arenaScaleValue(yScale, one.values[hover] ?? 0))))),
        }}>
          <div className={styles.tooltipLabel()} data-arena-part={manifest.parts.tooltipLabel} {...styles.$data.tooltipLabel()}>{labels[hover]}</div>
          {series.map((one, s) => one.values[hover] !== undefined && (
            <div key={s} className={styles.tooltipValue()} data-arena-part={manifest.parts.tooltipValue} {...styles.$data.tooltipValue()}>
              {`${series.length > 1 ? `${one.label}: ` : ''}${fmt(one.values[hover] as number)}`}
            </div>
          ))}
        </div>
      )}

      {}
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
