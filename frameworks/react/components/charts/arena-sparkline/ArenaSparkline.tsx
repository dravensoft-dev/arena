import React, { useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import { arenaSrOnly, arenaAreaFill, arenaValueWriter, arenaCatRotate } from '../../../DataVisuals.ts';
import { arenaLinearScale, arenaPointScale, arenaPointAt, arenaScaleValue, arenaNearestPointIndex } from '../ChartScales.ts';
import { arenaLinePoints, arenaLineAreaPath, arenaCurvePath, arenaCurveAreaPath } from '../ChartMarks.ts';
import { arenaSparkBox, arenaSparkTooltipTop, arenaTooltipShift } from '../ChartAxis.ts';
import { arenaChartTable, arenaOneSeries, arenaSeriesColors, arenaSparkDomain } from '../ChartSeries.ts';
import { arenaTooltipAnchor } from '../ChartTooltip.ts';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer.ts';
import { chartPointR, chartPointRHover, chartSparklineHeight } from '../../../Tokens.generated.js';

import type { ArenaCatSlot, ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import type { ArenaSparklineClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSparkline.classes.generated.ts';

export interface ArenaSparklineProps {
  className?: ArenaSparklineClass;


  /** One label per point, in the order of the series' `values`. A label heads its row of the hidden table and the tooltip. A label with no value ends the line there rather than dropping it to zero. */
  labels: readonly string[];

  /** The series drawn, exactly one. A second warns and is ignored, because a sparkline has no legend to say which line is which. `tone` is the only trend colour; without it the line takes the identity colour of the slot `colorStart` names, which says nothing about whether the trend is good. */
  series: readonly ArenaSeries[];

  /** The ramp slot the line takes when its series names no colour of its own. Absent, 1. */
  colorStart?: ArenaCatSlot;

  /** Names the sparkline for its accessible name and for the caption of its data table. Required and guarded rather than defaulted: a table cell holding six sparklines needs six distinct names, and a fallback of the chart type would announce all six identically. */
  label: string;

  /** Fill under the line at 18% of the series colour: a tint, never a gradient. The fill reaches the floor of the box, which is the lowest value and not zero. The fill therefore shades the shape and measures nothing. */
  area?: boolean;

  /** Draw the series as a smooth curve rather than straight segments between points. The interpolation is monotone cubic, not Catmull-Rom. A Catmull-Rom curve overshoots and draws a peak or a trough nobody measured. A monotone curve stays inside the band its own two points define. The curve changes the path string and nothing else. */
  curve?: boolean;

  /** Whether the plot answers the pointer and the keyboard: one tab stop whose arrow keys move a data cursor, a crosshair, an enlarged dot and a tooltip. Off by default, because the common place of a sparkline is a table cell, where every interactive one adds a tab stop to the page. A declared boolean rather than one derived from a bound listener, because a sparkline reports nothing to listen to. */
  interactive?: boolean;

  /** Appended verbatim to every number the sparkline writes: the tooltip and the accessible table. Carries its own leading space if one is wanted. */
  valueSuffix?: string;

  /** Drawn verbatim before every number the sparkline writes, as valueSuffix is drawn after it, for a currency that precedes its amount. */
  valuePrefix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  valueFormat?: ArenaNumberFormat;

  /** The plot's height in px, the --chart-sparkline-height token by default. That token is the line box of a compact table row, so a sparkline in a cell leaves the row the height its text gives it. A number rather than a dimension string, because the sparkline does arithmetic with it to place every point. */
  height?: number;
}


const arenaSparklineStyles = arenaStyles(manifest);

const PLOT_STYLE: React.CSSProperties = { display: 'block', outlineOffset: 'var(--focus-offset)' };

const REGION_STYLE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', minHeight: 'var(--dz-ctl-h-sm)', outlineOffset: 'var(--focus-offset)',
};

export function ArenaSparkline({ className,
  labels, series, colorStart = 1, label, area = false, curve = false, interactive = false, valueSuffix, valuePrefix, valueFormat,
  height = chartSparklineHeight,
}: ArenaSparklineProps) {
  const locale = useArenaLocale();
  const styles = arenaSparklineStyles();
  if (!label) throw new Error('ArenaSparkline: `label` is required (it names the sparkline for the accessible name, and nothing can derive that)');
  if (!labels) throw new Error('ArenaSparkline: `labels` is required');
  if (!series) throw new Error('ArenaSparkline: `series` is required');
  const [ref, measured] = useArenaContainerWidth();
  const [hover, setHover] = useState<number | null>(null);

  const width = measured ?? 600;
  const one = arenaOneSeries(series, 'ArenaSparkline', 'A sparkline has no legend to tell two lines apart');
  const n = one.values.length;
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });

  const domain = arenaSparkDomain(one.values);
  const box = arenaSparkBox(width, height);
  const floor = box.y + box.h;
  const yScale = arenaLinearScale(domain.min, domain.max, floor, box.y);
  const xScale = arenaPointScale(n, box.x, box.w);
  const color = arenaSeriesColors(one, 1, arenaCatRotate(colorStart, 0), 'ArenaSparkline', colorStart)[0] as string;
  const table = arenaChartTable(locale.chartTablePoint, [one], labels, fmt);
  const points = one.values.map((value, i) => ({ x: arenaPointAt(xScale, i), y: arenaScaleValue(yScale, value) }));
  const last = points[n - 1];
  const name = arenaPhrase(locale.sparklineChartName, { label });
  const cursor = interactive && hover !== null && hover < n ? hover : null;
  const at = cursor === null ? undefined : points[cursor];

  const onPointer = (e: React.PointerEvent<SVGRectElement>, phase: string) => {
    if (!n || !arenaPointerUpdates(e.pointerType, phase)) return;
    const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svg) return;
    const index = arenaNearestPointIndex(points, e.clientX - svg.left);
    if (index >= 0) setHover(index);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!arenaCursorHandles(e.key, 'x')) return;
    e.preventDefault();
    setHover(arenaCursorStep(hover, e.key, n, 'x'));
  };

  const graphic = (
    <svg width="100%" height={height} role="img" aria-label={name} style={{ display: 'block', overflow: 'visible' }}>
      {area && n > 0 && (
        <path d={curve ? arenaCurveAreaPath(points, floor) : arenaLineAreaPath(points, floor)}
          fill={arenaAreaFill(color)} stroke="none" />
      )}

      {at && (
        <line x1={at.x} x2={at.x} y1={box.y} y2={floor}
          stroke="var(--edge-axis)" style={{ strokeWidth: 'var(--bw)' }} strokeDasharray="3 3" />
      )}

      {n > 1 && (curve ? (
        <path d={arenaCurvePath(points)} fill="none" stroke={color} style={{ strokeWidth: 'var(--bw-strong)' }}
          strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <polyline points={arenaLinePoints(points)} fill="none" stroke={color} style={{ strokeWidth: 'var(--bw-strong)' }}
          strokeLinejoin="round" strokeLinecap="round" />
      ))}

      {last && cursor !== n - 1 && (
        <circle cx={last.x} cy={last.y} r={chartPointR}
          fill={color} stroke="var(--fill-surface)" style={{ strokeWidth: 'var(--bw-strong)' }} />
      )}

      {at && (
        <circle cx={at.x} cy={at.y} r={chartPointRHover}
          fill={color} stroke="var(--fill-surface)" style={{ strokeWidth: 'var(--bw-strong)' }} />
      )}

      {interactive && (
        <rect x={0} y={0} width="100%" height={height} fill="transparent"
          onPointerMove={(e) => onPointer(e, 'move')} onPointerDown={(e) => onPointer(e, 'down')}
          onPointerLeave={(e) => { if (arenaPointerClears(e.pointerType)) setHover(null); }}
          onPointerCancel={() => setHover(null)} />
      )}
    </svg>
  );

  return (
    <div className={arenaClassName('ArenaSparkline', styles.frame(), className)} ref={ref} data-arena-part={manifest.parts.frame} {...styles.$data.frame()} style={interactive ? undefined : { height }}>
      <div style={interactive ? REGION_STYLE : PLOT_STYLE} tabIndex={interactive ? 0 : undefined} role={interactive ? 'group' : undefined}
        aria-label={interactive ? name : undefined} onKeyDown={interactive ? onKeyDown : undefined}>{graphic}</div>

      {at && cursor !== null && (
        <div className={styles.tooltip()} data-arena-part={manifest.parts.tooltip} {...styles.$data.tooltip()} style={{
          ...arenaTooltipAnchor(at.x, at.y), top: arenaSparkTooltipTop(at.y, height),
          '--arena-sparkline-shift': arenaTooltipShift(at.x, box),
        } as React.CSSProperties}>
          <div className={styles.tooltipLabel()} data-arena-part={manifest.parts.tooltipLabel} {...styles.$data.tooltipLabel()}>{labels[cursor]}</div>
          <div className={styles.tooltipValue()} data-arena-part={manifest.parts.tooltipValue} {...styles.$data.tooltipValue()}>
            {fmt(one.values[cursor] as number)}
          </div>
        </div>
      )}

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
