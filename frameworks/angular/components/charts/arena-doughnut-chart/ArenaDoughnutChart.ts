import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import { ARENA_CHART_HEIGHT, ARENA_SR_ONLY, arenaValueWriter } from '../../../DataVisuals';
import { arenaDoughnutSlices } from '../ChartScales';
import { arenaArcPath } from '../ChartMarks';
import { arenaDoughnutRadii } from '../ChartAxis';
import { arenaLegendPlotWidth, arenaLegendStacked } from '../ChartLegend';
import { arenaChartTable, arenaOneSeries, arenaSeriesColors } from '../ChartSeries';
import type { ArenaChartLegendLayout, ArenaChartShape, ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';

const ASSUMED_WIDTH = 600;

const DIM_OPACITY = 0.55;

const SVG_STYLE = { display: 'block', flexShrink: '0' } as const satisfies Readonly<Record<string, string>>;

const SEGMENT_STYLE = {
  transition: 'opacity var(--dur-hover) var(--ease-hover)', strokeWidth: 'var(--bw-strong)',
} as const satisfies Readonly<Record<string, string>>;

const CENTRE_LABEL_STYLE = { fontSize: 'var(--dz-text-lg)' } as const satisfies Readonly<Record<string, string>>;

const LEGEND_STYLE = {
  flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', gap: 'calc(var(--sp-1) * 1.5)', overflow: 'auto',
} as const satisfies Readonly<Record<string, string>>;

const LEGEND_ROW_STYLE = {
  display: 'flex', alignItems: 'center', gap: 'calc(var(--sp-1) * 2)', cursor: 'pointer',
  background: 'none', border: '0', padding: '0', margin: '0', font: 'inherit',
  color: 'inherit', textAlign: 'left', width: '100%',
} as const satisfies Readonly<Record<string, string>>;

const LEGEND_TEXT_INLINE_STYLE = {
  display: 'flex', flex: '1', minWidth: '0', alignItems: 'baseline',
  gap: 'calc(var(--sp-1) * 2)', justifyContent: 'space-between',
} as const satisfies Readonly<Record<string, string>>;

const LEGEND_TEXT_STACKED_STYLE = {
  display: 'flex', flex: '1', minWidth: '0', flexDirection: 'column', alignItems: 'stretch',
} as const satisfies Readonly<Record<string, string>>;

const SWATCH_STYLE = {
  width: 'calc(var(--sp-1) * 2.5)', height: 'calc(var(--sp-1) * 2.5)',
  borderRadius: 'var(--r-xs)', flexShrink: '0',
} as const satisfies Readonly<Record<string, string>>;

const LEGEND_LABEL_STYLE = {
  flex: '1', minWidth: '0', fontFamily: 'var(--font-body)', fontSize: 'var(--dz-text-sm)',
  color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
} as const satisfies Readonly<Record<string, string>>;

const LEGEND_VALUE_STYLE = {
  fontFamily: 'var(--font-mono)', fontSize: 'var(--dz-text-sm)', color: 'var(--mute)',
} as const satisfies Readonly<Record<string, string>>;

@Component({
  selector: 'arena-doughnut-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display:flex;position:relative;width:100%;gap:var(--chart-legend-gap)',
    '[style.height.px]': 'height',
  },
  template: `
    <svg [attr.width]="arenaPlotWidth()" [attr.height]="height" role="img" [attr.aria-label]="name()"
         [style]="svgStyle" (pointerleave)="hover.set(null)">
      @for (segment of segments(); track segment.index) {
        @if (segment.path) {
          <path [attr.d]="segment.path" [attr.fill]="segment.color" stroke="var(--surface-card)"
                [attr.opacity]="hover() === null || hover() === segment.index ? 1 : dimOpacity"
                (pointerenter)="hover.set(segment.index)" (click)="sliceActivate.emit(segment.index)"
                [style]="segmentStyle" />
        }
      }
      @if (centre(); as segment) {
        <text [attr.x]="centreX()" [attr.y]="centreY()" text-anchor="middle" dominant-baseline="middle"
              fill="var(--bone)" font-family="var(--font-mono)"
              [style]="centreLabelStyle">{{ segment.percent }}%</text>
      }
    </svg>

    <div [style]="legendStyle" role="group" [attr.aria-label]="legendName()">
      @for (segment of segments(); track segment.index) {
        <button type="button" [style]="legendRowStyle"
                [style.opacity]="hover() === null || hover() === segment.index ? 1 : dimOpacity"
                (pointerenter)="hover.set(segment.index)" (pointerleave)="hover.set(null)"
                (focus)="hover.set(segment.index)" (blur)="hover.set(null)"
                (click)="sliceActivate.emit(segment.index)">
          <span aria-hidden="true" [style]="swatchStyle" [style.background]="segment.color"></span>
          <span [style]="legendTextStyle()">
            <span [style]="legendLabelStyle">{{ segment.label }}</span>
            <span [style]="legendValueStyle">{{ segment.formatted }}</span>
          </span>
        </button>
      }
    </div>

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
export class ArenaDoughnutChart {
  /** One label per slice, in the same order as the series' `values`. A label with no value at its index is dropped. */
  readonly labels = input.required<readonly string[]>();
  /** The parts, as one series whose values are read as shares of their own total. Exactly one series: a ring of two series is a sunburst, which is a different chart and not this one, so a second warns in development and is ignored. Per-slice identity goes in that series' `slots`. */
  readonly series = input.required<readonly ArenaSeries[]>();
  /** Names the chart for its accessible name and for the caption of its data table. Required and guarded rather than defaulted, because a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  readonly label = input.required<string>();
  /** Appended verbatim to every number the chart draws: the legend value and the accessible table. Not the centre label, which is a percentage rather than a value. */
  readonly valueSuffix = input<string>();
  /** Drawn verbatim before every number the chart writes, as valueSuffix is drawn after it. A currency that precedes its amount is the majority case worldwide and had no expression: with suffix alone, "1234.5 Bs." is what a chart drew where the table beside it read "Bs. 1.234,50", and the accessible table inherited the disagreement. */
  readonly valuePrefix = input<string>();
  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number, which is what this chart drew before the member existed. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** Whether the ring keeps its hole or fills to the centre. 'pie' is the same chart with the same slices, the same legend and the same table, drawn solid. It costs the centre percentage, which has nowhere to go once the hole is gone: over a wedge it would put --bone on a --color-cat slot, a pair nothing checks for contrast because nothing had drawn it. The figure is not lost, it is in the legend row and in the accessible table, which is where every other number the chart writes already is. */
  readonly shape = input<ArenaChartShape, ArenaChartShape | undefined>(
    'doughnut',
    { transform: (value) => value ?? 'doughnut' },
  );
  /** How each legend row arranges its label and its figure. 'inline' puts them on one line, which is what fits a wide tile; 'stacked' puts the label above the figure; 'auto' measures the legend column and stacks when the row does not give. It exists because the two do not degrade equally: on one line the figure does not yield, so the label is what gets truncated, and a legend of numbers with nothing saying what they count is the opposite of a legend. The threshold is already declared, as the chart-legend-min and chart-legend-max tokens the ring width is clamped between; what was missing was the behaviour. */
  readonly legendLayout = input<ArenaChartLegendLayout, ArenaChartLegendLayout | undefined>(
    'auto',
    { transform: (value) => value ?? 'auto' },
  );
  /** A slice was activated, by pointer on the arc or on its legend row, or by keyboard on that row, which is a real button and answers Enter and Space without the component binding either. It carries the slice's index in the series' `values`. **In `values`, never in the drawn paths**, and that is the whole member: a slice worth zero paints nothing, so the shapes on screen and the entries in the array are two different lists, and a consumer indexing the SVG has to reproduce that omission from outside to translate one into the other. It is reverse engineering of a component's own DOM, which the next release breaks in silence. */
  readonly sliceActivate = output<number>();

  protected readonly height = ARENA_CHART_HEIGHT;
  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly svgStyle = SVG_STYLE;
  protected readonly segmentStyle = SEGMENT_STYLE;
  protected readonly centreLabelStyle = CENTRE_LABEL_STYLE;
  protected readonly legendStyle = LEGEND_STYLE;
  protected readonly legendRowStyle = LEGEND_ROW_STYLE;
  protected readonly swatchStyle = SWATCH_STYLE;
  protected readonly legendLabelStyle = LEGEND_LABEL_STYLE;
  protected readonly legendValueStyle = LEGEND_VALUE_STYLE;
  protected readonly dimOpacity = DIM_OPACITY;
  protected readonly hover = signal<number | null>(null);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly measured = arenaContainerWidth();

  private readonly width = computed(() => this.measured() ?? ASSUMED_WIDTH);

  protected readonly stacked = computed(() => arenaLegendStacked(this.legendLayout(), this.width()));

  protected readonly legendTextStyle = computed(
    () => (this.stacked() ? LEGEND_TEXT_STACKED_STYLE : LEGEND_TEXT_INLINE_STYLE),
  );

  protected readonly name = computed(() => {
    return this.shape() === 'pie' ? `${this.label()} — pie chart` : `${this.label()} — doughnut chart`;
  });

  protected readonly arenaPlotWidth = computed(() => arenaLegendPlotWidth(this.width()));
  protected readonly centre = computed(() => (this.shape() === 'pie' ? null : this.active()));
  protected readonly legendName = computed(() => (this.shape() === 'pie' ? 'Pie chart legend' : 'Doughnut chart legend'));
  protected readonly centreX = computed(() => this.arenaPlotWidth() / 2);
  protected readonly centreY = computed(() => this.height / 2);

  private readonly only = computed(() => arenaOneSeries(this.series(), 'ArenaDoughnutChart'));

  protected readonly segments = computed(() => {
    const only = this.only();
    const values = only.values;

    const colors = arenaSeriesColors(
      { ...only, slots: only.slots ?? values.map((_, index) => index + 1) }, values.length, 1,
    );
    const write = this.write();
    const centreX = this.centreX();
    const centreY = this.centreY();
    const { outer, inner } = arenaDoughnutRadii(this.arenaPlotWidth(), this.height, this.shape());
    return arenaDoughnutSlices(values).map((slice) => ({
      ...slice,
      color: colors[slice.index],
      label: this.labels()[slice.index] ?? '',
      formatted: write(values[slice.index]),
      path: slice.to > slice.from ? arenaArcPath(centreX, centreY, outer, inner, slice.from, slice.to) : '',
    }));
  });

  protected readonly table = computed(() => arenaChartTable(
    'Category', this.series().slice(0, 1), this.labels(), this.write(),
  ));

  protected readonly active = computed(() => {
    const index = this.hover();
    return index === null ? null : this.segments()[index] ?? null;
  });
}
