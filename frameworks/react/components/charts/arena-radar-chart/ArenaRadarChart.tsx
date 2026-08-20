import React, { useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import { arenaSrOnly, arenaAreaFill, arenaValueWriter, ARENA_CHART_HEIGHT } from '../../../DataVisuals.ts';
import { arenaLinearScale, arenaScaleValue } from '../ChartScales.ts';
import { arenaLinePoints } from '../ChartMarks.ts';
import {
  arenaPolarPoint, arenaPolarIndex, arenaPolarAnchor, arenaRadarRings, arenaRadarRadius, arenaRadarLabelRadius,
} from '../ChartPolar.ts';
import {
  arenaChartTable, arenaSeriesColors, arenaSeriesPointCount, arenaRadarDomain,
} from '../ChartSeries.ts';
import { arenaLegendStrip } from '../ChartLegend.ts';
import { arenaTooltipAnchor } from '../ChartTooltip.ts';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer.ts';
import { chartPointR, chartPointRHover } from '../../../Tokens.generated.js';

import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';

export interface ArenaRadarChartProps {

  /** One label per axis, in the same order as every series' `values`, running clockwise from 12 o'clock. Keep the count small: past eight or so the labels collide and the shape stops being readable, which is a limit of the form rather than of the drawing. */
  labels: readonly string[];

  /** The plotted series, drawn as one closed polygon each over the same axes. The shape is the reading, so two or three series is the useful case and more is a tangle. The ramp clamps at its last slot rather than cycling. */
  series: readonly ArenaSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing. */
  label: string;

  /** Fill each polygon at 18% of its series colour: a tint, never a gradient. Useful for one series, where the filled area reads as a footprint. Past one the fills overlap and the reader cannot tell which polygon an overlap belongs to, so leave it off and let the outlines carry the shape. */
  fill?: boolean;

  /** Appended verbatim to every number the chart draws: the tooltip and the accessible table. Carries its own leading space if one is wanted. */
  valueSuffix?: string;

  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. */
  valuePrefix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  valueFormat?: ArenaNumberFormat;

  /** The plot's height in px, the --chart-height token by default. The grid is a circle inscribed in the smaller of the plot's two axes, so this also caps how wide the shape gets. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  height?: number;
}


export function ArenaRadarChart({
  labels, series, label, fill = false, valueSuffix, valuePrefix, valueFormat,
  height = ARENA_CHART_HEIGHT,
}: ArenaRadarChartProps) {
  if (!label) throw new Error('ArenaRadarChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (!labels) throw new Error('ArenaRadarChart: `labels` is required');
  if (!series) throw new Error('ArenaRadarChart: `series` is required');
  const [ref, measured] = useArenaContainerWidth();
  const [hover, setHover] = useState<number | null>(null);

  const width = measured ?? 600;
  const n = arenaSeriesPointCount(series);
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });

  const domain = arenaRadarDomain(series);
  const strip = arenaLegendStrip(height, series.length);
  const cx = width / 2;
  const cy = strip.plotH / 2;
  const outer = arenaRadarRadius(width, strip.plotH);
  const labelR = arenaRadarLabelRadius(width, strip.plotH);
  const radial = arenaLinearScale(domain.min, domain.max, 0, outer);
  const reach = (value: number) => Math.max(0, arenaScaleValue(radial, value));

  const colors = series.map((one, s) => arenaSeriesColors(one, 1, s + 1)[0] as string);
  const table = arenaChartTable('Axis', series, labels, fmt);
  const rings = arenaRadarRings(domain);

  const name = `${label} — radar chart`;

  const onPointer = (e: React.PointerEvent<SVGRectElement>, phase: string) => {
    if (!arenaPointerUpdates(e.pointerType, phase)) return;
    const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svg) return;
    const index = arenaPolarIndex(cx, cy, e.clientX - svg.left, e.clientY - svg.top, n);
    if (index >= 0) setHover(index);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!arenaCursorHandles(e.key, 'x')) return;
    e.preventDefault();
    setHover(arenaCursorStep(hover, e.key, n, 'x'));
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height }}>
      <div tabIndex={0} role="group" aria-label={name} onKeyDown={onKeyDown}
        style={{ display: 'block', outlineOffset: 'var(--focus-offset)' }}>
      <svg width="100%" height={strip.plotH} role="img" aria-label={name}
        style={{ display: 'block', overflow: 'visible' }}>
        {rings.map((value, i) => (
          <polygon key={i} fill="none" stroke="var(--border)" style={{ strokeWidth: 'var(--bw)' }}
            points={arenaLinePoints(Array.from({ length: n }, (_, a) => arenaPolarPoint(cx, cy, reach(value), a, n)))} />
        ))}

        {Array.from({ length: n }, (_, i) => {
          const tip = arenaPolarPoint(cx, cy, outer, i, n);
          return (
            <line key={i} x1={cx} y1={cy} x2={tip.x} y2={tip.y}
              stroke={hover === i ? 'var(--border-strong)' : 'var(--border)'} style={{ strokeWidth: 'var(--bw)' }} />
          );
        })}

        {fill && series.map((one, s) => (
          <polygon key={s} stroke="none" fill={arenaAreaFill(colors[s] as string)}
            points={arenaLinePoints(Array.from({ length: n },
              (_, a) => arenaPolarPoint(cx, cy, reach(one.values[a] ?? 0), a, n)))} />
        ))}

        {series.map((one, s) => (
          <polygon key={s} fill="none" stroke={colors[s]} strokeLinejoin="round"
            style={{ strokeWidth: 'var(--bw-strong)' }}
            points={arenaLinePoints(Array.from({ length: n },
              (_, a) => arenaPolarPoint(cx, cy, reach(one.values[a] ?? 0), a, n)))} />
        ))}

        {series.map((one, s) => Array.from({ length: n }, (_, a) => {
          const value = one.values[a];
          if (value === undefined) return null;
          const at = arenaPolarPoint(cx, cy, reach(value), a, n);
          return (
            <circle key={`${s}-${a}`} cx={at.x} cy={at.y} r={hover === a ? chartPointRHover : chartPointR}
              fill={colors[s]} stroke="var(--surface-card)" style={{ strokeWidth: 'var(--bw-strong)' }} />
          );
        }))}

        {Array.from({ length: n }, (_, i) => {
          const at = arenaPolarPoint(cx, cy, labelR, i, n);
          return (
            <text key={i} x={at.x} y={at.y} textAnchor={arenaPolarAnchor(i, n)} dominantBaseline="middle"
              fill="var(--text-muted)" fontFamily="var(--font-body)" style={{ fontSize: 'var(--fs-xs)' }}>{labels[i] ?? ''}</text>
          );
        })}

        <rect x={0} y={0} width="100%" height={strip.plotH} fill="transparent"
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
          ...arenaTooltipAnchor(arenaPolarPoint(cx, cy, outer, hover, n).x,
            arenaPolarPoint(cx, cy, outer, hover, n).y),
        }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--dz-text-xs)', color: 'var(--mute)' }}>{labels[hover]}</div>
          {series.map((one, s) => one.values[hover] !== undefined && (
            <div key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-md)', color: 'var(--bone)' }}>
              {`${series.length > 1 ? `${one.label}: ` : ''}${fmt(one.values[hover] as number)}`}
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
