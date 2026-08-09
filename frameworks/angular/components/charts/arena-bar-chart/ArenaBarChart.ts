import {
  ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, booleanAttribute, computed, input, signal,
  viewChild,
} from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import {
  ARENA_CHART_HEIGHT, ARENA_RAIL_STYLE, ARENA_SR_ONLY, arenaPlotWidth, arenaValueWriter,
} from '../../../DataVisuals';
import {
  arenaLinearScale, arenaBandScale, arenaBandStart, arenaBandCenter, arenaBandIndex, arenaBandMark, arenaBandSubBand,
  arenaScaleValue,
} from '../ChartScales';
import { arenaBarPath } from '../ChartMarks';
import { arenaPlotBox, arenaAxisModel, arenaTickLabelX, arenaCategoryLabelY } from '../ChartAxis';
import {
  arenaChartTable, arenaSeriesColors, arenaSeriesDomain, arenaSeriesPointCount, arenaStackSegments, arenaStackDomain,
} from '../ChartSeries';
import { arenaLegendStrip } from '../ChartLegend';
import { arenaTooltipAnchor } from '../ChartTooltip';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer';
import { ARENA_TOOLTIP_STYLE, ARENA_TOOLTIP_LABEL_STYLE, ARENA_TOOLTIP_VALUE_STYLE } from '../ChartTooltipStyles';
import {
  ARENA_LEGEND_STRIP_STYLE, ARENA_LEGEND_ITEM_STYLE, ARENA_LEGEND_SWATCH_STYLE, ARENA_LEGEND_LABEL_STYLE,
} from '../ChartLegendStyles';
import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { chartBarGap, chartSeriesGap, chartBarRadius } from '../../../Tokens.generated';

const BAR_RADIUS = chartBarRadius;

const ASSUMED_WIDTH = 600;

const LINE_STYLE = { strokeWidth: 'var(--bw)' } as const satisfies Readonly<Record<string, string>>;

const TICK_LABEL_STYLE = { fontSize: 'var(--dz-text-2xs)' } as const satisfies Readonly<Record<string, string>>;

const CATEGORY_LABEL_STYLE = { fontSize: 'var(--fs-xs)' } as const satisfies Readonly<Record<string, string>>;

const BAR_STYLE = { transition: 'opacity var(--dur-fast) var(--ease-out)' } as const satisfies Readonly<Record<string, string>>;




