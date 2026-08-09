import {
  ChangeDetectionStrategy, Component, computed, input, signal,
} from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import {
  ARENA_CHART_HEIGHT, ARENA_SR_ONLY, arenaValueWriter,
} from '../../../DataVisuals';
import {
  arenaLinearScale, arenaBandScale, arenaBandCenter, arenaBandIndex, arenaBandMark, arenaScaleValue,
} from '../ChartScales';
import { arenaBarPathH } from '../ChartMarks';
import { arenaPlotBoxH, arenaAxisModelX, arenaCategoryLabelX, arenaTickLabelY } from '../ChartAxis';
import {
  arenaChartTable, arenaSeriesColors, arenaSeriesPointCount, arenaMirrorDomain, arenaTwoSeries,
} from '../ChartSeries';
import { arenaLegendStrip } from '../ChartLegend';
import { arenaTooltipAnchor } from '../ChartTooltip';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer';
import { ARENA_TOOLTIP_STYLE, ARENA_TOOLTIP_LABEL_STYLE, ARENA_TOOLTIP_VALUE_STYLE } from '../ChartTooltipStyles';
import {
  ARENA_LEGEND_STRIP_STYLE, ARENA_LEGEND_ITEM_STYLE, ARENA_LEGEND_SWATCH_STYLE, ARENA_LEGEND_LABEL_STYLE,
} from '../ChartLegendStyles';
import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { chartBarGap, chartBarRadius } from '../../../Tokens.generated';

const BAR_RADIUS = chartBarRadius;

const ASSUMED_WIDTH = 600;

const REGION_STYLE = { display: 'block', outlineOffset: 'var(--focus-offset)' } as const satisfies Readonly<Record<string, string>>;

const LINE_STYLE = { strokeWidth: 'var(--bw)' } as const satisfies Readonly<Record<string, string>>;

const TICK_LABEL_STYLE = { fontSize: 'var(--dz-text-2xs)' } as const satisfies Readonly<Record<string, string>>;

const CATEGORY_LABEL_STYLE = { fontSize: 'var(--fs-xs)' } as const satisfies Readonly<Record<string, string>>;

const BAR_STYLE = { transition: 'opacity var(--dur-fast) var(--ease-out)' } as const satisfies Readonly<Record<string, string>>;




