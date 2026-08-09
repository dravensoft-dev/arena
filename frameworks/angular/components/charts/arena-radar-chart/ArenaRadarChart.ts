import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, input, signal,
} from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import {
  ARENA_CHART_HEIGHT, ARENA_SR_ONLY, arenaAreaFill, arenaValueWriter,
} from '../../../DataVisuals';
import { arenaLinearScale, arenaScaleValue } from '../ChartScales';
import { arenaLinePoints } from '../ChartMarks';
import {
  arenaPolarPoint, arenaPolarIndex, arenaPolarAnchor, arenaRadarRings, arenaRadarRadius, arenaRadarLabelRadius,
} from '../ChartPolar';
import {
  arenaChartTable, arenaSeriesColors, arenaSeriesPointCount, arenaRadarDomain,
} from '../ChartSeries';
import { arenaLegendStrip } from '../ChartLegend';
import { arenaTooltipAnchor } from '../ChartTooltip';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer';
import { ARENA_TOOLTIP_STYLE, ARENA_TOOLTIP_LABEL_STYLE, ARENA_TOOLTIP_VALUE_STYLE } from '../ChartTooltipStyles';
import {
  ARENA_LEGEND_STRIP_STYLE, ARENA_LEGEND_ITEM_STYLE, ARENA_LEGEND_SWATCH_STYLE, ARENA_LEGEND_LABEL_STYLE,
} from '../ChartLegendStyles';
import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { chartPointR, chartPointRHover } from '../../../Tokens.generated';

const ASSUMED_WIDTH = 600;

const REGION_STYLE = { display: 'block', outlineOffset: 'var(--focus-offset)' } as const satisfies Readonly<Record<string, string>>;

const LINE_STYLE = { strokeWidth: 'var(--bw)' } as const satisfies Readonly<Record<string, string>>;

const CATEGORY_LABEL_STYLE = { fontSize: 'var(--fs-xs)' } as const satisfies Readonly<Record<string, string>>;

const SERIES_STROKE_STYLE = { strokeWidth: 'var(--bw-strong)' } as const satisfies Readonly<Record<string, string>>;




