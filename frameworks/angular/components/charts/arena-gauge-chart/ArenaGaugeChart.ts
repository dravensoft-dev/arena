import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, viewChild } from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import { ARENA_INK_MUTED, ARENA_SR_ONLY, arenaAreaFill, arenaToneColor, arenaValueWriter } from '../../../DataVisuals';
import { arenaGaugeFraction } from '../ChartScales';
import { arenaGaugeAngle, arenaGaugeAnchor, arenaGaugePoint, arenaGaugeRadii } from '../ChartPolar';
import { arenaArcPath } from '../ChartMarks';
import { arenaGaugeBand, arenaGaugeBands, arenaGaugeColor, arenaGaugeTable, arenaGaugeTicks } from '../ChartSeries';
import { arenaGaugeChartStyles } from './ArenaGaugeChart.variants';
import manifest from './ArenaGaugeChart.classes.generated';
import type { ArenaCatSlot, ArenaGaugeBand, ArenaNumberFormat } from '../../../Api.generated';
import { chartGaugeHeight, chartLabelGap } from '../../../Tokens.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { arenaPhrase } from '../../../Phrase';

const ASSUMED_WIDTH = 600;

const SVG_STYLE = { display: 'block', overflow: 'visible' } as const satisfies Readonly<Record<string, string>>;

const TICK_STYLE = { strokeWidth: 'var(--bw)' } as const satisfies Readonly<Record<string, string>>;

const TICK_LABEL_STYLE = { fontSize: 'var(--dz-text-2xs)' } as const satisfies Readonly<Record<string, string>>;

const READING_STYLE = { fontSize: 'var(--dz-text-lg)' } as const satisfies Readonly<Record<string, string>>;

const WORD_STYLE = { fontSize: 'var(--dz-text-xs)' } as const satisfies Readonly<Record<string, string>>;

