import React, { useEffect, useRef, useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import {
  ARENA_HEAT_STEPS, ARENA_INK_MUTED, arenaHeatFill, arenaRailStyle, arenaSrOnly, arenaValueWriter,
} from '../../../DataVisuals.ts';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import {
  arenaBandCenter, arenaBandIndex, arenaBandMark, arenaBandScale, arenaHeatEdge, arenaHeatStep,
} from '../ChartScales.ts';
import {
  arenaCategoryLabelX, arenaCategoryLabelY, arenaHeatmapBox, arenaHeatmapHeight, arenaHeatmapWidth, arenaLabelStride,
} from '../ChartAxis.ts';
import { arenaHeatDomain, arenaHeatmapTable, arenaSeriesPointCount } from '../ChartSeries.ts';
import { arenaHeatLegendStrip } from '../ChartLegend.ts';
import { arenaScrolledAnchorX, arenaTooltipAnchor } from '../ChartTooltip.ts';
import type { ArenaCell } from '../ChartPointer.ts';
import { arenaCursorHandles2d, arenaCursorStep2d, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer.ts';
import { chartBarGap, chartBarRadius } from '../../../Tokens.generated.js';

import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import type { ArenaHeatmapChartClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaHeatmapChart.classes.generated.ts';

export interface ArenaHeatmapChartProps {
  className?: ArenaHeatmapChartClass;


  /** One label per column, along the bottom edge, in the same order as every series' `values`. A column with no label has an empty name in the table and the tooltip. */
  labels: readonly string[];

  /** One series per row, top to bottom in the order given, its `label` the row's name and its `values` the row's cells, one per column. A short row leaves its last cells empty, and an empty or non-finite cell is drawn with an outline and no fill, because missing is not low. `colorId`, `colorIds` and `tone` are ignored with one development warning, because a cell's colour is its magnitude. */
  series: readonly ArenaSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. The name is for the CHART, and a series names itself. Required and guarded rather than defaulted: a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  label: string;

  /** Drawn verbatim before every number the chart writes: the legend, the tooltip and the accessible table, as valueSuffix is drawn after it. */
  valuePrefix?: string;

  /** Appended verbatim to every number the chart writes: the legend, the tooltip and the accessible table. Carries its own leading space if one is wanted. */
  valueSuffix?: string;

  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  valueFormat?: ArenaNumberFormat;

  /** The narrowest a column is drawn, in px. Below it the plot stops compressing and overflows its container sideways, in the region that is the plot's one tab stop. Absent, the plot fits whatever width it is given. */
  minCellWidth?: number;

  /** The plot's height in px. Absent, the height is computed from the row count, one row pitch for each row plus the pads and the legend strip. A chart with many rows therefore grows with its data. The height is the axis the rows run down, so a caller with a fixed tile passes the room it has. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  height?: number;
}


const arenaHeatmapChartStyles = arenaStyles(manifest);

const STEPS = Array.from({ length: ARENA_HEAT_STEPS }, (_, i) => i + 1);

export function ArenaHeatmapChart({ className,
  labels, series, label, valuePrefix, valueSuffix, valueFormat, minCellWidth, height,
}: ArenaHeatmapChartProps) {
  const locale = useArenaLocale();
  const styles = arenaHeatmapChartStyles();
  if (!label) throw new Error('ArenaHeatmapChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (!labels) throw new Error('ArenaHeatmapChart: `labels` is required');
  if (!series) throw new Error('ArenaHeatmapChart: `series` is required');
  const [ref, measured] = useArenaContainerWidth();
  const rail = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<ArenaCell | null>(null);
  const [view, setView] = useState({ left: 0, visible: 0 });

  if (series.some((one) => one.colorId !== undefined || one.colorIds !== undefined || one.tone !== undefined)) {
    arenaWarnOnce('ArenaHeatmapChart: a series\' colorId, colorIds and tone are ignored, because a cell\'s colour is its magnitude');
  }

  const available = measured ?? 600;
  const rows = series.length;
  const cols = Math.max(labels.length, arenaSeriesPointCount(series));
  const total = height ?? arenaHeatmapHeight(rows);
  const strip = arenaHeatLegendStrip(total);
  const width = arenaHeatmapWidth(available, cols, minCellWidth);
  const scrolls = width > available;
  const box = arenaHeatmapBox(width, strip.plotH);
  const colScale = arenaBandScale(cols, box.x, box.w, chartBarGap);
  const rowScale = arenaBandScale(rows, box.y, box.h, chartBarGap);
  const domain = arenaHeatDomain(series);
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });
  const table = arenaHeatmapTable(locale.heatmapTableRow, series, labels, fmt);
  const stride = arenaLabelStride(colScale.step, labels);
  const name = arenaPhrase(locale.heatmapChartName, { label });

  const cellRect = (row: number, col: number) => {
    const w = colScale.band;
    const h = rowScale.band;
    return { x: arenaBandMark(colScale, col), y: arenaBandMark(rowScale, row), width: w, height: h, rx: Math.min(chartBarRadius, w / 2, h / 2) };
  };

  const syncView = () => {
    const region = rail.current;
    if (!region) return;
    setView((was) => (was.left === region.scrollLeft && was.visible === region.clientWidth
      ? was : { left: region.scrollLeft, visible: region.clientWidth }));
  };

  useEffect(() => {
    const region = rail.current;
    if (!region || !scrolls || !cursor) return;
    const left = arenaBandMark(colScale, cursor.col);
    const right = left + colScale.band;
    if (left < region.scrollLeft) region.scrollLeft = left;
    else if (right > region.scrollLeft + region.clientWidth) region.scrollLeft = right - region.clientWidth;
    syncView();
  }, [cursor, scrolls, colScale.step]);

  useEffect(syncView, [measured, scrolls, width]);

  const onPointer = (e: React.PointerEvent<SVGRectElement>, phase: string) => {
    if (!rows || !cols || !arenaPointerUpdates(e.pointerType, phase)) return;
    const svg = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svg) return;
    setCursor({ row: arenaBandIndex(rowScale, e.clientY - svg.top), col: arenaBandIndex(colScale, e.clientX - svg.left) });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!arenaCursorHandles2d(e.key)) return;
    e.preventDefault();
    setCursor(arenaCursorStep2d(cursor, e.key, rows, cols));
  };

  const active = cursor && cursor.row < rows && cursor.col < cols ? cursor : null;

  return (
    <div className={arenaClassName('ArenaHeatmapChart', styles.frame(), className)} ref={ref} data-arena-part={manifest.parts.frame} {...styles.$data.frame()} style={{ height: total }}>
      <div ref={rail} style={arenaRailStyle} tabIndex={0} role="group" aria-label={name} onKeyDown={onKeyDown} onScroll={syncView}>
      <svg width={scrolls ? width : '100%'} height={strip.plotH} role="img" aria-label={name} style={{ display: 'block', overflow: 'visible' }}>
        {series.map((one, row) => Array.from({ length: cols }, (_, col) => {
          const value = one.values[col];
          const rect = cellRect(row, col);
          const step = value === undefined ? null : arenaHeatStep(domain, value, ARENA_HEAT_STEPS);
          return step === null ? (
            <rect key={`${row}-${col}`} {...rect} fill="none" stroke="var(--edge-separator)" style={{ strokeWidth: 'var(--bw)' }} />
          ) : (
            <rect key={`${row}-${col}`} {...rect} fill={arenaHeatFill(step)} />
          );
        }))}

        {series.map((one, row) => (
          <text key={row} x={arenaCategoryLabelX()} y={arenaBandCenter(rowScale, row)} textAnchor="end" dominantBaseline="middle"
            fill={ARENA_INK_MUTED} fontFamily="var(--font-body)" style={{ fontSize: 'var(--dz-text-xs)' }}>{one.label}</text>
        ))}

        {Array.from({ length: Math.min(cols, labels.length) }, (_, col) => col % stride === 0 && (
          <text key={col} x={arenaBandCenter(colScale, col)} y={arenaCategoryLabelY(strip.plotH)} textAnchor="middle"
            fill={ARENA_INK_MUTED} fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>{labels[col]}</text>
        ))}

        {active && (
          <rect {...cellRect(active.row, active.col)} fill="none" stroke="var(--ink-body)" style={{ strokeWidth: 'var(--bw-strong)' }} />
        )}

        <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent"
          onPointerMove={(e) => onPointer(e, 'move')} onPointerDown={(e) => onPointer(e, 'down')}
          onPointerLeave={(e) => { if (arenaPointerClears(e.pointerType)) setCursor(null); }}
          onPointerCancel={() => setCursor(null)} />
      </svg>
      </div>

      <div aria-hidden="true" className={styles.legend()} data-arena-part={manifest.parts.legend} {...styles.$data.legend()} style={{ height: strip.stripH }}>
        {STEPS.map((step) => (
          <span key={step} className={styles.legendItem()} data-arena-part={manifest.parts.legendItem} {...styles.$data.legendItem()}>
            <span className={styles.legendSwatch()} data-arena-part={manifest.parts.legendSwatch} {...styles.$data.legendSwatch()} style={{ background: arenaHeatFill(step) }} />
            <span className={styles.legendLabel()} data-arena-part={manifest.parts.legendLabel} {...styles.$data.legendLabel()}>{fmt(arenaHeatEdge(domain, step - 1))}</span>
          </span>
        ))}
      </div>

      {active && (() => {
        const one = series[active.row] as ArenaSeries;
        const value = one.values[active.col];
        return (
          <div className={styles.tooltip()} data-arena-part={manifest.parts.tooltip} {...styles.$data.tooltip()} style={{
            ...arenaTooltipAnchor(
              scrolls ? arenaScrolledAnchorX(arenaBandCenter(colScale, active.col), view.left, view.visible || available) : arenaBandCenter(colScale, active.col),
              arenaBandMark(rowScale, active.row),
            ),
          }}>
            <div className={styles.tooltipLabel()} data-arena-part={manifest.parts.tooltipLabel} {...styles.$data.tooltipLabel()}>{labels[active.col] ?? ''}</div>
            <div className={styles.tooltipValue()} data-arena-part={manifest.parts.tooltipValue} {...styles.$data.tooltipValue()}>
              {value !== undefined && Number.isFinite(value) ? `${one.label}: ${fmt(value)}` : one.label}
            </div>
          </div>
        );
      })()}

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
