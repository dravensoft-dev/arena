import {
  booleanAttribute, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild,
} from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import {
  ARENA_CHART_HEIGHT, ARENA_INK_BODY, ARENA_INK_MUTED, ARENA_SR_ONLY, arenaAreaFill, arenaPercentWriter, arenaValueWriter,
} from '../../../DataVisuals';
import {
  arenaLinearScale, arenaBandCenter, arenaBandIndex, arenaBandMark, arenaBandStart, arenaFunnelBands, arenaFunnelWidth,
} from '../ChartScales';
import { arenaFunnelConnector, arenaFunnelRect } from '../ChartMarks';
import { arenaCategoryLabelX, arenaFunnelBox, arenaTextGutter } from '../ChartAxis';
import {
  arenaFunnelConversions, arenaFunnelMax, arenaFunnelTable, arenaOneSeries, arenaSeriesColors,
} from '../ChartSeries';
import { arenaTooltipAnchor } from '../ChartTooltip';
import { arenaCursorHandles, arenaCursorStep, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer';
import { arenaFunnelChartStyles } from './ArenaFunnelChart.variants';
import manifest from './ArenaFunnelChart.classes.generated';
import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { chartBarRadius, chartLabelGap } from '../../../Tokens.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { arenaPhrase } from '../../../Phrase';

const ASSUMED_WIDTH = 600;

const REGION_STYLE = { display: 'block', outlineOffset: 'var(--focus-offset)' } as const satisfies Readonly<Record<string, string>>;

const NAME_STYLE = { fontSize: 'var(--dz-text-xs)' } as const satisfies Readonly<Record<string, string>>;

const NUMBER_STYLE = { fontSize: 'var(--dz-text-2xs)' } as const satisfies Readonly<Record<string, string>>;

const MARK_STYLE = { transition: 'opacity var(--dur-hover) var(--ease-hover)' } as const satisfies Readonly<Record<string, string>>;

@Component({
  selector: 'arena-funnel-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <div [class]="styles.frame()" [attr.data-arena-part]="parts.frame" [style.height.px]="height()">
    <div #region [style]="regionStyle" tabindex="0" role="group" [attr.aria-label]="name()"
         (keydown)="onKey($event)">
    <svg width="100%" [attr.height]="height()" role="img" [attr.aria-label]="name()"
         style="display:block;overflow:visible">
      @for (link of links(); track link.index) {
        <path [attr.d]="link.path" [attr.fill]="link.fill" stroke="none" />
      }

      @for (stage of stages(); track stage.index) {
        @if (stage.mark; as mark) {
          <rect [attr.x]="mark.x" [attr.y]="mark.y" [attr.width]="mark.width" [attr.height]="mark.height"
                [attr.rx]="mark.rx" [attr.fill]="stage.color"
                [attr.opacity]="hover() === null || hover() === stage.index ? 1 : 0.55"
                [style]="markStyle" />
        }
      }

      @for (stage of stages(); track stage.index) {
        <text [attr.x]="nameX" [attr.y]="stage.midY" text-anchor="end" dominant-baseline="middle"
              [attr.fill]="inkMuted" font-family="var(--font-body)"
              [style]="nameStyle">{{ stage.label }}</text>
      }

      @for (stage of stages(); track stage.index) {
        @if (stage.count !== null) {
          <text [attr.x]="gutterX()" [attr.y]="stage.midY" text-anchor="start" dominant-baseline="middle"
                [attr.fill]="inkBody" font-family="var(--font-mono)"
                [style]="numberStyle">{{ stage.count }}</text>
        }
      }

      @if (showConversion()) {
        @for (stage of stages(); track stage.index) {
          @if (stage.step !== null) {
            <text [attr.x]="gutterX()" [attr.y]="stage.startY" text-anchor="start" dominant-baseline="middle"
                  [attr.fill]="inkMuted" font-family="var(--font-mono)"
                  [style]="numberStyle">{{ stage.step }}</text>
          }
        }
      }

      <rect [attr.x]="plotLeft()" [attr.y]="plotTop()" [attr.width]="innerWidth()" [attr.height]="innerHeight()"
            fill="transparent" (pointermove)="onPointer($event, 'move')" (pointerdown)="onPointer($event, 'down')"
            (pointerleave)="onPointerLeave($event)" (pointercancel)="hover.set(null)" />
    </svg>
    </div>

    @if (active(); as point) {
      <div [class]="styles.tooltip()" [attr.data-arena-part]="parts.tooltip" [style.left.px]="point.anchor.left" [style.top]="point.anchor.top">
        <div [class]="styles.tooltipLabel()" [attr.data-arena-part]="parts.tooltipLabel">{{ point.label }}</div>
        @for (line of point.lines; track $index) {
          <div [class]="styles.tooltipValue()" [attr.data-arena-part]="parts.tooltipValue">{{ line }}</div>
        }
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
export class ArenaFunnelChart {
  protected readonly locale = inject(ARENA_LOCALE);
  /** One label per stage, in the same order as the series' `values`, running down the left edge. The chart does not reorder them: a funnel's order is a sequence in time or in a process, and sorting would invent one. A stage with no label has an empty name. */
  readonly labels = input.required<readonly string[]>();
  /** Exactly one series, the count at each stage in order. A second series warns and is ignored, because two funnels are two charts. `colorIds` is per-stage identity. `tone`, when given, colours the whole series and never a position, because a later stage is not worse for being later. */
  readonly series = input.required<readonly ArenaSeries[]>();
  /** Names the chart for its accessible name and for the caption of its data table. The label is the CHART's name, not a series': a series names itself. A fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. Required and guarded rather than defaulted for that reason. */
  readonly label = input.required<string>();
  /** Whether the conversion is drawn and tabled. On, each stage's share of the stage before it is written beside the loss between the two, the table gains the two conversion columns, and the tooltip reads both ratios. Off, the funnel is its marks and their counts. */
  readonly showConversion = input(true, { transform: booleanAttribute });
  /** Appended verbatim to every count the chart writes: the numbers beside the stages, the tooltip and the accessible table. The conversion is a percentage and takes no suffix. */
  readonly valueSuffix = input<string>();
  /** Drawn verbatim before every count the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide, and a suffix alone cannot say it: "1234.5 Bs." would disagree with the table beside it reading "Bs. 1.234,50", and the accessible table would inherit the disagreement. */
  readonly valuePrefix = input<string>();
  /** How each count is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. The conversion takes only the locale and keeps at most one fraction digit, so 62.4% is never written 62%. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** The plot's height in px, the --chart-height token by default. The height is the axis the stages run down, so a funnel of many stages wants more of it. Pass the room the data needs rather than letting the stages thin out. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  readonly height = input<number, number | undefined>(
    ARENA_CHART_HEIGHT,
    { transform: (value) => value ?? ARENA_CHART_HEIGHT },
  );

  protected readonly parts = manifest.parts;
  protected readonly styles = arenaFunnelChartStyles();
  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly regionStyle = REGION_STYLE;
  protected readonly inkMuted = ARENA_INK_MUTED;
  protected readonly inkBody = ARENA_INK_BODY;
  protected readonly nameStyle = NAME_STYLE;
  protected readonly numberStyle = NUMBER_STYLE;
  protected readonly markStyle = MARK_STYLE;
  protected readonly nameX = arenaCategoryLabelX();
  protected readonly hover = signal<number | null>(null);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly percent = computed(() => arenaPercentWriter(this.valueFormat()));

  private readonly region = viewChild<ElementRef<HTMLElement>>('region');

  private readonly measured = arenaContainerWidth(() => this.region()?.nativeElement);

  private readonly width = computed(() => this.measured() ?? ASSUMED_WIDTH);

  protected readonly name = computed(() => {
    const label = this.label();
    if (!label) throw new Error('ArenaFunnelChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
    return arenaPhrase(this.locale.funnelChartName, { label });
  });

  private readonly one = computed(() => arenaOneSeries(
    this.series(), 'ArenaFunnelChart', 'A funnel is one ordered series, and two funnels are two charts',
  ));

  private readonly values = computed(() => this.one().values);

  private readonly points = computed(() => Math.max(this.labels().length, this.values().length));

  private readonly conversions = computed(() => arenaFunnelConversions(this.values()));

  private readonly gutter = computed(() => {
    const write = this.write();
    const percent = this.percent();
    return arenaTextGutter([
      ...this.values().filter((value) => Number.isFinite(value)).map((value) => write(value)),
      ...(this.showConversion()
        ? this.conversions().flatMap(({ step }) => (step === null ? [] : [percent(step)]))
        : []),
    ]);
  });

  private readonly box = computed(() => arenaFunnelBox(this.width(), this.height(), this.gutter()));
  protected readonly plotLeft = computed(() => this.box().x);
  protected readonly plotTop = computed(() => this.box().y);
  protected readonly innerWidth = computed(() => this.box().w);
  protected readonly innerHeight = computed(() => this.box().h);
  private readonly centre = computed(() => this.box().x + this.box().w / 2);
  protected readonly gutterX = computed(() => this.box().x + this.box().w + chartLabelGap);

  private readonly scale = computed(() => arenaLinearScale(0, arenaFunnelMax(this.values()), 0, this.box().w));

  private readonly bands = computed(() => arenaFunnelBands(this.points(), this.box().y, this.box().h));

  private readonly colors = computed(() => arenaSeriesColors(this.one(), this.points(), 1));

  private readonly widthOf = computed(() => {
    const scale = this.scale();
    const values = this.values();
    return (index: number) => arenaFunnelWidth(scale, values[index] as number);
  });

  protected readonly stages = computed(() => {
    const bands = this.bands();
    const values = this.values();
    const labels = this.labels();
    const conversions = this.conversions();
    const colors = this.colors();
    const write = this.write();
    const percent = this.percent();
    const wide = this.widthOf();
    const cx = this.centre();
    return Array.from({ length: this.points() }, (_, index) => {
      const value = values[index];
      const finite = value !== undefined && Number.isFinite(value);
      const rect = finite ? arenaFunnelRect(cx, arenaBandMark(bands, index), bands.band, wide(index)) : null;
      const step = conversions[index]?.step ?? null;
      return {
        index,
        label: labels[index] ?? '',
        midY: arenaBandCenter(bands, index),
        startY: arenaBandStart(bands, index),
        color: colors[index] as string,
        mark: rect ? { ...rect, rx: Math.min(chartBarRadius, rect.width / 2, bands.band / 2) } : null,
        count: finite ? write(value) : null,
        step: step === null ? null : percent(step),
      };
    });
  });

  protected readonly links = computed(() => {
    if (!this.showConversion()) return [];
    const bands = this.bands();
    const values = this.values();
    const colors = this.colors();
    const wide = this.widthOf();
    const cx = this.centre();
    return Array.from({ length: Math.max(0, this.points() - 1) }, (_, index) => {
      const above = values[index];
      const below = values[index + 1];
      if (above === undefined || below === undefined || !Number.isFinite(above) || !Number.isFinite(below)) return null;
      return {
        index,
        path: arenaFunnelConnector(
          cx,
          { y: arenaBandMark(bands, index) + bands.band, width: wide(index) },
          { y: arenaBandMark(bands, index + 1), width: wide(index + 1) },
        ),
        fill: arenaAreaFill(colors[index] as string),
      };
    }).filter((link) => link !== null);
  });

  protected readonly table = computed(() => arenaFunnelTable(
    {
      stage: this.locale.chartTableCategory,
      step: this.locale.funnelConversionStep,
      total: this.locale.funnelConversionTotal,
    },
    this.one(), this.labels(), this.write(), this.percent(), this.showConversion(),
  ));

  protected readonly active = computed(() => {
    const index = this.hover();
    if (index === null || index >= this.points()) return null;
    const value = this.values()[index];
    const { step, total } = this.conversions()[index] ?? { step: null, total: null };
    const percent = this.percent();
    const showConversion = this.showConversion();
    const lines = [
      ...(value !== undefined && Number.isFinite(value) ? [this.write()(value)] : []),
      ...(showConversion && step !== null ? [`${this.locale.funnelConversionStep}: ${percent(step)}`] : []),
      ...(showConversion && total !== null ? [`${this.locale.funnelConversionTotal}: ${percent(total)}`] : []),
    ];
    return {
      label: this.labels()[index],
      lines,
      anchor: arenaTooltipAnchor(this.centre(), arenaBandCenter(this.bands(), index)),
    };
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
