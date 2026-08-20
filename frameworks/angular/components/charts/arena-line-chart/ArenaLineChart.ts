import {
  ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, booleanAttribute, computed,
  input, signal, viewChild,
} from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import { arenaWarnOnce } from '../../../WarnOnce';
import {
  ARENA_CHART_HEIGHT, ARENA_RAIL_STYLE, ARENA_SR_ONLY, arenaAreaFill, arenaPlotWidth, arenaValueWriter,
} from '../../../DataVisuals';
import {
  arenaLinearScale, arenaPointScale, arenaPointAt, arenaScaleValue, arenaNearestPointIndex,
} from '../ChartScales';
import { arenaLinePoints, arenaLineAreaPath, arenaCurvePath, arenaCurveAreaPath } from '../ChartMarks';
import { arenaPlotBox, arenaAxisModel, arenaTickLabelX, arenaCategoryLabelY, arenaValueGutter } from '../ChartAxis';
import { arenaChartTable, arenaSeriesColors, arenaSeriesDomain, arenaSeriesPointCount } from '../ChartSeries';
import { arenaTooltipAnchor } from '../ChartTooltip';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer';
import { arenaLegendStrip } from '../ChartLegend';
import { ARENA_TOOLTIP_STYLE, ARENA_TOOLTIP_LABEL_STYLE, ARENA_TOOLTIP_VALUE_STYLE } from '../ChartTooltipStyles';
import {
  ARENA_LEGEND_STRIP_STYLE, ARENA_LEGEND_ITEM_STYLE, ARENA_LEGEND_SWATCH_STYLE, ARENA_LEGEND_LABEL_STYLE,
} from '../ChartLegendStyles';
import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { chartPointR, chartPointRHover } from '../../../Tokens.generated';

const ASSUMED_WIDTH = 600;

const POINT_R = chartPointR;
const POINT_R_HOVER = chartPointRHover;

const LINE_STYLE = { strokeWidth: 'var(--bw)' } as const satisfies Readonly<Record<string, string>>;

const SERIES_STROKE_STYLE = { strokeWidth: 'var(--bw-strong)' } as const satisfies Readonly<Record<string, string>>;

const TICK_LABEL_STYLE = { fontSize: 'var(--dz-text-2xs)' } as const satisfies Readonly<Record<string, string>>;

const POINT_LABEL_STYLE = { fontSize: 'var(--dz-text-xs)' } as const satisfies Readonly<Record<string, string>>;




