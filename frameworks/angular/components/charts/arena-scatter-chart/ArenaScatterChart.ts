import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, input, signal,
} from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import { ARENA_CHART_HEIGHT, ARENA_SR_ONLY, arenaValueWriter } from '../../../DataVisuals';
import {
  arenaLinearScale, arenaScaleValue, arenaNearestPoint, arenaRadiusScale, arenaRadiusAt,
} from '../ChartScales';
import { arenaPlotBox, arenaAxisModel, arenaAxisModelX, arenaTickLabelX, arenaCategoryLabelY } from '../ChartAxis';
import {
  arenaPointCount, arenaPointSeriesDomain, arenaPointSeriesColor, arenaPointTable,
  arenaPointSized, arenaPointSizeRange,
} from '../ChartSeries';
import { arenaLegendStrip } from '../ChartLegend';
import { arenaTooltipAnchor } from '../ChartTooltip';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer';
import { ARENA_TOOLTIP_STYLE, ARENA_TOOLTIP_LABEL_STYLE, ARENA_TOOLTIP_VALUE_STYLE } from '../ChartTooltipStyles';
import {
  ARENA_LEGEND_STRIP_STYLE, ARENA_LEGEND_ITEM_STYLE, ARENA_LEGEND_SWATCH_STYLE, ARENA_LEGEND_LABEL_STYLE,
} from '../ChartLegendStyles';
import type { ArenaNumberFormat, ArenaPointSeries } from '../../../Api.generated';
import { chartPointR, chartPointRHover } from '../../../Tokens.generated';

const ASSUMED_WIDTH = 600;

const REGION_STYLE = { display: 'block', outlineOffset: 'var(--focus-offset)' } as const satisfies Readonly<Record<string, string>>;

const LINE_STYLE = { strokeWidth: 'var(--bw)' } as const satisfies Readonly<Record<string, string>>;

const TICK_LABEL_STYLE = { fontSize: 'var(--dz-text-2xs)' } as const satisfies Readonly<Record<string, string>>;

const MARK_STYLE = {
  strokeWidth: 'var(--bw-strong)', transition: 'opacity var(--dur-fast) var(--ease-out)',
} as const satisfies Readonly<Record<string, string>>;