@Component({
  selector: 'arena-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display:block;position:relative;width:100%',
    '[style.height.px]': 'height()',
  },
  template: `
    <div #rail [style]="arenaRailStyle" tabindex="0" role="group" [attr.aria-label]="name()"
         (keydown)="onKey($event)">
    <svg [attr.width]="scrolls() ? width() : '100%'" [attr.height]="plotH()" role="img" [attr.aria-label]="name()"
         style="display:block;overflow:visible">
      @for (tick of gridLines(); track tick.value) {
        <g>
          <line [attr.x1]="plotLeft()" [attr.x2]="plotRight()" [attr.y1]="tick.y" [attr.y2]="tick.y"
                stroke="var(--border)" [style]="lineStyle" />
          <text [attr.x]="tickLabelX" [attr.y]="tick.y" text-anchor="end" dominant-baseline="middle"
                fill="var(--text-muted)" font-family="var(--font-mono)"
                [style]="tickLabelStyle">{{ tick.label }}</text>
        </g>
      }
      <line [attr.x1]="plotLeft()" [attr.x2]="plotRight()" [attr.y1]="zeroY()" [attr.y2]="zeroY()"
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

      <rect [attr.x]="plotLeft()" [attr.y]="plotTop()" [attr.width]="innerWidth()" [attr.height]="innerHeight()"
            fill="transparent" (pointermove)="onPointer($event, 'move')" (pointerdown)="onPointer($event, 'down')"
            (pointerleave)="onPointerLeave($event)" (pointercancel)="hover.set(null)" />

      @for (bar of bars(); track bar.index) {
        <text [attr.x]="bar.midX" [attr.y]="categoryLabelY()" text-anchor="middle"
              fill="var(--text-muted)" font-family="var(--font-body)"
              [style]="categoryLabelStyle">{{ bar.label }}</text>
      }
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
export class ArenaBarChart {
  /** One label per category, in the same order as every series' `values`. A category with no value in a series is drawn for the series that do have one. */
  readonly labels = input.required<readonly string[]>();
  /** The plotted series, drawn as one group of bars per category. One series is the common case and draws exactly what it drew before; two or more share each category's band, so the bars of one category stand side by side and the reader compares within a category before comparing across. The ramp clamps at its last slot rather than cycling, so a ninth series folds into "Other" upstream, never into a colour already spent. */
  readonly series = input.required<readonly ArenaSeries[]>();
  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  readonly label = input.required<string>();
  /** Sit each series on the one below it inside a single band per category, rather than standing them side by side. Stack when the series are parts of one total and that total is the thing being read; leave it off when the comparison is between the series, because a segment that does not start at zero is one a reader cannot measure against its neighbours. Positive and negative values stack on their own runs, so a category holding both grows in both directions from the zero line and the axis is sized from the two sums rather than from the largest single value. A series with no value at a category contributes no segment, and the segment above it sits on the one below rather than floating over a gap: a missing number is not a zero here either. Only the outermost segment of each direction is rounded, so the joints inside a bar stay square and read as joints. */
  readonly stack = input(false, { transform: booleanAttribute });
  /** Appended verbatim to every number the chart draws: the axis ticks, the tooltip and the accessible table. Carries its own leading space if one is wanted. */
  readonly valueSuffix = input<string>();
  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. */
  readonly valuePrefix = input<string>();
  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** The plot's height in px, the --chart-height token by default. A number rather than a dimension string, because the chart does arithmetic with it to place every mark, and a caller-supplied "20rem" is neither a token nor a derivation of one. */
  readonly height = input<number, number | undefined>(
    ARENA_CHART_HEIGHT,
    { transform: (value) => value ?? ARENA_CHART_HEIGHT },
  );
  /** The narrowest gap, in px, the chart draws between two adjacent points. Below it the chart stops compressing and overflows its container horizontally instead, scrolled and anchored to the most recent point: marker spacing is a legibility constant, not something that yields to the viewport, and thirty days in 390px is unreadable at any font size. Absent, the chart fits whatever width it is given. The rail it scrolls in is the same region the data cursor lives in, and it is keyboard-reachable whether it overflows or not. */
  readonly minPointSpacing = input<number>();

  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly arenaRailStyle = ARENA_RAIL_STYLE;
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
  protected readonly tickLabelX = arenaTickLabelX();
  protected readonly categoryLabelY = computed(() => arenaCategoryLabelY(this.strip().plotH));
  protected readonly hover = signal<number | null>(null);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly measured = arenaContainerWidth();

  private readonly available = computed(() => this.measured() ?? ASSUMED_WIDTH);

  protected readonly width = computed(
    () => arenaPlotWidth(this.available(), this.points(), this.minPointSpacing()),
  );

  protected readonly scrolls = computed(() => this.width() > this.available());

  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  protected readonly name = computed(() => {
    return `${this.label()} — bar chart`;
  });

  private readonly domain = computed(
    () => (this.stack() ? arenaStackDomain(this.series()) : arenaSeriesDomain(this.series())),
  );
  private readonly points = computed(() => arenaSeriesPointCount(this.series()));
  private readonly strip = computed(() => arenaLegendStrip(this.height(), this.series().length));
  protected readonly plotH = computed(() => this.strip().plotH);
  protected readonly stripH = computed(() => this.strip().stripH);
  private readonly box = computed(() => arenaPlotBox(this.width(), this.strip().plotH));
  protected readonly plotLeft = computed(() => this.box().x);
  protected readonly plotRight = computed(() => this.box().x + this.box().w);
  protected readonly plotTop = computed(() => this.box().y);
  protected readonly innerWidth = computed(() => this.box().w);
  protected readonly innerHeight = computed(() => this.box().h);

  private readonly yScale = computed(() => {
    const box = this.box();
    const domain = this.domain();
    return arenaLinearScale(domain.min, domain.max, box.y + box.h, box.y);
  });

  private readonly bands = computed(() => {
    const box = this.box();
    return arenaBandScale(this.points(), box.x, box.w, chartBarGap);
  });

  protected readonly step = computed(() => this.bands().step);

  private readonly axis = computed(() => arenaAxisModel(this.yScale(), this.domain(), this.write()));

  protected readonly zeroY = computed(() => this.axis().zeroY);
  protected readonly gridLines = computed(() => this.axis().ticks);

  protected readonly bars = computed(() => {
    const series = this.series();
    const bands = this.bands();
    const yScale = this.yScale();
    const zeroY = this.zeroY();
    const write = this.write();
    const labels = this.labels();
    const stacked = this.stack();
    return Array.from({ length: this.points() }, (_, index) => ({
      index,
      hitX: arenaBandStart(bands, index),
      midX: arenaBandCenter(bands, index),
      label: labels[index] ?? '',
      marks: stacked
        ? arenaStackSegments(series, index).map((segment) => {
          const one = series[segment.seriesIndex] as ArenaSeries;
          return {
            key: segment.seriesIndex,
            y: arenaScaleValue(yScale, segment.to),
            name: series.length > 1 ? `${one.label}: ` : '',
            path: arenaBarPath(arenaBandMark(bands, index), bands.band,
              arenaScaleValue(yScale, segment.to), arenaScaleValue(yScale, segment.from),
              segment.outer ? BAR_RADIUS : 0),
            color: arenaSeriesColors(one, this.points(), segment.seriesIndex + 1)[index],
            value: write(one.values[index] as number),
          };
        })
        : series.flatMap((one, s) => {
          const value = one.values[index];
          if (value === undefined) return [];
          const y = arenaScaleValue(yScale, value);
          const sub = arenaBandSubBand(bands, index, series.length, s, chartSeriesGap);
          return [{
            key: s,
            y,
            name: series.length > 1 ? `${one.label}: ` : '',
            path: arenaBarPath(sub.x, sub.width, y, zeroY, BAR_RADIUS),
            color: arenaSeriesColors(one, this.points(), s + 1)[index],
            value: write(value),
          }];
        }),
    }));
  });

  protected readonly legend = computed(() => {
    const series = this.series();
    if (this.strip().stripH === 0) return null;
    return series.map((one, index) => ({
      index,
      label: one.label,
      color: arenaSeriesColors(one, this.points(), index + 1)[0],
    }));
  });

  protected readonly table = computed(() => arenaChartTable(
    'Category', this.series(), this.labels(), this.write(),
  ));

  protected readonly active = computed(() => {
    const index = this.hover();
    const bar = index === null ? null : this.bars()[index] ?? null;
    if (!bar || bar.marks.length === 0) return null;
    const top = Math.min(...bar.marks.map((mark) => mark.y));
    return { ...bar, anchor: arenaTooltipAnchor(bar.midX, top) };
  });

  protected onPointer(event: PointerEvent, phase: string): void {
    if (!arenaPointerUpdates(event.pointerType, phase)) return;
    const box = (event.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    const index = arenaBandIndex(this.bands(), event.clientX - box.left);
    if (index >= 0) this.hover.set(index);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (arenaPointerClears(event.pointerType)) this.hover.set(null);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!arenaCursorHandles(event.key, 'x')) return;
    event.preventDefault();
    this.hover.set(arenaCursorStep(this.hover(), event.key, this.points(), 'x'));
  }

  constructor() {

    afterRenderEffect(() => {
      const rail = this.rail()?.nativeElement;
      if (!rail || !this.scrolls()) return;
      rail.scrollLeft = rail.scrollWidth - rail.clientWidth;
    });
  }
}