@Component({
  selector: 'arena-radar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display:block;position:relative;width:100%',
    '[style.height.px]': 'height()',
  },
  template: `
    <div [style]="regionStyle" tabindex="0" role="group" [attr.aria-label]="name()"
         (keydown)="onKey($event)">
    <svg width="100%" [attr.height]="plotH()" role="img" [attr.aria-label]="name()"
         style="display:block;overflow:visible">
      @for (ring of rings(); track ring.value) {
        <polygon [attr.points]="ring.points" fill="none" stroke="var(--border)" [style]="lineStyle" />
      }

      @for (spoke of spokes(); track spoke.index) {
        <line [attr.x1]="centreX()" [attr.y1]="centreY()" [attr.x2]="spoke.x" [attr.y2]="spoke.y"
              [attr.stroke]="hover() === spoke.index ? 'var(--border-strong)' : 'var(--border)'"
              [style]="lineStyle" />
      }

      @if (fill()) {
        @for (shape of shapes(); track shape.key) {
          <polygon [attr.points]="shape.points" stroke="none" [attr.fill]="shape.areaFill" />
        }
      }

      @for (shape of shapes(); track shape.key) {
        <polygon [attr.points]="shape.points" fill="none" [attr.stroke]="shape.color"
                 stroke-linejoin="round" [style]="seriesStrokeStyle" />
      }

      @for (mark of marks(); track mark.key) {
        <circle [attr.cx]="mark.x" [attr.cy]="mark.y"
                [attr.r]="hover() === mark.axis ? pointRHover : pointR"
                [attr.fill]="mark.color" stroke="var(--surface-card)" [style]="seriesStrokeStyle" />
      }

      @for (spoke of spokes(); track spoke.index) {
        <text [attr.x]="spoke.labelX" [attr.y]="spoke.labelY" [attr.text-anchor]="spoke.anchor"
              dominant-baseline="middle"
              fill="var(--text-muted)" font-family="var(--font-body)"
              [style]="categoryLabelStyle">{{ spoke.label }}</text>
      }

      <rect x="0" y="0" width="100%" [attr.height]="plotH()" fill="transparent"
            (pointermove)="onPointer($event, 'move')" (pointerdown)="onPointer($event, 'down')"
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
export class ArenaRadarChart {
  /** One label per axis, in the same order as every series' `values`, running clockwise from 12 o'clock. Keep the count small: past eight or so the labels collide and the shape stops being readable, which is a limit of the form rather than of the drawing. */
  readonly labels = input.required<readonly string[]>();
  /** The plotted series, drawn as one closed polygon each over the same axes. The shape is the reading, so two or three series is the useful case and more is a tangle. The ramp clamps at its last slot rather than cycling. */
  readonly series = input.required<readonly ArenaSeries[]>();
  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing. */
  readonly label = input.required<string>();
  /** Fill each polygon at 18% of its series colour: a tint, never a gradient. Useful for one series, where the filled area reads as a footprint. Past one the fills overlap and the reader cannot tell which polygon an overlap belongs to, so leave it off and let the outlines carry the shape. */
  readonly fill = input(false, { transform: booleanAttribute });
  /** Appended verbatim to every number the chart draws: the tooltip and the accessible table. Carries its own leading space if one is wanted. */
  readonly valueSuffix = input<string>();
  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. */
  readonly valuePrefix = input<string>();
  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** The plot's height in px, the --chart-height token by default. The grid is a circle inscribed in the smaller of the plot's two axes, so this also caps how wide the shape gets. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  readonly height = input<number, number | undefined>(
    ARENA_CHART_HEIGHT,
    { transform: (value) => value ?? ARENA_CHART_HEIGHT },
  );

  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly regionStyle = REGION_STYLE;
  protected readonly lineStyle = LINE_STYLE;
  protected readonly seriesStrokeStyle = SERIES_STROKE_STYLE;
  protected readonly categoryLabelStyle = CATEGORY_LABEL_STYLE;
  protected readonly tooltipStyle = ARENA_TOOLTIP_STYLE;
  protected readonly tooltipLabelStyle = ARENA_TOOLTIP_LABEL_STYLE;
  protected readonly tooltipValueStyle = ARENA_TOOLTIP_VALUE_STYLE;
  protected readonly legendStripStyle = ARENA_LEGEND_STRIP_STYLE;
  protected readonly legendItemStyle = ARENA_LEGEND_ITEM_STYLE;
  protected readonly legendSwatchStyle = ARENA_LEGEND_SWATCH_STYLE;
  protected readonly legendLabelStyle = ARENA_LEGEND_LABEL_STYLE;
  protected readonly pointR = chartPointR;
  protected readonly pointRHover = chartPointRHover;
  protected readonly hover = signal<number | null>(null);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly measured = arenaContainerWidth();
  private readonly width = computed(() => this.measured() ?? ASSUMED_WIDTH);

  protected readonly name = computed(() => {
    return `${this.label()} — radar chart`;
  });

  private readonly axes = computed(() => arenaSeriesPointCount(this.series()));
  private readonly domain = computed(() => arenaRadarDomain(this.series()));
  private readonly strip = computed(() => arenaLegendStrip(this.height(), this.series().length));
  protected readonly plotH = computed(() => this.strip().plotH);
  protected readonly stripH = computed(() => this.strip().stripH);
  protected readonly centreX = computed(() => this.width() / 2);
  protected readonly centreY = computed(() => this.strip().plotH / 2);
  private readonly outer = computed(() => arenaRadarRadius(this.width(), this.strip().plotH));
  private readonly labelR = computed(() => arenaRadarLabelRadius(this.width(), this.strip().plotH));

  private readonly radial = computed(() => arenaLinearScale(this.domain().min, this.domain().max, 0, this.outer()));

  private readonly reach = computed(() => {
    const radial = this.radial();
    return (value: number) => Math.max(0, arenaScaleValue(radial, value));
  });

  protected readonly colors = computed(
    () => this.series().map((one, index) => arenaSeriesColors(one, 1, index + 1)[0] as string),
  );

  protected readonly rings = computed(() => {
    const cx = this.centreX();
    const cy = this.centreY();
    const count = this.axes();
    const reach = this.reach();
    return arenaRadarRings(this.domain()).map((value) => ({
      value,
      points: arenaLinePoints(Array.from({ length: count }, (_, a) => arenaPolarPoint(cx, cy, reach(value), a, count))),
    }));
  });

  protected readonly spokes = computed(() => {
    const cx = this.centreX();
    const cy = this.centreY();
    const count = this.axes();
    const outer = this.outer();
    const labels = this.labels();
    const labelR = this.labelR();
    return Array.from({ length: count }, (_, index) => {
      const tip = arenaPolarPoint(cx, cy, outer, index, count);
      const at = arenaPolarPoint(cx, cy, labelR, index, count);
      return {
        index, x: tip.x, y: tip.y, label: labels[index] ?? '',
        labelX: at.x, labelY: at.y, anchor: arenaPolarAnchor(index, count),
      };
    });
  });

  protected readonly shapes = computed(() => {
    const cx = this.centreX();
    const cy = this.centreY();
    const count = this.axes();
    const reach = this.reach();
    const colors = this.colors();
    return this.series().map((one, index) => ({
      key: index,
      color: colors[index],
      areaFill: arenaAreaFill(colors[index] as string),
      points: arenaLinePoints(Array.from({ length: count },
        (_, a) => arenaPolarPoint(cx, cy, reach(one.values[a] ?? 0), a, count))),
    }));
  });

  protected readonly marks = computed(() => {
    const cx = this.centreX();
    const cy = this.centreY();
    const count = this.axes();
    const reach = this.reach();
    const colors = this.colors();
    return this.series().flatMap((one, index) => Array.from({ length: count }, (_, a) => ({ one, index, a }))
      .flatMap(({ a }) => {
        const value = one.values[a];
        if (value === undefined) return [];
        const at = arenaPolarPoint(cx, cy, reach(value), a, count);
        return [{ key: `${index}-${a}`, axis: a, x: at.x, y: at.y, color: colors[index] }];
      }));
  });

  protected readonly legend = computed(() => {
    if (this.strip().stripH === 0) return null;
    const colors = this.colors();
    return this.series().map((one, index) => ({ index, label: one.label, color: colors[index] }));
  });

  protected readonly table = computed(() => arenaChartTable(
    'Axis', this.series(), this.labels(), this.write(),
  ));

  protected readonly active = computed(() => {
    const index = this.hover();
    if (index === null || index >= this.axes()) return null;
    const write = this.write();
    const tip = arenaPolarPoint(this.centreX(), this.centreY(), this.outer(), index, this.axes());
    const many = this.series().length > 1;
    return {
      label: this.labels()[index] ?? '',
      anchor: arenaTooltipAnchor(tip.x, tip.y),
      readings: this.series().flatMap((one, s) => {
        const value = one.values[index];
        if (value === undefined) return [];
        return [{ key: s, name: many ? `${one.label}: ` : '', value: write(value) }];
      }),
    };
  });

  protected onPointer(event: PointerEvent, phase: string): void {
    if (!arenaPointerUpdates(event.pointerType, phase)) return;
    const box = (event.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    const index = arenaPolarIndex(this.centreX(), this.centreY(),
      event.clientX - box.left, event.clientY - box.top, this.axes());
    if (index >= 0) this.hover.set(index);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (arenaPointerClears(event.pointerType)) this.hover.set(null);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!arenaCursorHandles(event.key, 'x')) return;
    event.preventDefault();
    this.hover.set(arenaCursorStep(this.hover(), event.key, this.axes(), 'x'));
  }
}