@Component({
  selector: 'arena-gauge-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <div #frame [class]="styles.frame()" [attr.data-arena-part]="parts.frame" [style.height.px]="height()">
    <svg width="100%" [attr.height]="height()" role="img" [attr.aria-label]="name()" [style]="svgStyle">
      @for (segment of segments(); track $index) {
        <path [attr.d]="segment.path" [attr.fill]="segment.fill" stroke="none" />
      }

      <path [attr.d]="trackPath()" fill="var(--fill-track)" stroke="none" />

      @if (valueArc(); as arc) {
        <path [attr.d]="arc.path" [attr.fill]="arc.fill" stroke="none" />
      }

      @for (tick of tickMarks(); track tick.value) {
        <g>
          <line [attr.x1]="tick.from.x" [attr.y1]="tick.from.y" [attr.x2]="tick.to.x" [attr.y2]="tick.to.y"
                stroke="var(--edge-axis)" [style]="tickStyle" />
          <text [attr.x]="tick.at.x" [attr.y]="tick.at.y" [attr.text-anchor]="tick.anchor" dominant-baseline="middle"
                [attr.fill]="inkMuted" font-family="var(--font-mono)" [style]="tickLabelStyle">{{ tick.text }}</text>
        </g>
      }

      @if (reads()) {
        <text [attr.x]="centreX()" [attr.y]="centreY()" text-anchor="middle"
              [attr.dominant-baseline]="word() ? null : 'middle'"
              fill="var(--ink-heading)" font-family="var(--font-mono)" [style]="readingStyle">{{ reading() }}</text>
      }

      @if (reads() && word(); as text) {
        <text [attr.x]="centreX()" [attr.y]="centreY() + labelGap" text-anchor="middle" dominant-baseline="hanging"
              [attr.fill]="inkMuted" font-family="var(--font-body)" [style]="wordStyle">{{ text }}</text>
      }
    </svg>

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
export class ArenaGaugeChart {
  protected readonly locale = inject(ARENA_LOCALE);
  /** The one reading. A single number is not a series, so it is not an ArenaSeries. The drawing clamps it to the scale and the words never do. The centre reading and the table write the number passed, so 130 on a scale of 0 to 100 draws the arc at the end and still says 130. A non-finite value is not a zero: the gauge draws the empty track and leaves the reading and its table cell empty. */
  readonly value = input.required<number>();
  /** Names the gauge for its accessible name and for the caption of its data table. Required and guarded rather than defaulted, because a fallback of the chart type would announce two gauges on one page identically. */
  readonly label = input.required<string>();
  /** The low end of the scale, where the arc begins. The start of the dial and the table both write it. */
  readonly min = input<number, number | undefined>(0, { transform: (value) => value ?? 0 });
  /** The high end of the scale, where the arc ends and where the last band stops. A `max` not greater than `min` warns once and draws the empty track, because there is no scale to place a value on. */
  readonly max = input<number, number | undefined>(100, { transform: (value) => value ?? 100 });
  /** What the scale means. Each band runs from its `from` to the next band's `from`, and the last to `max`, and the arc takes the colour of the band the value is in. A value below the first band is in no band and takes the `colorStart` slot. Absent, the arc is one identity colour and no band is drawn. Data rather than a threshold function, so the dial and the table are cut from the same list. An unsorted list is configuration and not data, so it warns once and is read in order of `from`. A band without a `label` throws, because a status colour never ships without its word. */
  readonly bands = input<readonly ArenaGaugeBand[]>();
  /** The identity slot of the arc when there are no `bands`, clamped to the ramp, `colorStart` when absent. With `bands` it is ignored with a development warning, because a chart carries identity or meaning and never both. */
  readonly colorId = input<number>();

  /** The ramp slot the arc takes when there are no `bands` and no `colorId`, and the slot a value below the first band takes. With `bands`, the band's tone wins. Absent, 1. */
  readonly colorStart = input<ArenaCatSlot, ArenaCatSlot | undefined>(
    1,
    { transform: (value) => value ?? 1 },
  );
  /** Appended verbatim to every number the gauge writes: the centre reading, the end labels, the band edges and the accessible table. Carries its own leading space if one is wanted. */
  readonly valueSuffix = input<string>();
  /** Drawn verbatim before every number the gauge writes, as valueSuffix is drawn after it, for a currency that precedes its amount. */
  readonly valuePrefix = input<string>();
  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** The dial's height in px, the --chart-gauge-height token by default, a size at which a 270 degree dial with its end labels and its centre reading fits a tile. The radius is derived from it, so the band ring, the track and the reading move together. A number rather than a dimension string, because the gauge does arithmetic with it to place every mark. */
  readonly height = input<number, number | undefined>(
    chartGaugeHeight,
    { transform: (value) => value ?? chartGaugeHeight },
  );

  protected readonly parts = manifest.parts;
  protected readonly styles = arenaGaugeChartStyles();
  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly svgStyle = SVG_STYLE;
  protected readonly tickStyle = TICK_STYLE;
  protected readonly tickLabelStyle = TICK_LABEL_STYLE;
  protected readonly readingStyle = READING_STYLE;
  protected readonly wordStyle = WORD_STYLE;
  protected readonly inkMuted = ARENA_INK_MUTED;
  protected readonly labelGap = chartLabelGap;

  private readonly frame = viewChild<ElementRef<HTMLElement>>('frame');
  private readonly measured = arenaContainerWidth(() => this.frame()?.nativeElement);
  private readonly width = computed(() => this.measured() ?? ASSUMED_WIDTH);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  protected readonly name = computed(() => {
    const label = this.label();
    if (!label) throw new Error('ArenaGaugeChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
    return arenaPhrase(this.locale.gaugeChartName, { label });
  });

  private readonly sorted = computed(() => {
    const bands = this.bands();
    if (bands?.some((band) => !band.label)) {
      throw new Error('ArenaGaugeChart: every band needs a `label` (a status colour never ships without its word)');
    }
    return arenaGaugeBands(bands ?? [], 'ArenaGaugeChart');
  });

  protected readonly centreX = computed(() => this.width() / 2);
  private readonly radii = computed(() => arenaGaugeRadii(this.width(), this.height()));
  protected readonly centreY = computed(() => this.radii().cy);

  private readonly index = computed(() => arenaGaugeBand(this.sorted(), this.value()));
  private readonly color = computed(() => arenaGaugeColor(this.sorted(), this.index(), this.colorId(), 'ArenaGaugeChart', this.colorStart()));
  private readonly fraction = computed(() => arenaGaugeFraction(this.value(), this.min(), this.max()));
  protected readonly word = computed(() => this.sorted()[this.index()]?.label);
  protected readonly reads = computed(() => Number.isFinite(this.value()));
  protected readonly reading = computed(() => this.write()(this.value()));

  private readonly arc = (r: { outer: number; inner: number }, from: number, to: number): string =>
    arenaArcPath(this.centreX(), this.centreY(), r.outer, r.inner, arenaGaugeAngle(from), arenaGaugeAngle(to));

  protected readonly segments = computed(() => {
    const { min, max } = { min: this.min(), max: this.max() };
    const ring = this.radii().band;
    const sorted = this.sorted();
    return sorted.flatMap((band, i) => {
      const from = arenaGaugeFraction(band.from, min, max);
      const to = arenaGaugeFraction(sorted[i + 1]?.from ?? max, min, max);
      return to > from ? [{ path: this.arc(ring, from, to), fill: arenaAreaFill(arenaToneColor(band.tone)) }] : [];
    });
  });

  protected readonly trackPath = computed(() => this.arc(this.radii().track, 0, 1));
  protected readonly valueArc = computed(() => {
    const fill = this.color();
    return this.fraction() > 0 ? { path: this.arc(this.radii().track, 0, this.fraction()), fill } : null;
  });

  protected readonly tickMarks = computed(() => {
    const { track, band, label } = this.radii();
    const write = this.write();
    const cx = this.centreX();
    const cy = this.centreY();
    return arenaGaugeTicks(this.sorted(), this.min(), this.max(), 'ArenaGaugeChart').map((value) => {
      const f = arenaGaugeFraction(value, this.min(), this.max());
      return {
        value,
        from: arenaGaugePoint(cx, cy, track.outer, f),
        to: arenaGaugePoint(cx, cy, band.outer, f),
        at: arenaGaugePoint(cx, cy, label, f),
        anchor: arenaGaugeAnchor(f),
        text: write(value),
      };
    });
  });

  protected readonly table = computed(() => arenaGaugeTable({
    measure: this.locale.gaugeTableMeasure, value: this.locale.gaugeTableValue, minimum: this.locale.gaugeTableMinimum,
    maximum: this.locale.gaugeTableMaximum, range: this.locale.gaugeTableRange,
  }, this.value(), this.min(), this.max(), this.sorted(), this.write()));
}