@Component({
  selector: 'arena-pyramid-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display:block;position:relative',
    '[style.height.px]': 'height()',
  },
  template: `
    <div [style]="regionStyle" tabindex="0" role="group" [attr.aria-label]="name()"
         (keydown)="onKey($event)">
    <svg width="100%" [attr.height]="plotH()" role="img" [attr.aria-label]="name()"
         style="display:block;overflow:visible">
      @for (tick of gridLines(); track tick.value) {
        <g>
          <line [attr.x1]="tick.x" [attr.x2]="tick.x" [attr.y1]="plotTop()" [attr.y2]="plotBottom()"
                stroke="var(--border)" [style]="lineStyle" />
          <text [attr.x]="tick.x" [attr.y]="tickLabelY()" text-anchor="middle"
                fill="var(--text-muted)" font-family="var(--font-mono)"
                [style]="tickLabelStyle">{{ tick.label }}</text>
        </g>
      }
      <line [attr.x1]="zeroX()" [attr.x2]="zeroX()" [attr.y1]="plotTop()" [attr.y2]="plotBottom()"
            stroke="var(--line-strong)" [style]="lineStyle" />

      @for (bar of bars(); track bar.index) {
        <g>
          @for (mark of bar.marks; track mark.key) {
            <path [attr.d]="mark.path" [attr.fill]="mark.color"
                  [attr.opacity]="hover() === null || hover() === bar.index ? 1 : 0.55"
                  [style]="barStyle" />
          }
        </g>
      }

      @for (bar of bars(); track bar.index) {
        <text [attr.x]="categoryLabelX" [attr.y]="bar.midY" text-anchor="end" dominant-baseline="middle"
              fill="var(--text-muted)" font-family="var(--font-body)"
              [style]="categoryLabelStyle">{{ bar.label }}</text>
      }

      <rect [attr.x]="plotLeft()" [attr.y]="plotTop()" [attr.width]="innerWidth()" [attr.height]="innerHeight()"
            fill="transparent" (pointermove)="onPointer($event, 'move')" (pointerdown)="onPointer($event, 'down')"
            (pointerleave)="onPointerLeave($event)" (pointercancel)="hover.set(null)" />
    </svg>
    </div>

    @if (legend(); as keys) {
      <div aria-hidden="true" [style]="legendStripStyle" [style.height.px]="stripH()">
        @for (key of keys; track key.index) {
          <span [style]="legendItemStyle">
            <span [style]="legendSwatchStyle" [style.background]="key.color"></span>
            <span [style]="legendLabelStyle">{{ key.label }}</span>
          </span>
        }
      </div>
    }

    @if (active(); as point) {
      <div [style]="tooltipStyle" [style.left.px]="point.anchor.left" [style.top]="point.anchor.top">
        <div [style]="tooltipLabelStyle">{{ point.label }}</div>
        @for (mark of point.marks; track mark.key) {
          <div [style]="tooltipValueStyle">{{ mark.name }}{{ mark.value }}</div>
        }
      </div>
    }

    <table [style]="arenaSrOnly">
      <caption>{{ name() }}</caption>
      <thead><tr>@for (column of table().columns; track $index) { <th>{{ column }}</th> }</tr></thead>
      <tbody>
        @for (row of table().rows; track $index) {
          <tr><th scope="row">{{ row.header }}</th>@for (cell of row.cells; track $index) { <td>{{ cell }}</td> }</tr>
        }
      </tbody>
    </table>
  `,
})
export class ArenaPyramidChart {
  /** One label per band, in the same order as both series' `values`, running down the left edge. On a population pyramid these are the age brackets, oldest first or youngest first as the data is given: the chart does not reorder them, because which end is the top is a decision about the population and not about the drawing. */
  readonly labels = input.required<readonly string[]>();
  /** Exactly two series, one for each side of the centre line, in order: the first is drawn to the left and the second to the right. Both carry counts rather than signed values, and the chart negates the first when it draws it, so the accessible table reads the numbers that were passed and the picture reads the shape they make. A third series has nowhere to go and warns; a single one is a horizontal bar chart and should be one. */
  readonly series = input.required<readonly ArenaSeries[]>();
  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  readonly label = input.required<string>();
  /** Appended verbatim to every number the chart draws: the axis ticks, the tooltip and the accessible table. The ticks carry the magnitude, never the minus sign the left side is drawn with, because both sides count upward from the centre. */
  readonly valueSuffix = input<string>();
  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. */
  readonly valuePrefix = input<string>();
  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** The plot's height in px, the --chart-height token by default. It is the axis the bands run down, so a pyramid of many brackets wants more of it: pass the room the data needs rather than letting the bands thin out. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  readonly height = input<number, number | undefined>(
    ARENA_CHART_HEIGHT,
    { transform: (value) => value ?? ARENA_CHART_HEIGHT },
  );

  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly regionStyle = REGION_STYLE;
  protected readonly lineStyle = LINE_STYLE;
  protected readonly tickLabelStyle = TICK_LABEL_STYLE;
  protected readonly categoryLabelStyle = CATEGORY_LABEL_STYLE;
  protected readonly barStyle = BAR_STYLE;
  protected readonly tooltipStyle = ARENA_TOOLTIP_STYLE;
  protected readonly tooltipLabelStyle = ARENA_TOOLTIP_LABEL_STYLE;
  protected readonly tooltipValueStyle = ARENA_TOOLTIP_VALUE_STYLE;
  protected readonly legendStripStyle = ARENA_LEGEND_STRIP_STYLE;
  protected readonly legendItemStyle = ARENA_LEGEND_ITEM_STYLE;
  protected readonly legendSwatchStyle = ARENA_LEGEND_SWATCH_STYLE;
  protected readonly legendLabelStyle = ARENA_LEGEND_LABEL_STYLE;
  protected readonly categoryLabelX = arenaCategoryLabelX();
  protected readonly hover = signal<number | null>(null);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly measured = arenaContainerWidth();

  private readonly width = computed(() => this.measured() ?? ASSUMED_WIDTH);

  protected readonly name = computed(() => {
    return `${this.label()} — horizontal bar chart`;
  });

  private readonly sides = computed(() => arenaTwoSeries(this.series(), 'ArenaPyramidChart'));

  private readonly away = computed(() => {
    const write = this.write();
    return (value: number) => write(Math.abs(value));
  });

  private readonly domain = computed(() => arenaMirrorDomain(this.sides()));

  private readonly points = computed(() => arenaSeriesPointCount(this.sides()));
  private readonly strip = computed(() => arenaLegendStrip(this.height(), this.sides().length));
  protected readonly plotH = computed(() => this.strip().plotH);
  protected readonly stripH = computed(() => this.strip().stripH);
  private readonly box = computed(() => arenaPlotBoxH(this.width(), this.strip().plotH));
  protected readonly plotLeft = computed(() => this.box().x);
  protected readonly plotTop = computed(() => this.box().y);
  protected readonly plotBottom = computed(() => this.box().y + this.box().h);
  protected readonly innerWidth = computed(() => this.box().w);
  protected readonly innerHeight = computed(() => this.box().h);
  protected readonly tickLabelY = computed(() => arenaTickLabelY(this.strip().plotH));

  private readonly xScale = computed(() => {
    const box = this.box();
    const domain = this.domain();
    return arenaLinearScale(domain.min, domain.max, box.x, box.x + box.w);
  });

  private readonly bands = computed(() => {
    const box = this.box();
    return arenaBandScale(this.points(), box.y, box.h, chartBarGap);
  });

  private readonly axis = computed(() => arenaAxisModelX(this.xScale(), this.domain(), this.away()));

  protected readonly zeroX = computed(() => this.axis().zeroX);
  protected readonly gridLines = computed(() => this.axis().ticks);

  protected readonly bars = computed(() => {
    const sides = this.sides();
    const bands = this.bands();
    const xScale = this.xScale();
    const zeroX = this.zeroX();
    const write = this.write();
    const labels = this.labels();
    return Array.from({ length: this.points() }, (_, index) => ({
      index,
      midY: arenaBandCenter(bands, index),
      label: labels[index] ?? '',
      marks: sides.flatMap((one, s) => {
        const value = one.values[index];
        if (value === undefined) return [];
        const signed = s === 0 ? -value : value;
        return [{
          key: s,
          name: `${one.label}: `,
          path: arenaBarPathH(arenaBandMark(bands, index), bands.band,
            arenaScaleValue(xScale, signed), zeroX, BAR_RADIUS),
          color: arenaSeriesColors(one, this.points(), s + 1)[index],
          value: write(value),
        }];
      }),
    }));
  });

  protected readonly legend = computed(() => {
    const sides = this.sides();
    if (this.strip().stripH === 0) return null;
    return sides.map((one, index) => ({
      index,
      label: one.label,
      color: arenaSeriesColors(one, this.points(), index + 1)[0],
    }));
  });

  protected readonly table = computed(() => arenaChartTable(
    'Category', this.sides(), this.labels(), this.write(),
  ));

  protected readonly active = computed(() => {
    const index = this.hover();
    const bar = index === null ? null : this.bars()[index] ?? null;
    if (!bar || bar.marks.length === 0) return null;
    return { ...bar, anchor: arenaTooltipAnchor(this.zeroX(), bar.midY) };
  });

  protected onPointer(event: PointerEvent, phase: string): void {
    if (!arenaPointerUpdates(event.pointerType, phase)) return;
    const box = (event.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    const index = arenaBandIndex(this.bands(), event.clientY - box.top);
    if (index >= 0) this.hover.set(index);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (arenaPointerClears(event.pointerType)) this.hover.set(null);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!arenaCursorHandles(event.key, 'y')) return;
    event.preventDefault();
    this.hover.set(arenaCursorStep(this.hover(), event.key, this.points(), 'y'));
  }
}