@Component({
  selector: 'arena-line-chart',
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
          <text [attr.x]="tickLabelX()" [attr.y]="tick.y" text-anchor="end" dominant-baseline="middle"
                fill="var(--text-muted)" font-family="var(--font-mono)"
                [style]="tickLabelStyle">{{ tick.label }}</text>
        </g>
      }
      <line [attr.x1]="plotLeft()" [attr.x2]="plotRight()" [attr.y1]="zeroY()" [attr.y2]="zeroY()"
            stroke="var(--line-strong)" [style]="lineStyle" />

      @if (fills()) {
        @for (line of lines(); track line.key) {
          @if (line.points.length > 0) {
            <path [attr.d]="line.areaPath" [attr.fill]="line.areaFill" stroke="none" />
          }
        }
      }

      @if (active(); as point) {
        <line [attr.x1]="point.x" [attr.x2]="point.x" [attr.y1]="plotTop()" [attr.y2]="plotBottom()"
              stroke="var(--border-strong)" stroke-dasharray="3 3" [style]="lineStyle" />
      }

      @for (line of lines(); track line.key) {
        @if (line.points.length > 1) {
          @if (curve()) {
            <path [attr.d]="line.curvePath" fill="none" [attr.stroke]="line.color"
                  stroke-linejoin="round" stroke-linecap="round" [style]="seriesStrokeStyle" />
          } @else {
            <polyline [attr.points]="line.polyline" fill="none" [attr.stroke]="line.color"
                      stroke-linejoin="round" stroke-linecap="round" [style]="seriesStrokeStyle" />
          }
        }
      }

      @for (mark of marks(); track mark.key) {
        <circle [attr.cx]="mark.x" [attr.cy]="mark.y"
                [attr.r]="hover() === mark.index ? pointRHover : pointR"
                [attr.fill]="mark.color" stroke="var(--surface-card)" [style]="seriesStrokeStyle" />
      }

      @for (point of axisPoints(); track point.index) {
        <text [attr.x]="point.x" [attr.y]="pointLabelY()" text-anchor="middle"
              fill="var(--text-muted)" font-family="var(--font-body)"
              [style]="pointLabelStyle">{{ point.label }}</text>
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
        @for (reading of point.readings; track reading.key) {
          <div [style]="tooltipValueStyle">{{ reading.name }}{{ reading.value }}</div>
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
export class ArenaLineChart {
  /** One label per point, in the same order as every series' `values`. A label with no value in a series ends that series' line there rather than dropping to zero. */
  readonly labels = input.required<readonly string[]>();
  /** The plotted series, drawn as one polyline each over the same ordered sequence. One series is the common case and draws exactly what it drew before. The area fill is refused past one series, because two fills occlude each other and the reader cannot tell which value either edge belongs to. */
  readonly series = input.required<readonly ArenaSeries[]>();
  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  readonly label = input.required<string>();
  /** Fill under the line at 18% of the series colour: a tint, never a gradient. For a single series; two fills occlude each other. */
  readonly area = input(false, { transform: booleanAttribute });
  /** Draw the series as a smooth curve rather than straight segments between points. The interpolation is monotone cubic, not Catmull-Rom, and that is the whole of the decision: a Catmull-Rom curve overshoots, so between two measured points it draws a peak or a trough nobody measured, and a chart that draws data which does not exist is the one thing a chart may not do. A monotone curve stays inside the band its own two points define, keeps a flat tangent at a turning point, and never crosses zero unless the values do. It changes the path string and nothing else: the points, the crosshair, the tooltip and the data cursor read the same numbers at the same places. */
  readonly curve = input(false, { transform: booleanAttribute });
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
  protected readonly seriesStrokeStyle = SERIES_STROKE_STYLE;
  protected readonly tickLabelStyle = TICK_LABEL_STYLE;
  protected readonly pointLabelStyle = POINT_LABEL_STYLE;
  protected readonly tooltipStyle = ARENA_TOOLTIP_STYLE;
  protected readonly tooltipLabelStyle = ARENA_TOOLTIP_LABEL_STYLE;
  protected readonly tooltipValueStyle = ARENA_TOOLTIP_VALUE_STYLE;
  protected readonly legendStripStyle = ARENA_LEGEND_STRIP_STYLE;
  protected readonly legendItemStyle = ARENA_LEGEND_ITEM_STYLE;
  protected readonly legendSwatchStyle = ARENA_LEGEND_SWATCH_STYLE;
  protected readonly legendLabelStyle = ARENA_LEGEND_LABEL_STYLE;
  protected readonly pointR = POINT_R;
  protected readonly pointRHover = POINT_R_HOVER;
  protected readonly tickLabelX = computed(() => arenaTickLabelX(this.gutter()));
  protected readonly pointLabelY = computed(() => arenaCategoryLabelY(this.strip().plotH));
  protected readonly hover = signal<number | null>(null);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly measured = arenaContainerWidth();

  private readonly available = computed(() => this.measured() ?? ASSUMED_WIDTH);

  protected readonly width = computed(
    () => arenaPlotWidth(this.available(), this.pointCount(), this.minPointSpacing()),
  );

  protected readonly scrolls = computed(() => this.width() > this.available());

  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  protected readonly colors = computed(
    () => this.series().map((one, index) => arenaSeriesColors(one, 1, index + 1)[0] as string),
  );

  protected readonly fills = computed(() => {
    if (this.area() && this.series().length > 1) {
      arenaWarnOnce('ArenaLineChart: `area` is for a single series. Two fills occlude each other and the reader cannot tell which value either edge belongs to, so none is drawn.');
      return false;
    }
    return this.area();
  });

  protected readonly name = computed(() => {
    return `${this.label()} — line chart`;
  });

  private readonly domain = computed(() => arenaSeriesDomain(this.series()));
  protected readonly pointCount = computed(() => arenaSeriesPointCount(this.series()));
  private readonly strip = computed(() => arenaLegendStrip(this.height(), this.series().length));
  protected readonly plotH = computed(() => this.strip().plotH);
  protected readonly stripH = computed(() => this.strip().stripH);
  private readonly gutter = computed(() => arenaValueGutter(this.domain(), this.write()));

  private readonly box = computed(() => arenaPlotBox(this.width(), this.strip().plotH, this.gutter()));
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

  private readonly xScale = computed(() => {
    const box = this.box();
    return arenaPointScale(this.pointCount(), box.x, box.w);
  });

  private readonly axis = computed(() => arenaAxisModel(this.yScale(), this.domain(), this.write()));

  protected readonly zeroY = computed(() => this.axis().zeroY);
  protected readonly plotBottom = computed(() => this.box().y + this.box().h);
  protected readonly gridLines = computed(() => this.axis().ticks);

  protected readonly lines = computed(() => {
    const yScale = this.yScale();
    const xScale = this.xScale();
    const colors = this.colors();
    const zeroY = this.zeroY();
    const curved = this.curve();
    return this.series().map((one, index) => {
      const points = one.values.map((value, i) => ({ x: arenaPointAt(xScale, i), y: arenaScaleValue(yScale, value) }));
      return {
        key: index,
        color: colors[index],
        polyline: arenaLinePoints(points),
        curvePath: arenaCurvePath(points),
        areaPath: curved ? arenaCurveAreaPath(points, zeroY) : arenaLineAreaPath(points, zeroY),
        areaFill: arenaAreaFill(colors[index] as string),
        points,
      };
    });
  });

  protected readonly marks = computed(() => this.lines().flatMap(
    (line) => line.points.map((point, index) => ({ key: `${line.key}-${index}`, index, x: point.x, y: point.y, color: line.color })),
  ));

  protected readonly axisPoints = computed(() => {
    const xScale = this.xScale();
    const labels = this.labels();
    const count = this.pointCount();
    return Array.from({ length: count }, (_, index) => ({ index, x: arenaPointAt(xScale, index), label: labels[index] ?? '' }));
  });

  protected readonly legend = computed(() => {
    if (this.strip().stripH === 0) return null;
    const colors = this.colors();
    return this.series().map((one, index) => ({ index, label: one.label, color: colors[index] }));
  });

  protected readonly table = computed(() => arenaChartTable(
    'Point', this.series(), this.labels(), this.write(),
  ));

  protected readonly active = computed(() => {
    const index = this.hover();
    if (index === null || index >= this.pointCount()) return null;
    const yScale = this.yScale();
    const readings = this.series().flatMap((one, key) => {
      const value = one.values[index];
      return value === undefined ? [] : [{
        key,
        y: arenaScaleValue(yScale, value),
        name: this.series().length > 1 ? `${one.label}: ` : '',
        value: this.write()(value),
      }];
    });
    if (readings.length === 0) return null;
    const x = arenaPointAt(this.xScale(), index);
    return {
      x,
      label: this.labels()[index] ?? '',
      readings,
      anchor: arenaTooltipAnchor(x, Math.min(...readings.map((one) => one.y))),
    };
  });

  constructor() {

    afterRenderEffect(() => {
      const rail = this.rail()?.nativeElement;
      if (!rail || !this.scrolls()) return;
      rail.scrollLeft = rail.scrollWidth - rail.clientWidth;
    });
  }

  protected onPointer(event: PointerEvent, phase: string): void {
    if (!arenaPointerUpdates(event.pointerType, phase)) return;

    const box = (event.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    const xScale = this.xScale();
    const across = Array.from({ length: this.pointCount() }, (_, i) => ({ x: arenaPointAt(xScale, i), y: 0 }));
    const index = arenaNearestPointIndex(across, event.clientX - box.left);
    if (index >= 0) this.hover.set(index);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (arenaPointerClears(event.pointerType)) this.hover.set(null);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!arenaCursorHandles(event.key, 'x')) return;
    event.preventDefault();
    this.hover.set(arenaCursorStep(this.hover(), event.key, this.pointCount(), 'x'));
  }
}
