import React, { useEffect, useRef, useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import {
  arenaSrOnly, arenaAreaFill, arenaPlotWidth, arenaRailStyle, arenaValueWriter, ARENA_CHART_HEIGHT,
} from '../../../DataVisuals.ts';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import {
  arenaLinearScale, arenaPointScale, arenaPointAt, arenaScaleValue, arenaNearestPointIndex,
} from '../ChartScales.ts';
import { arenaLinePoints, arenaLineAreaPath, arenaCurvePath, arenaCurveAreaPath } from '../ChartMarks.ts';
import { arenaPlotBox, arenaAxisModel, arenaTickLabelX, arenaCategoryAnchor, arenaCategoryLabelY, arenaValueGutter } from '../ChartAxis.ts';
import { arenaChartTable, arenaSeriesColors, arenaSeriesDomain, arenaSeriesPointCount } from '../ChartSeries.ts';
import { arenaLegendStrip } from '../ChartLegend.ts';
import { arenaTooltipAnchor } from '../ChartTooltip.ts';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer.ts';
import { chartPointR, chartPointRHover } from '../../../Tokens.generated.js';

import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';

export interface ArenaLineChartProps {

  /** One label per point, in the same order as every series' `values`. A label with no value in a series ends that series' line there rather than dropping to zero. */
  labels: readonly string[];

  /** The plotted series, drawn as one polyline each over the same ordered sequence. One series is the common case and draws exactly what it drew before. The area fill is refused past one series, because two fills occlude each other and the reader cannot tell which value either edge belongs to. */
  series: readonly ArenaSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  label: string;

  /** Fill under the line at 18% of the series colour: a tint, never a gradient. For a single series; two fills occlude each other. */
  area?: boolean;

  /** Draw the series as a smooth curve rather than straight segments between points. The interpolation is monotone cubic, not Catmull-Rom, and that is the whole of the decision: a Catmull-Rom curve overshoots, so between two measured points it draws a peak or a trough nobody measured, and a chart that draws data which does not exist is the one thing a chart may not do. A monotone curve stays inside the band its own two points define, keeps a flat tangent at a turning point, and never crosses zero unless the values do. It changes the path string and nothing else: the points, the crosshair, the tooltip and the data cursor read the same numbers at the same places. */
  curve?: boolean;

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


export function ArenaLineChart({
  labels, series, label, area = false, curve = false, valueSuffix, valuePrefix, valueFormat,
  height = ARENA_CHART_HEIGHT, minPointSpacing,
}: ArenaLineChartProps) {
  if (!label) throw new Error('ArenaLineChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (!labels) throw new Error('ArenaLineChart: `labels` is required');
  if (!series) throw new Error('ArenaLineChart: `series` is required');
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

  if (area && series.length > 1) {
    arenaWarnOnce('ArenaLineChart: `area` is for a single series. Two fills occlude each other and the reader cannot tell which value either edge belongs to, so none is drawn.');
  }
  const fills = area && series.length === 1;

  const domain = arenaSeriesDomain(series);
  const strip = arenaLegendStrip(height, series.length);
  const gutter = arenaValueGutter(domain, fmt);
  const box = arenaPlotBox(width, strip.plotH, gutter);
  const yScale = arenaLinearScale(domain.min, domain.max, box.y + box.h, box.y);
  const xScale = arenaPointScale(n, box.x, box.w);
  const axis = arenaAxisModel(yScale, domain, fmt);
  const colors = series.map((one, s) => arenaSeriesColors(one, 1, s + 1)[0] as string);
  const table = arenaChartTable('Point', series, labels, fmt);

  const plotted = series.map(
    (one) => one.values.map((value, i) => ({ x: arenaPointAt(xScale, i), y: arenaScaleValue(yScale, value) })),
  );

  const name = `${label} — line chart`;

  const onPointer = (e: React.PointerEvent<SVGRectElement>, phase: string) => {
    if (!n || !arenaPointerUpdates(e.pointerType, phase)) return;
    const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svg) return;
    const across = Array.from({ length: n }, (_, i) => ({ x: arenaPointAt(xScale, i), y: 0 }));
    const index = arenaNearestPointIndex(across, e.clientX - svg.left);
    if (index >= 0) setHover(index);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!arenaCursorHandles(e.key, 'x')) return;
    e.preventDefault();
    setHover(arenaCursorStep(hover, e.key, n, 'x'));
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height }}>
      <div ref={rail} style={arenaRailStyle} tabIndex={0} role="group" aria-label={name} onKeyDown={onKeyDown}>
      <svg width={scrolls ? width : '100%'} height={strip.plotH} role="img" aria-label={name} style={{ display: 'block', overflow: 'visible' }}>
        {axis.ticks.map((tick, i) => (
          <g key={i}>
            <line x1={box.x} x2={box.x + box.w} y1={tick.y} y2={tick.y} stroke="var(--border)" style={{ strokeWidth: 'var(--bw)' }} />
            <text x={arenaTickLabelX(gutter)} y={tick.y} textAnchor="end" dominantBaseline="middle"
              fill="var(--text-muted)" fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>{tick.label}</text>
          </g>
        ))}
        <line x1={box.x} x2={box.x + box.w} y1={axis.zeroY} y2={axis.zeroY} stroke="var(--line-strong)" style={{ strokeWidth: 'var(--bw)' }} />

        {}
        {fills && plotted.map((points, s) => points.length > 0 && (
          <path key={s} d={curve ? arenaCurveAreaPath(points, axis.zeroY) : arenaLineAreaPath(points, axis.zeroY)}
            fill={arenaAreaFill(colors[s] as string)} stroke="none" />
        ))}

        {hover !== null && (
          <line x1={arenaPointAt(xScale, hover)} x2={arenaPointAt(xScale, hover)} y1={box.y} y2={box.y + box.h}
            stroke="var(--border-strong)" style={{ strokeWidth: 'var(--bw)' }} strokeDasharray="3 3" />
        )}

        {plotted.map((points, s) => points.length > 1 && (curve ? (
          <path key={s} d={arenaCurvePath(points)} fill="none" stroke={colors[s]} style={{ strokeWidth: 'var(--bw-strong)' }}
            strokeLinejoin="round" strokeLinecap="round" />
        ) : (
          <polyline key={s} points={arenaLinePoints(points)} fill="none" stroke={colors[s]} style={{ strokeWidth: 'var(--bw-strong)' }}
            strokeLinejoin="round" strokeLinecap="round" />
        )))}

        {plotted.map((points, s) => points.map((point, i) => (
          <circle key={`${s}-${i}`} cx={point.x} cy={point.y} r={hover === i ? chartPointRHover : chartPointR}
            fill={colors[s]} stroke="var(--surface-card)" style={{ strokeWidth: 'var(--bw-strong)' }} />
        )))}

        {

}
        {Array.from({ length: n }, (_, i) => (
          <text key={i} x={arenaPointAt(xScale, i)} y={arenaCategoryLabelY(strip.plotH)} textAnchor={arenaCategoryAnchor(i, n)}
            fill="var(--text-muted)" fontFamily="var(--font-body)" style={{ fontSize: 'var(--fs-xs)' }}>{labels[i] ?? ''}</text>
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
        <div aria-hidden="true" style={{
          height: strip.stripH, display: 'flex', alignItems: 'center', gap: 'calc(var(--sp-1) * 4)',
          overflow: 'hidden', whiteSpace: 'nowrap',
        }}>
          {series.map((one, s) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--sp-1) * 1.5)', minWidth: 0 }}>
              <span style={{ width: 'calc(var(--sp-1) * 2.5)', height: 'calc(var(--sp-1) * 2.5)',
                borderRadius: 'var(--r-xs)', background: colors[s], flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-body)', fontSize: 'var(--dz-text-sm)', color: 'var(--text-body)' }}>{one.label}</span>
            </span>
          ))}
        </div>
      )}

      {hover !== null && hover < n && (
        <div style={{
          position: 'absolute', transform: 'translate(-50%,-100%)', pointerEvents: 'none', whiteSpace: 'nowrap',
          background: 'var(--bg-raised)', border: 'var(--bw) solid var(--border-strong)',
          borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-2)', padding: 'calc(var(--sp-1) * 1.5) calc(var(--sp-1) * 2.5)',
          ...arenaTooltipAnchor(arenaPointAt(xScale, hover),
            Math.min(...series.map((one) => arenaScaleValue(yScale, one.values[hover] ?? 0)))),
        }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--dz-text-xs)', color: 'var(--mute)' }}>{labels[hover]}</div>
          {series.map((one, s) => one.values[hover] !== undefined && (
            <div key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-md)', color: 'var(--bone)' }}>
              {series.length > 1 ? `${one.label}: ` : ''}{fmt(one.values[hover] as number)}
            </div>
          ))}
        </div>
      )}

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