@Component({
  selector: 'arena-scatter-chart',
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
      @for (tick of yTicks(); track tick.value) {
        <g>
          <line [attr.x1]="plotLeft()" [attr.x2]="plotRight()" [attr.y1]="tick.y" [attr.y2]="tick.y"
                stroke="var(--border)" [style]="lineStyle" />
          <text [attr.x]="tickLabelX" [attr.y]="tick.y" text-anchor="end" dominant-baseline="middle"
                fill="var(--text-muted)" font-family="var(--font-mono)"
                [style]="tickLabelStyle">{{ tick.label }}</text>
        </g>
      }

      @for (tick of xTicks(); track tick.value) {
        <text [attr.x]="tick.x" [attr.y]="xLabelY()" text-anchor="middle"
              fill="var(--text-muted)" font-family="var(--font-mono)"
              [style]="tickLabelStyle">{{ tick.label }}</text>
      }

      <line [attr.x1]="plotLeft()" [attr.x2]="plotRight()" [attr.y1]="zeroY()" [attr.y2]="zeroY()"
            stroke="var(--line-strong)" [style]="lineStyle" />
      <line [attr.x1]="zeroX()" [attr.x2]="zeroX()" [attr.y1]="plotTop()" [attr.y2]="plotBottom()"
            stroke="var(--line-strong)" [style]="lineStyle" />

      @for (mark of marks(); track mark.key) {
        <circle [attr.cx]="mark.cx" [attr.cy]="mark.cy"
                [attr.r]="hover() === mark.key ? mark.r + (pointRHover - pointR) : mark.r"
                [attr.fill]="mark.color" stroke="var(--surface-card)"
                [attr.opacity]="hover() === null || hover() === mark.key ? 1 : 0.55"
                [style]="markStyle" />
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

    @if (sizeKey(); as keys) {
      <div aria-hidden="true" [style]="legendStripStyle" [style.height.px]="sizeH()">
        @for (key of keys; track key.index) {
          <span [style]="legendItemStyle">
            <svg [attr.width]="sizeH()" [attr.height]="sizeH()" style="display:block;flex-shrink:0">
              <circle [attr.cx]="sizeH() / 2" [attr.cy]="sizeH() / 2" [attr.r]="key.r"
                      fill="none" stroke="var(--border-strong)" [style]="lineStyle" />
            </svg>
            <span [style]="legendLabelStyle">{{ key.label }}</span>
          </span>
        }
      </div>
    }

    @if (active(); as point) {
      <div [style]="tooltipStyle" [style.left.px]="point.anchor.left" [style.top]="point.anchor.top">
        <div [style]="tooltipLabelStyle">{{ point.series }}</div>
        <div [style]="tooltipValueStyle">{{ xLabel() }}: {{ point.x }}</div>
        <div [style]="tooltipValueStyle">{{ yLabel() }}: {{ point.y }}</div>
        @if (point.size) {
          <div [style]="tooltipValueStyle">{{ sizeLabel() }}: {{ point.size }}</div>
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
export class ArenaScatterChart {
  /** The plotted series, drawn as one cloud of marks each. Each carries pairs rather than indexed values, because a scatter has no categories to index against: that is what ArenaPointSeries is for and why it is a separate type from ArenaSeries. The ramp clamps at its last slot rather than cycling. */
  readonly series = input.required<readonly ArenaPointSeries[]>();
  /** Names the chart for its accessible name and for the caption of its data table. This is the CHART's name, not a series': a series names itself. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing. */
  readonly label = input.required<string>();
  /** Names the horizontal quantity, for the accessible table's column. Required, because unlike every other chart here both axes carry a quantity a reader cannot derive: a bar chart's categories name themselves through `labels` and its value axis is the one thing being measured, while a scatter measures two things and a table of bare X and Y columns says which is which to nobody. */
  readonly xLabel = input.required<string>();
  /** Names the vertical quantity, for the accessible table's column. Required for the reason xLabel is. */
  readonly yLabel = input.required<string>();
  /** Names the quantity a series' `r` carries, for the accessible table's third column. Required as soon as any series carries one, and guarded at render rather than declared required, because a scatter with no sizes has no third quantity to name and a member that is required only sometimes cannot say so in a contract. A column headed "Size" would satisfy the table mechanically and tell a reader nothing, which is the same reason `label` is guarded. */
  readonly sizeLabel = input<string>();
  /** Draw a key of three sample bubbles, at the smallest, middle and largest size the data carries, under the series names. Without it a reader can see that one blot is bigger and cannot say by how much, because area is the one encoding nobody reads off a scale by eye. It costs plot height, like the series strip and for the same reason, and it is off by default so a scatter with no sizes never pays for it. */
  readonly sizeLegend = input(false, { transform: booleanAttribute });
  /** Appended verbatim to every number the chart draws: both axes' ticks, the tooltip and the accessible table. Carries its own leading space if one is wanted. It reaches BOTH axes, so leave it off when the two quantities are not in the same unit, which on a scatter is the common case. */
  readonly valueSuffix = input<string>();
  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it, and on both axes for the same reason. */
  readonly valuePrefix = input<string>();
  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** The plot's height in px, the --chart-height token by default. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  readonly height = input<number, number | undefined>(
    ARENA_CHART_HEIGHT,
    { transform: (value) => value ?? ARENA_CHART_HEIGHT },
  );

  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly regionStyle = REGION_STYLE;
  protected readonly lineStyle = LINE_STYLE;
  protected readonly tickLabelStyle = TICK_LABEL_STYLE;
  protected readonly markStyle = MARK_STYLE;
  protected readonly tooltipStyle = ARENA_TOOLTIP_STYLE;
  protected readonly tooltipLabelStyle = ARENA_TOOLTIP_LABEL_STYLE;
  protected readonly tooltipValueStyle = ARENA_TOOLTIP_VALUE_STYLE;
  protected readonly legendStripStyle = ARENA_LEGEND_STRIP_STYLE;
  protected readonly legendItemStyle = ARENA_LEGEND_ITEM_STYLE;
  protected readonly legendSwatchStyle = ARENA_LEGEND_SWATCH_STYLE;
  protected readonly legendLabelStyle = ARENA_LEGEND_LABEL_STYLE;
  protected readonly tickLabelX = arenaTickLabelX();
  protected readonly pointR = chartPointR;
  protected readonly pointRHover = chartPointRHover;
  protected readonly hover = signal<number | null>(null);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly measured = arenaContainerWidth();
  private readonly width = computed(() => this.measured() ?? ASSUMED_WIDTH);

  protected readonly name = computed(() => {
    return `${this.label()} — scatter chart`;
  });

  private readonly domains = computed(() => arenaPointSeriesDomain(this.series()));
  protected readonly sized = computed(() => arenaPointSized(this.series()));
  private readonly sizes = computed(() => arenaPointSizeRange(this.series()));
  private readonly rScale = computed(() => arenaRadiusScale(this.sizes().min, this.sizes().max));
  protected readonly showsKey = computed(() => this.sized() && this.sizeLegend());
  private readonly strip = computed(
    () => arenaLegendStrip(this.height(), this.series().length, this.showsKey()),
  );
  protected readonly sizeH = computed(() => this.strip().sizeH);

  protected readonly sizeKey = computed(() => {
    if (!this.showsKey()) return null;
    const scale = this.rScale();
    const write = this.write();
    const { min, max } = this.sizes();
    return [min, (min + max) / 2, max].map((size, index) => ({
      index, r: arenaRadiusAt(scale, size), label: write(size),
    }));
  });
  protected readonly plotH = computed(() => this.strip().plotH);
  protected readonly stripH = computed(() => this.strip().stripH);
  private readonly box = computed(() => arenaPlotBox(this.width(), this.strip().plotH));
  protected readonly plotLeft = computed(() => this.box().x);
  protected readonly plotRight = computed(() => this.box().x + this.box().w);
  protected readonly plotTop = computed(() => this.box().y);
  protected readonly plotBottom = computed(() => this.box().y + this.box().h);
  protected readonly innerWidth = computed(() => this.box().w);
  protected readonly innerHeight = computed(() => this.box().h);
  protected readonly xLabelY = computed(() => arenaCategoryLabelY(this.strip().plotH));

  private readonly xScale = computed(() => {
    const box = this.box();
    const domain = this.domains().x;
    return arenaLinearScale(domain.min, domain.max, box.x, box.x + box.w);
  });

  private readonly yScale = computed(() => {
    const box = this.box();
    const domain = this.domains().y;
    return arenaLinearScale(domain.min, domain.max, box.y + box.h, box.y);
  });

  private readonly xAxis = computed(() => arenaAxisModelX(this.xScale(), this.domains().x, this.write()));
  private readonly yAxis = computed(() => arenaAxisModel(this.yScale(), this.domains().y, this.write()));

  protected readonly xTicks = computed(() => this.xAxis().ticks);
  protected readonly yTicks = computed(() => this.yAxis().ticks);
  protected readonly zeroX = computed(() => this.xAxis().zeroX);
  protected readonly zeroY = computed(() => this.yAxis().zeroY);

  protected readonly colors = computed(
    () => this.series().map((one, index) => arenaPointSeriesColor(one, index + 1)),
  );

  protected readonly marks = computed(() => {
    const xScale = this.xScale();
    const yScale = this.yScale();
    const colors = this.colors();
    const write = this.write();
    const rScale = this.rScale();
    const out: Array<{
      key: number; cx: number; cy: number; r: number; color: string; series: string;
      x: string; y: string; size: string;
    }> = [];
    this.series().forEach((one, index) => {
      const pairs = Math.min(one.x.length, one.y.length);
      for (let i = 0; i < pairs; i += 1) {
        const x = one.x[i] as number;
        const y = one.y[i] as number;
        const size = one.r === undefined ? undefined : one.r[i];
        out.push({
          key: out.length,
          cx: arenaScaleValue(xScale, x),
          cy: arenaScaleValue(yScale, y),
          r: size === undefined ? chartPointR : arenaRadiusAt(rScale, size),
          color: colors[index] as string,
          series: one.label,
          x: write(x),
          y: write(y),
          size: size === undefined ? '' : write(size),
        });
      }
    });
    return out;
  });

  protected readonly legend = computed(() => {
    if (this.strip().stripH === 0) return null;
    const colors = this.colors();
    return this.series().map((one, index) => ({ index, label: one.label, color: colors[index] }));
  });

  protected readonly table = computed(() => arenaPointTable(
    this.series(), this.xLabel(), this.yLabel(), this.sizeLabel() ?? '', this.write(),
  ));

  protected readonly active = computed(() => {
    const index = this.hover();
    const mark = index === null ? null : this.marks()[index] ?? null;
    if (!mark) return null;
    return { ...mark, anchor: arenaTooltipAnchor(mark.cx, mark.cy) };
  });

  protected onPointer(event: PointerEvent, phase: string): void {
    if (!arenaPointerUpdates(event.pointerType, phase)) return;
    const box = (event.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    const at = this.marks().map((mark) => ({ x: mark.cx, y: mark.cy }));
    const index = arenaNearestPoint(at, event.clientX - box.left, event.clientY - box.top);
    if (index >= 0) this.hover.set(index);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (arenaPointerClears(event.pointerType)) this.hover.set(null);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!arenaCursorHandles(event.key, 'x')) return;
    event.preventDefault();
    this.hover.set(arenaCursorStep(this.hover(), event.key, arenaPointCount(this.series()), 'x'));
  }
}
