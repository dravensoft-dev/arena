import React, { useState } from 'react';
import { useArenaContainerWidth } from '../../../UseArenaContainerWidth.ts';
import {
  ARENA_CHART_HEIGHT, ARENA_INK_BODY, ARENA_INK_MUTED, arenaAreaFill, arenaPercentWriter, arenaSrOnly, arenaValueWriter,
} from '../../../DataVisuals.ts';
import {
  arenaLinearScale, arenaBandCenter, arenaBandIndex, arenaBandMark, arenaBandStart, arenaFunnelBands, arenaFunnelWidth,
} from '../ChartScales.ts';
import { arenaFunnelConnector, arenaFunnelRect } from '../ChartMarks.ts';
import { arenaCategoryLabelX, arenaFunnelBox, arenaTextGutter } from '../ChartAxis.ts';
import {
  arenaFunnelConversions, arenaFunnelMax, arenaFunnelTable, arenaOneSeries, arenaSeriesColors,
} from '../ChartSeries.ts';
import { arenaTooltipAnchor } from '../ChartTooltip.ts';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer.ts';
import { chartBarRadius, chartLabelGap } from '../../../Tokens.generated.js';

import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { useArenaLocale } from '../../../ArenaLocale.ts';
import { arenaPhrase } from '../../../Phrase.ts';
import type { ArenaFunnelChartClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaFunnelChart.classes.generated.ts';

export interface ArenaFunnelChartProps {
  className?: ArenaFunnelChartClass;


  /** One label per stage, in the same order as the series' `values`, running down the left edge. The chart does not reorder them: a funnel's order is a sequence in time or in a process, and sorting would invent one. A stage with no label has an empty name. */
  labels: readonly string[];

  /** Exactly one series, the count at each stage in order. A second series warns and is ignored, because two funnels are two charts. `colorIds` is per-stage identity. `tone`, when given, colours the whole series and never a position, because a later stage is not worse for being later. */
  series: readonly ArenaSeries[];

  /** Names the chart for its accessible name and for the caption of its data table. The label is the CHART's name, not a series': a series names itself. A fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. Required and guarded rather than defaulted for that reason. */
  label: string;

  /** Whether the conversion is drawn and tabled. On, each stage's share of the stage before it is written beside the loss between the two, the table gains the two conversion columns, and the tooltip reads both ratios. Off, the funnel is its marks and their counts. */
  showConversion?: boolean;

  /** Appended verbatim to every count the chart writes: the numbers beside the stages, the tooltip and the accessible table. The conversion is a percentage and takes no suffix. */
  valueSuffix?: string;

  /** Drawn verbatim before every count the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide, and a suffix alone cannot say it: "1234.5 Bs." would disagree with the table beside it reading "Bs. 1.234,50", and the accessible table would inherit the disagreement. */
  valuePrefix?: string;

  /** How each count is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. The conversion takes only the locale and keeps at most one fraction digit, so 62.4% is never written 62%. */
  valueFormat?: ArenaNumberFormat;

  /** The plot's height in px, the --chart-height token by default. The height is the axis the stages run down, so a funnel of many stages wants more of it. Pass the room the data needs rather than letting the stages thin out. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  height?: number;
}


const arenaFunnelChartStyles = arenaStyles(manifest);

export function ArenaFunnelChart({ className, 
  labels, series, label, showConversion = true, valueSuffix, valuePrefix, valueFormat,
  height = ARENA_CHART_HEIGHT,
}: ArenaFunnelChartProps) {
  const locale = useArenaLocale();
  const styles = arenaFunnelChartStyles();
  if (!label) throw new Error('ArenaFunnelChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
  if (!labels) throw new Error('ArenaFunnelChart: `labels` is required');
  if (!series) throw new Error('ArenaFunnelChart: `series` is required');
  const [ref, measured] = useArenaContainerWidth();
  const [hover, setHover] = useState<number | null>(null);

  const width = measured ?? 600;
  const one = arenaOneSeries(series, 'ArenaFunnelChart', 'A funnel is one ordered series, and two funnels are two charts');
  const values = one.values;
  const n = Math.max(labels.length, values.length);
  const fmt = arenaValueWriter({ prefix: valuePrefix, suffix: valueSuffix, format: valueFormat });
  const percent = arenaPercentWriter(valueFormat);
  const conversions = arenaFunnelConversions(values);

  const texts = [
    ...values.filter((value) => Number.isFinite(value)).map((value) => fmt(value)),
    ...(showConversion
      ? conversions.flatMap(({ step }) => (step === null ? [] : [percent(step)]))
      : []),
  ];
  const box = arenaFunnelBox(width, height, arenaTextGutter(texts));
  const cx = box.x + box.w / 2;
  const scale = arenaLinearScale(0, arenaFunnelMax(values), 0, box.w);
  const bands = arenaFunnelBands(n, box.y, box.h);
  const colors = arenaSeriesColors(one, n, 1);
  const table = arenaFunnelTable(
    { stage: locale.chartTableCategory, step: locale.funnelConversionStep, total: locale.funnelConversionTotal },
    one, labels, fmt, percent, showConversion,
  );
  const wide = (i: number) => arenaFunnelWidth(scale, values[i] as number);
  const markBottom = (i: number) => arenaBandMark(bands, i) + bands.band;
  const gutterX = box.x + box.w + chartLabelGap;

  const name = arenaPhrase(locale.funnelChartName, { label });

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
    <div className={arenaClassName('ArenaFunnelChart', styles.frame(), className)} ref={ref} data-arena-part={manifest.parts.frame} {...styles.$data.frame()} style={{ height }}>
      <div tabIndex={0} role="group" aria-label={name} onKeyDown={onKeyDown}
        style={{ display: 'block', outlineOffset: 'var(--focus-offset)' }}>
      <svg width="100%" height={height} role="img" aria-label={name}
        style={{ display: 'block', overflow: 'visible' }}>
        {showConversion && Array.from({ length: Math.max(0, n - 1) }, (_, i) => {
          const above = values[i];
          const below = values[i + 1];
          if (above === undefined || below === undefined || !Number.isFinite(above) || !Number.isFinite(below)) return null;
          return (
            <path key={i}
              d={arenaFunnelConnector(cx, { y: markBottom(i), width: wide(i) }, { y: arenaBandMark(bands, i + 1), width: wide(i + 1) })}
              fill={arenaAreaFill(colors[i] as string)} stroke="none" />
          );
        })}

        {Array.from({ length: n }, (_, i) => {
          const value = values[i];
          if (value === undefined || !Number.isFinite(value)) return null;
          const rect = arenaFunnelRect(cx, arenaBandMark(bands, i), bands.band, wide(i));
          return (
            <rect key={i} {...rect} rx={Math.min(chartBarRadius, rect.width / 2, bands.band / 2)} fill={colors[i]}
              opacity={hover === null || hover === i ? 1 : 0.55}
              style={{ transition: 'opacity var(--dur-hover) var(--ease-hover)' }} />
          );
        })}

        {Array.from({ length: n }, (_, i) => (
          <text key={i} x={arenaCategoryLabelX()} y={arenaBandCenter(bands, i)} textAnchor="end" dominantBaseline="middle"
            fill={ARENA_INK_MUTED} fontFamily="var(--font-body)" style={{ fontSize: 'var(--dz-text-xs)' }}>{labels[i] ?? ''}</text>
        ))}

        {Array.from({ length: n }, (_, i) => {
          const value = values[i];
          if (value === undefined || !Number.isFinite(value)) return null;
          return (
            <text key={i} x={gutterX} y={arenaBandCenter(bands, i)} textAnchor="start" dominantBaseline="middle"
              fill={ARENA_INK_BODY} fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>{fmt(value)}</text>
          );
        })}

        {showConversion && Array.from({ length: n }, (_, i) => {
          const step = conversions[i]?.step ?? null;
          if (step === null) return null;
          return (
            <text key={i} x={gutterX} y={arenaBandStart(bands, i)} textAnchor="start" dominantBaseline="middle"
              fill={ARENA_INK_MUTED} fontFamily="var(--font-mono)" style={{ fontSize: 'var(--dz-text-2xs)' }}>{percent(step)}</text>
          );
        })}

        <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent"
          onPointerMove={(e) => onPointer(e, 'move')} onPointerDown={(e) => onPointer(e, 'down')}
          onPointerLeave={(e) => { if (arenaPointerClears(e.pointerType)) setHover(null); }}
          onPointerCancel={() => setHover(null)} />
      </svg>
      </div>

      {hover !== null && hover < n && (() => {
        const value = values[hover];
        const step = conversions[hover]?.step ?? null;
        const total = conversions[hover]?.total ?? null;
        const lines = [
          ...(value !== undefined && Number.isFinite(value) ? [fmt(value)] : []),
          ...(showConversion && step !== null ? [`${locale.funnelConversionStep}: ${percent(step)}`] : []),
          ...(showConversion && total !== null ? [`${locale.funnelConversionTotal}: ${percent(total)}`] : []),
        ];
        return (
          <div className={styles.tooltip()} data-arena-part={manifest.parts.tooltip} {...styles.$data.tooltip()} style={{
            ...arenaTooltipAnchor(cx, arenaBandCenter(bands, hover)),
          }}>
            <div className={styles.tooltipLabel()} data-arena-part={manifest.parts.tooltipLabel} {...styles.$data.tooltipLabel()}>{labels[hover]}</div>
            {lines.map((line, i) => (
              <div key={i} className={styles.tooltipValue()} data-arena-part={manifest.parts.tooltipValue} {...styles.$data.tooltipValue()}>{line}</div>
            ))}
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
