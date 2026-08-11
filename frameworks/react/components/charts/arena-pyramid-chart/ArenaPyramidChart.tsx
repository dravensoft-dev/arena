import React, { useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import { arenaSrOnly, arenaValueWriter, ARENA_CHART_HEIGHT } from '../../../DataVisuals.ts';
import {
  arenaLinearScale, arenaBandScale, arenaBandCenter, arenaBandIndex, arenaBandMark, arenaScaleValue,
} from '../ChartScales.ts';
import { arenaBarPathH } from '../ChartMarks.ts';
import { arenaPlotBoxH, arenaAxisModelX, arenaCategoryLabelX, arenaTickLabelY } from '../ChartAxis.ts';
import {
  arenaChartTable, arenaSeriesColors, arenaSeriesPointCount, arenaMirrorDomain, arenaTwoSeries,
} from '../ChartSeries.ts';
import { arenaLegendStrip } from '../ChartLegend.ts';
import { arenaTooltipAnchor } from '../ChartTooltip.ts';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer.ts';
import { chartBarGap, chartBarRadius } from '../../../Tokens.generated.js';

import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';

export interface ArenaPyramidChartProps {

  /** One label per band, in the same order as both series' `values`, running down the left edge. On a population pyramid these are the age brackets, oldest first or youngest first as the data is given: the chart does not reorder them, because which end is the top is a decision about the population and not about the drawing. */
  labels: readonly string[];

  /** Exactly two series, one for each side of the centre line, in order: the first is drawn to the left and the second to the right. Both carry counts rather than signed values, and the chart negates the first when it draws it, so the accessible table reads the numbers that were passed and the picture reads the shape they make. A third series has nowhere to go and warns; a single one is a horizontal bar chart and should be one. */
  series: readonly ArenaSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  label: string;

  /** Appended verbatim to every number the chart draws: the axis ticks, the tooltip and the accessible table. The ticks carry the magnitude, never the minus sign the left side is drawn with, because both sides count upward from the centre. */
  valueSuffix?: string;

  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. */
  valuePrefix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. */
  valueFormat?: ArenaNumberFormat;

  /** The plot's height in px, the --chart-height token by default. It is the axis the bands run down, so a pyramid of many brackets wants more of it: pass the room the data needs rather than letting the bands thin out. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  height?: number;
}


export function ArenaPyramidChart({
  labels, series, label, valueSuffix, valuePrefix, valueFormat,
  height = ARENA_CHART_HEIGHT,
}: ArenaPyramidChartProps) {
  if (!label) throw new Error('ArenaPyramidChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (!labels) throw new Error('ArenaPyramidChart: `labels` is required');
  if (!series) throw new Error('ArenaPyramidChart: `series` is required');
  const [ref, measured] = useArenaContainerWidth();
  const [hover, setHover] = useState<number | null>(null);

  const width = measured ?? 600;
  const sides = arenaTwoSeries(series, 'ArenaPyramidChart');
  const n = arenaSeriesPointCount(sides);
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });
  const away = (value: number) => fmt(Math.abs(value));

  const domain = arenaMirrorDomain(sides);
  const strip = arenaLegendStrip(height, sides.length);
  const box = arenaPlotBoxH(width, strip.plotH);
  const xScale = arenaLinearScale(domain.min, domain.max, box.x, box.x + box.w);
  const bands = arenaBandScale(n, box.y, box.h, chartBarGap);
  const axis = arenaAxisModelX(xScale, domain, away);
  const colors = sides.map((one, s) => arenaSeriesColors(one, n, s + 1));
  const table = arenaChartTable('Category', sides, labels, fmt);

  const name = `${label} — horizontal bar chart`;

  const onPointer = (e: React.PointerEvent<SVGRectElement>, phase: string) => {
    if (!arenaPointerUpdates(e.pointerType, phase)) return;
    const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svg) return;
    const index = arenaBandIndex(bands, e.clientY - svg.top);
    if (index >= 0) setHover(index);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!arenaCursorHandles(e.key, 'y')) return;
    e.preventDefault();
    setHover(arenaCursorStep(hover, e.key, n, 'y'));
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height }}>
      <div tabIndex={0} role="group" aria-label={name} onKeyDown={onKeyDown}
        style={{ display: 'block', outlineOffset: 'var(--focus-offset)' }}>
      <svg width="100%" height={strip.plotH} role="img" aria-label={name}
        style={{ display: 'block', overflow: 'visible' }}>
        {axis.ticks.map((tick, i) => (
          <g key={i}>
            <line x1={tick.x} x2={tick.x} y1={box.y} y2={box.y + box.h}
              stroke="var(--border)" style={{ strokeWidth: 'var(--bw)' }} />
            <text x={tick.x} y={arenaTickLabelY(strip.plotH)} textAnchor="middle"
              fill="var(--text-muted)" fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>{tick.label}</text>
          </g>
        ))}
        <line x1={axis.zeroX} x2={axis.zeroX} y1={box.y} y2={box.y + box.h}
          stroke="var(--line-strong)" style={{ strokeWidth: 'var(--bw)' }} />

        {Array.from({ length: n }, (_, i) => (
          <g key={i}>
            {sides.map((one, s) => {
              const value = one.values[i];
              if (value === undefined) return null;
              const away = s === 0 ? -value : value;
              return (
                <path key={s} d={arenaBarPathH(arenaBandMark(bands, i), bands.band,
                  arenaScaleValue(xScale, away), axis.zeroX, chartBarRadius)} fill={colors[s]?.[i]}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                  style={{ transition: 'opacity var(--dur-hover) var(--ease-hover)' }} />
              );
            })}
          </g>
        ))}

        {Array.from({ length: n }, (_, i) => (
          <text key={i} x={arenaCategoryLabelX()} y={arenaBandCenter(bands, i)} textAnchor="end" dominantBaseline="middle"
            fill="var(--text-muted)" fontFamily="var(--font-body)" style={{ fontSize: 'var(--fs-xs)' }}>{labels[i] ?? ''}</text>
        ))}

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
          {sides.map((one, s) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--sp-1) * 1.5)', minWidth: 0 }}>
              <span style={{ width: 'calc(var(--sp-1) * 2.5)', height: 'calc(var(--sp-1) * 2.5)',
                borderRadius: 'var(--r-xs)', background: colors[s]?.[0], flexShrink: 0 }} />
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
          ...arenaTooltipAnchor(axis.zeroX, arenaBandCenter(bands, hover)),
        }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--dz-text-xs)', color: 'var(--mute)' }}>{labels[hover]}</div>
          {sides.map((one, s) => one.values[hover] !== undefined && (
            <div key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-md)', color: 'var(--bone)' }}>
              {`${one.label}: `}{fmt(one.values[hover] as number)}
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
