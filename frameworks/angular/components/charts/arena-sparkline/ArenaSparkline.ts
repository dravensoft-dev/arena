import {
  booleanAttribute, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild,
} from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import { ARENA_SR_ONLY, arenaAreaFill, arenaValueWriter, arenaCatRotate } from '../../../DataVisuals';
import { arenaLinearScale, arenaPointScale, arenaPointAt, arenaScaleValue, arenaNearestPointIndex } from '../ChartScales';
import { arenaLinePoints, arenaLineAreaPath, arenaCurvePath, arenaCurveAreaPath } from '../ChartMarks';
import { arenaSparkBox, arenaSparkTooltipTop, arenaTooltipShift } from '../ChartAxis';
import { arenaChartTable, arenaOneSeries, arenaSeriesColors, arenaSparkDomain } from '../ChartSeries';
import { arenaTooltipAnchor } from '../ChartTooltip';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer';
import { arenaSparklineStyles } from './ArenaSparkline.variants';
import manifest from './ArenaSparkline.classes.generated';
import type { ArenaCatSlot, ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { chartPointR, chartPointRHover, chartSparklineHeight } from '../../../Tokens.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { arenaPhrase } from '../../../Phrase';

const ASSUMED_WIDTH = 600;

const PLOT_STYLE = { display: 'block', outlineOffset: 'var(--focus-offset)' } as const satisfies Readonly<Record<string, string>>;

const REGION_STYLE = {
  display: 'flex', alignItems: 'center', minHeight: 'var(--dz-ctl-h-sm)', outlineOffset: 'var(--focus-offset)',
} as const satisfies Readonly<Record<string, string>>;

const LINE_STYLE = { strokeWidth: 'var(--bw)' } as const satisfies Readonly<Record<string, string>>;

const SERIES_STROKE_STYLE = { strokeWidth: 'var(--bw-strong)' } as const satisfies Readonly<Record<string, string>>;

@Component({
  selector: 'arena-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <div #frame [class]="styles.frame()" [attr.data-arena-part]="parts.frame" [style.height.px]="interactive() ? null : height()">
    <div [style]="interactive() ? regionStyle : plotStyle" [attr.tabindex]="interactive() ? 0 : null" [attr.role]="interactive() ? 'group' : null"
         [attr.aria-label]="interactive() ? name() : null" (keydown)="onKey($event)">
    <svg width="100%" [attr.height]="height()" role="img" [attr.aria-label]="name()" style="display:block;overflow:visible">
      @if (area() && points().length > 0) {
        <path [attr.d]="areaPath()" [attr.fill]="areaFill()" stroke="none" />
      }

      @if (active(); as point) {
        <line [attr.x1]="point.x" [attr.x2]="point.x" [attr.y1]="plotTop()" [attr.y2]="floor()"
              stroke="var(--edge-axis)" stroke-dasharray="3 3" [style]="lineStyle" />
      }

      @if (points().length > 1) {
        @if (curve()) {
          <path [attr.d]="curvePath()" fill="none" [attr.stroke]="color()"
                stroke-linejoin="round" stroke-linecap="round" [style]="seriesStrokeStyle" />
        } @else {
          <polyline [attr.points]="polyline()" fill="none" [attr.stroke]="color()"
                    stroke-linejoin="round" stroke-linecap="round" [style]="seriesStrokeStyle" />
        }
      }

      @if (endDot(); as dot) {
        <circle [attr.cx]="dot.x" [attr.cy]="dot.y" [attr.r]="pointR"
                [attr.fill]="color()" stroke="var(--fill-surface)" [style]="seriesStrokeStyle" />
      }

      @if (active(); as point) {
        <circle [attr.cx]="point.x" [attr.cy]="point.y" [attr.r]="pointRHover"
                [attr.fill]="color()" stroke="var(--fill-surface)" [style]="seriesStrokeStyle" />
      }

      @if (interactive()) {
        <rect x="0" y="0" width="100%" [attr.height]="height()" fill="transparent"
              (pointermove)="onPointer($event, 'move')" (pointerdown)="onPointer($event, 'down')"
              (pointerleave)="onPointerLeave($event)" (pointercancel)="hover.set(null)" />
      }
    </svg>
    </div>

    @if (active(); as point) {
      <div [class]="styles.tooltip()" [attr.data-arena-part]="parts.tooltip" [style.left.px]="point.anchor.left" [style.top]="point.top"
           [style.--arena-sparkline-shift]="point.shift">
        <div [class]="styles.tooltipLabel()" [attr.data-arena-part]="parts.tooltipLabel">{{ point.label }}</div>
        <div [class]="styles.tooltipValue()" [attr.data-arena-part]="parts.tooltipValue">{{ point.value }}</div>
      </div>
    }

    <div [style]="arenaSrOnly">
      <table>
        <caption>{{ name() }}</caption>
        <thead><tr>@for (column of table().columns; track $index) { <th>{{ column }}</th> }</tr></thead>
        <tbody>
          @for (row of table().rows; track $index) {
            <tr><th scope="row">{{ row.header }}</th>@for (cell of row.cells; track $index) { <td>{{ cell }}</td> }</tr>
          }
        </tbody>
      </table>
    </div>
    </div>
  `,
})
export class ArenaSparkline {
  protected readonly locale = inject(ARENA_LOCALE);
  /** One label per point, in the order of the series' `values`. A label heads its row of the hidden table and the tooltip. A label with no value ends the line there rather than dropping it to zero. */
  readonly labels = input.required<readonly string[]>();
  /** The series drawn, exactly one. A second warns and is ignored, because a sparkline has no legend to say which line is which. `tone` is the only trend colour; without it the line takes the identity colour of the slot `colorStart` names, which says nothing about whether the trend is good. */
  readonly series = input.required<readonly ArenaSeries[]>();

  /** The ramp slot the line takes when its series names no colour of its own. Absent, 1. */
  readonly colorStart = input<ArenaCatSlot, ArenaCatSlot | undefined>(
    1,
    { transform: (value) => value ?? 1 },
  );
  /** Names the sparkline for its accessible name and for the caption of its data table. Required and guarded rather than defaulted: a table cell holding six sparklines needs six distinct names, and a fallback of the chart type would announce all six identically. */
  readonly label = input.required<string>();
  /** Fill under the line at 18% of the series colour: a tint, never a gradient. The fill reaches the floor of the box, which is the lowest value and not zero. The fill therefore shades the shape and measures nothing. */
  readonly area = input(false, { transform: booleanAttribute });
  /** Draw the series as a smooth curve rather than straight segments between points. The interpolation is monotone cubic, not Catmull-Rom. A Catmull-Rom curve overshoots and draws a peak or a trough nobody measured. A monotone curve stays inside the band its own two points define. The curve changes the path string and nothing else. */
  readonly curve = input(false, { transform: booleanAttribute });
  /** Whether the plot answers the pointer and the keyboard: one tab stop whose arrow keys move a data cursor, a crosshair, an enlarged dot and a tooltip. Off by default, because the common place of a sparkline is a table cell, where every interactive one adds a tab stop to the page. A declared boolean rather than one derived from a bound listener, because a sparkline reports nothing to listen to. */
  readonly interactive = input(false, { transform: booleanAttribute });
  /** Appended verbatim to every number the sparkline writes: the tooltip and the accessible table. Carries its own leading space if one is wanted. */
  readonly valueSuffix = input<string>();
  /** Drawn verbatim before every number the sparkline writes, as valueSuffix is drawn after it, for a currency that precedes its amount. */
  readonly valuePrefix = input<string>();
  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** The plot's height in px, the --chart-sparkline-height token by default. That token is the line box of a compact table row, so a sparkline in a cell leaves the row the height its text gives it. A number rather than a dimension string, because the sparkline does arithmetic with it to place every point. */
  readonly height = input<number, number | undefined>(
    chartSparklineHeight,
    { transform: (value) => value ?? chartSparklineHeight },
  );

  protected readonly parts = manifest.parts;
  protected readonly styles = arenaSparklineStyles();
  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly plotStyle = PLOT_STYLE;
  protected readonly regionStyle = REGION_STYLE;
  protected readonly lineStyle = LINE_STYLE;
  protected readonly seriesStrokeStyle = SERIES_STROKE_STYLE;
  protected readonly pointR = chartPointR;
  protected readonly pointRHover = chartPointRHover;
  protected readonly hover = signal<number | null>(null);

  private readonly frame = viewChild<ElementRef<HTMLElement>>('frame');
  private readonly measured = arenaContainerWidth(() => this.frame()?.nativeElement);
  private readonly width = computed(() => this.measured() ?? ASSUMED_WIDTH);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly one = computed(
    () => arenaOneSeries(this.series(), 'ArenaSparkline', 'A sparkline has no legend to tell two lines apart'),
  );

  protected readonly name = computed(() => {
    const label = this.label();
    if (!label) throw new Error('ArenaSparkline: `label` is required (it names the sparkline for the accessible name, and nothing can derive that)');
    return arenaPhrase(this.locale.sparklineChartName, { label });
  });
  protected readonly color = computed(() => arenaSeriesColors(this.one(), 1, arenaCatRotate(this.colorStart(), 0), 'ArenaSparkline', this.colorStart())[0] as string);
  protected readonly areaFill = computed(() => arenaAreaFill(this.color()));

  private readonly box = computed(() => arenaSparkBox(this.width(), this.height()));
  protected readonly plotTop = computed(() => this.box().y);
  protected readonly floor = computed(() => this.box().y + this.box().h);

  protected readonly points = computed(() => {
    const values = this.one().values;
    const box = this.box();
    const domain = arenaSparkDomain(values);
    const yScale = arenaLinearScale(domain.min, domain.max, box.y + box.h, box.y);
    const xScale = arenaPointScale(values.length, box.x, box.w);
    return values.map((value, i) => ({ x: arenaPointAt(xScale, i), y: arenaScaleValue(yScale, value) }));
  });

  protected readonly polyline = computed(() => arenaLinePoints(this.points()));
  protected readonly curvePath = computed(() => arenaCurvePath(this.points()));
  protected readonly areaPath = computed(() => (this.curve()
    ? arenaCurveAreaPath(this.points(), this.floor())
    : arenaLineAreaPath(this.points(), this.floor())));

  protected readonly table = computed(() => arenaChartTable(
    this.locale.chartTablePoint, [this.one()], this.labels(), this.write(),
  ));

  private readonly cursor = computed(() => {
    const index = this.hover();
    return this.interactive() && index !== null && index < this.points().length ? index : null;
  });

  protected readonly endDot = computed(() => {
    const points = this.points();
    const last = points.length - 1;
    return last < 0 || this.cursor() === last ? null : points[last];
  });

  protected readonly active = computed(() => {
    const index = this.cursor();
    if (index === null) return null;
    const point = this.points()[index]!;
    return {
      x: point.x,
      y: point.y,
      label: this.labels()[index] ?? '',
      value: this.write()(this.one().values[index] as number),
      anchor: arenaTooltipAnchor(point.x, point.y),
      top: arenaSparkTooltipTop(point.y, this.height()),
      shift: arenaTooltipShift(point.x, this.box()),
    };
  });

  protected onPointer(event: PointerEvent, phase: string): void {
    if (!this.points().length || !arenaPointerUpdates(event.pointerType, phase)) return;

    const box = (event.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    const index = arenaNearestPointIndex(this.points(), event.clientX - box.left);
    if (index >= 0) this.hover.set(index);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (arenaPointerClears(event.pointerType)) this.hover.set(null);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.interactive() || !arenaCursorHandles(event.key, 'x')) return;
    event.preventDefault();
    this.hover.set(arenaCursorStep(this.hover(), event.key, this.points().length, 'x'));
  }
}
