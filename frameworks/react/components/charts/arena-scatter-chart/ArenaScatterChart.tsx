import React, { useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import { arenaSrOnly, arenaValueWriter, ARENA_CHART_HEIGHT } from '../../../DataVisuals.ts';
import {
  arenaLinearScale, arenaScaleValue, arenaNearestPoint, arenaRadiusScale, arenaRadiusAt,
} from '../ChartScales.ts';
import { arenaPlotBox, arenaAxisModel, arenaAxisModelX, arenaTickLabelX, arenaCategoryAnchor, arenaCategoryLabelY, arenaValueGutter } from '../ChartAxis.ts';
import {
  arenaPointCount, arenaPointSeriesDomain, arenaPointSeriesColor, arenaPointTable,
  arenaPointSized, arenaPointSizeRange,
} from '../ChartSeries.ts';
import { arenaLegendStrip } from '../ChartLegend.ts';
import { arenaTooltipAnchor } from '../ChartTooltip.ts';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer.ts';
import { chartPointR, chartPointRHover } from '../../../Tokens.generated.js';

import type { ArenaLinePoint } from '../ChartScales.ts';
import type { ArenaNumberFormat, ArenaPointSeries } from '../../../Api.generated';

export interface ArenaScatterChartProps {

  /** The plotted series, drawn as one cloud of marks each. Each carries pairs rather than indexed values, because a scatter has no categories to index against: that is what ArenaPointSeries is for and why it is a separate type from ArenaSeries. The ramp clamps at its last slot rather than cycling. */
  series: readonly ArenaPointSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing. */
  label: string;

  /** Names the horizontal quantity, for the accessible table's column. Required, because unlike every other chart here both axes carry a quantity a reader cannot derive: a bar chart's categories name themselves through `labels` and its value axis is the one thing being measured, while a scatter measures two things and a table of bare X and Y columns says which is which to nobody. */
  xLabel: string;

  /** Names the vertical quantity, for the accessible table's column. Required for the reason xLabel is. */
  yLabel: string;

  /** Names the quantity a series' `r` carries, for the accessible table's third column. Required as soon as any series carries one, and guarded at render rather than declared required, because a scatter with no sizes has no third quantity to name and a member that is required only sometimes cannot say so in a contract. A column headed "Size" would satisfy the table mechanically and tell a reader nothing, which is the same reason `label` is guarded. */
  sizeLabel?: string;

  /** Draw a key of three sample bubbles, at the smallest, middle and largest size the data carries, under the series names. Without it a reader can see that one blot is bigger and cannot say by how much, because area is the one encoding nobody reads off a scale by eye. It costs plot height, like the series strip and for the same reason, and it is off by default so a scatter with no sizes never pays for it. */
  sizeLegend?: boolean;

  /** Appended verbatim to every number the chart draws: both axes' ticks, the tooltip and the accessible table. Carries its own leading space if one is wanted. It reaches BOTH axes, so leave it off when the two quantities are not in the same unit, which on a scatter is the common case. */
  valueSuffix?: string;

  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it, and on both axes for the same reason. */
  valuePrefix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  valueFormat?: ArenaNumberFormat;

  /** The plot's height in px, the --chart-height token by default. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  height?: number;
}


export function ArenaScatterChart({
  series, label, xLabel, yLabel, sizeLabel, sizeLegend = false, valueSuffix, valuePrefix, valueFormat,
  height = ARENA_CHART_HEIGHT,
}: ArenaScatterChartProps) {
  if (!label) throw new Error('ArenaScatterChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (!xLabel) throw new Error('ArenaScatterChart: `xLabel` is required (both axes carry a quantity, and a table of bare X and Y columns names neither)');
  if (!yLabel) throw new Error('ArenaScatterChart: `yLabel` is required (both axes carry a quantity, and a table of bare X and Y columns names neither)');
  if (!series) throw new Error('ArenaScatterChart: `series` is required');
  if (arenaPointSized(series) && !sizeLabel) {
    throw new Error('ArenaScatterChart: `sizeLabel` is required once a series carries `r` (a column headed "Size" names the quantity to nobody)');
  }
  const [ref, measured] = useArenaContainerWidth();
  const [hover, setHover] = useState<number | null>(null);

  const width = measured ?? 600;
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });

  const domains = arenaPointSeriesDomain(series);
  const sized = arenaPointSized(series);
  const sizes = arenaPointSizeRange(series);
  const rScale = arenaRadiusScale(sizes.min, sizes.max);
  const showsKey = sized && sizeLegend;
  const strip = arenaLegendStrip(height, series.length, showsKey);
  const gutter = arenaValueGutter(domains.y, fmt);
  const box = arenaPlotBox(width, strip.plotH, gutter);
  const xScale = arenaLinearScale(domains.x.min, domains.x.max, box.x, box.x + box.w);
  const yScale = arenaLinearScale(domains.y.min, domains.y.max, box.y + box.h, box.y);
  const xAxis = arenaAxisModelX(xScale, domains.x, fmt);
  const yAxis = arenaAxisModel(yScale, domains.y, fmt);

  const colors = series.map((one, s) => arenaPointSeriesColor(one, s + 1));
  const table = arenaPointTable(series, xLabel, yLabel, sizeLabel ?? '', fmt);
  const n = arenaPointCount(series);

  const marks: Array<{ seriesIndex: number; at: ArenaLinePoint; x: number; y: number; r: number; size?: number }> = [];
  series.forEach((one, seriesIndex) => {
    const pairs = Math.min(one.x.length, one.y.length);
    for (let i = 0; i < pairs; i += 1) {
      const x = one.x[i] as number;
      const y = one.y[i] as number;
      const size = one.r === undefined ? undefined : one.r[i];
      marks.push({
        seriesIndex,
        at: { x: arenaScaleValue(xScale, x), y: arenaScaleValue(yScale, y) },
        x, y, size,
        r: size === undefined ? chartPointR : arenaRadiusAt(rScale, size),
      });
    }
  });

  const name = `${label} — scatter chart`;

  const onPointer = (e: React.PointerEvent<SVGRectElement>, phase: string) => {
    if (!arenaPointerUpdates(e.pointerType, phase)) return;
    const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svg) return;
    const index = arenaNearestPoint(marks.map((mark) => mark.at), e.clientX - svg.left, e.clientY - svg.top);
    if (index >= 0) setHover(index);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!arenaCursorHandles(e.key, 'x')) return;
    e.preventDefault();
    setHover(arenaCursorStep(hover, e.key, n, 'x'));
  };

  const active = hover === null ? null : marks[hover] ?? null;

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height }}>
      <div tabIndex={0} role="group" aria-label={name} onKeyDown={onKeyDown}
        style={{ display: 'block', outlineOffset: 'var(--focus-offset)' }}>
      <svg width="100%" height={strip.plotH} role="img" aria-label={name}
        style={{ display: 'block', overflow: 'visible' }}>
        {yAxis.ticks.map((tick, i) => (
          <g key={i}>
            <line x1={box.x} x2={box.x + box.w} y1={tick.y} y2={tick.y}
              stroke="var(--border)" style={{ strokeWidth: 'var(--bw)' }} />
            <text x={arenaTickLabelX(gutter)} y={tick.y} textAnchor="end" dominantBaseline="middle"
              fill="var(--text-muted)" fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>{tick.label}</text>
          </g>
        ))}

        {xAxis.ticks.map((tick, i) => (
          <text key={i} x={tick.x} y={arenaCategoryLabelY(strip.plotH)} textAnchor={arenaCategoryAnchor(i, xAxis.ticks.length)}
            fill="var(--text-muted)" fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>{tick.label}</text>
        ))}

        <line x1={box.x} x2={box.x + box.w} y1={yAxis.zeroY} y2={yAxis.zeroY}
          stroke="var(--line-strong)" style={{ strokeWidth: 'var(--bw)' }} />
        <line x1={xAxis.zeroX} x2={xAxis.zeroX} y1={box.y} y2={box.y + box.h}
          stroke="var(--line-strong)" style={{ strokeWidth: 'var(--bw)' }} />

        {marks.map((mark, i) => (
          <circle key={i} cx={mark.at.x} cy={mark.at.y} r={hover === i ? mark.r + (chartPointRHover - chartPointR) : mark.r}
            fill={colors[mark.seriesIndex]} stroke="var(--surface-card)"
            opacity={hover === null || hover === i ? 1 : 0.55}
            style={{ strokeWidth: 'var(--bw-strong)', transition: 'opacity var(--dur-hover) var(--ease-hover)' }} />
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

      {showsKey && (
        <div aria-hidden="true" style={{
          height: strip.sizeH, display: 'flex', alignItems: 'center', gap: 'calc(var(--sp-1) * 4)',
          overflow: 'hidden', whiteSpace: 'nowrap',
        }}>
          {[sizes.min, (sizes.min + sizes.max) / 2, sizes.max].map((size, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--sp-1) * 1.5)' }}>
              <svg width={strip.sizeH} height={strip.sizeH} style={{ display: 'block', flexShrink: 0 }}>
                <circle cx={strip.sizeH / 2} cy={strip.sizeH / 2} r={arenaRadiusAt(rScale, size)}
                  fill="none" stroke="var(--border-strong)" style={{ strokeWidth: 'var(--bw)' }} />
              </svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-sm)', color: 'var(--text-body)' }}>{fmt(size)}</span>
            </span>
          ))}
        </div>
      )}

      {active && (
        <div style={{
          position: 'absolute', transform: 'translate(-50%,-100%)', pointerEvents: 'none', whiteSpace: 'nowrap',
          background: 'var(--bg-raised)', border: 'var(--bw) solid var(--border-strong)',
          borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-2)', padding: 'calc(var(--sp-1) * 1.5) calc(var(--sp-1) * 2.5)',
          ...arenaTooltipAnchor(active.at.x, active.at.y),
        }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--dz-text-xs)', color: 'var(--mute)' }}>
            {series[active.seriesIndex]?.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-md)', color: 'var(--bone)' }}>
            {xLabel}: {fmt(active.x)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-md)', color: 'var(--bone)' }}>
            {yLabel}: {fmt(active.y)}
          </div>
          {active.size !== undefined && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-md)', color: 'var(--bone)' }}>
              {sizeLabel}: {fmt(active.size)}
            </div>
          )}
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
