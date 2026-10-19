import {
  afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild,
} from '@angular/core';
import { arenaContainerWidth } from '../../../ContainerSize';
import { arenaWarnOnce } from '../../../WarnOnce';
import {
  ARENA_HEAT_STEPS, ARENA_INK_MUTED, ARENA_RAIL_STYLE, ARENA_SR_ONLY, arenaHeatFill, arenaValueWriter,
} from '../../../DataVisuals';
import {
  arenaBandCenter, arenaBandIndex, arenaBandMark, arenaBandScale, arenaHeatEdge, arenaHeatStep,
} from '../ChartScales';
import {
  arenaCategoryLabelX, arenaCategoryLabelY, arenaHeatmapBox, arenaHeatmapHeight, arenaHeatmapWidth, arenaLabelStride,
} from '../ChartAxis';
import { arenaHeatDomain, arenaHeatmapTable, arenaSeriesPointCount } from '../ChartSeries';
import { arenaHeatLegendStrip } from '../ChartLegend';
import { arenaRailAnchorX, arenaTooltipAnchor } from '../ChartTooltip';
import { arenaRailView } from '../ChartRailView';
import type { ArenaCell } from '../ChartPointer';
import { arenaCursorHandles2d, arenaCursorStep2d, arenaPointerClears, arenaPointerUpdates } from '../ChartPointer';
import { arenaHeatmapChartStyles } from './ArenaHeatmapChart.variants';
import manifest from './ArenaHeatmapChart.classes.generated';
import type { ArenaNumberFormat, ArenaSeries } from '../../../Api.generated';
import { chartBarGap, chartBarRadius } from '../../../Tokens.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { arenaPhrase } from '../../../Phrase';

const ASSUMED_WIDTH = 600;

const OUTLINE_STYLE = { strokeWidth: 'var(--bw)' } as const satisfies Readonly<Record<string, string>>;

const CURSOR_STYLE = { strokeWidth: 'var(--bw-strong)' } as const satisfies Readonly<Record<string, string>>;

const ROW_NAME_STYLE = { fontSize: 'var(--dz-text-xs)' } as const satisfies Readonly<Record<string, string>>;

const COLUMN_NAME_STYLE = { fontSize: 'var(--dz-text-2xs)' } as const satisfies Readonly<Record<string, string>>;

@Component({
  selector: 'arena-heatmap-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <div [class]="styles.frame()" [attr.data-arena-part]="parts.frame" [style.height.px]="total()">
    <div #rail [style]="arenaRailStyle" tabindex="0" role="group" [attr.aria-label]="name()"
         (keydown)="onKey($event)" (scroll)="syncView()">
    <svg [attr.width]="scrolls() ? width() : '100%'" [attr.height]="plotH()" role="img" [attr.aria-label]="name()"
         style="display:block;overflow:visible">
      @for (cell of cells(); track cell.key) {
        @if (cell.fill) {
          <rect [attr.x]="cell.x" [attr.y]="cell.y" [attr.width]="cell.width" [attr.height]="cell.height"
                [attr.rx]="cell.rx" [attr.fill]="cell.fill" />
        } @else {
          <rect [attr.x]="cell.x" [attr.y]="cell.y" [attr.width]="cell.width" [attr.height]="cell.height"
                [attr.rx]="cell.rx" fill="none" stroke="var(--edge-separator)" [style]="outlineStyle" />
        }
      }

      @for (row of rowNames(); track row.index) {
        <text [attr.x]="rowNameX" [attr.y]="row.y" text-anchor="end" dominant-baseline="middle"
              [attr.fill]="inkMuted" font-family="var(--font-body)"
              [style]="rowNameStyle">{{ row.label }}</text>
      }

      @for (column of columnNames(); track column.index) {
        <text [attr.x]="column.x" [attr.y]="columnNameY()" text-anchor="middle"
              [attr.fill]="inkMuted" font-family="var(--font-mono)"
              [style]="columnNameStyle">{{ column.label }}</text>
      }

      @if (active(); as point) {
        <rect [attr.x]="point.rect.x" [attr.y]="point.rect.y" [attr.width]="point.rect.width" [attr.height]="point.rect.height"
              [attr.rx]="point.rect.rx" fill="none" stroke="var(--ink-body)" [style]="cursorStyle" />
      }

      <rect [attr.x]="plotLeft()" [attr.y]="plotTop()" [attr.width]="innerWidth()" [attr.height]="innerHeight()"
            fill="transparent" (pointermove)="onPointer($event, 'move')" (pointerdown)="onPointer($event, 'down')"
            (pointerleave)="onPointerLeave($event)" (pointercancel)="cursor.set(null)" />
    </svg>
    </div>

    <div aria-hidden="true" [class]="styles.legend()" [attr.data-arena-part]="parts.legend" [style.height.px]="stripH()">
      @for (step of legend(); track step.index) {
        <span [class]="styles.legendItem()" [attr.data-arena-part]="parts.legendItem">
          <span [class]="styles.legendSwatch()" [attr.data-arena-part]="parts.legendSwatch" [style.background]="step.fill"></span>
          <span [class]="styles.legendLabel()" [attr.data-arena-part]="parts.legendLabel">{{ step.label }}</span>
        </span>
      }
    </div>

    @if (active(); as point) {
      <div [class]="styles.tooltip()" [attr.data-arena-part]="parts.tooltip" [style.left.px]="point.anchor.left" [style.top]="point.anchor.top">
        <div [class]="styles.tooltipLabel()" [attr.data-arena-part]="parts.tooltipLabel">{{ point.label }}</div>
        <div [class]="styles.tooltipValue()" [attr.data-arena-part]="parts.tooltipValue">{{ point.reading }}</div>
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
export class ArenaHeatmapChart {
  protected readonly locale = inject(ARENA_LOCALE);
  /** One label per column, along the bottom edge, in the same order as every series' `values`. A column with no label has an empty name in the table and the tooltip. */
  readonly labels = input.required<readonly string[]>();
  /** One series per row, top to bottom in the order given, its `label` the row's name and its `values` the row's cells, one per column. A short row leaves its last cells empty, and an empty or non-finite cell is drawn with an outline and no fill, because missing is not low. `colorId`, `colorIds` and `tone` are ignored with one development warning, because a cell's colour is its magnitude. */
  readonly series = input.required<readonly ArenaSeries[]>();
  /** Names the chart for its accessible name and for the caption of its data table. The name is for the CHART, and a series names itself. Required and guarded rather than defaulted: a fallback of the chart TYPE satisfies roles.label mechanically and tells a screen-reader user nothing, so two charts on one page announce identically. */
  readonly label = input.required<string>();
  /** Drawn verbatim before every number the chart writes: the legend, the tooltip and the accessible table, as valueSuffix is drawn after it. */
  readonly valuePrefix = input<string>();
  /** Appended verbatim to every number the chart writes: the legend, the tooltip and the accessible table. Carries its own leading space if one is wanted. */
  readonly valueSuffix = input<string>();
  /** How each number is written before the prefix and suffix are added: which locale, how many fraction digits, whether thousands are grouped, whether large numbers are compacted. Absent, the raw JavaScript number. */
  readonly valueFormat = input<ArenaNumberFormat>();
  /** The narrowest a column is drawn, in px. Below it the plot stops compressing and overflows its container sideways, in the region that is the plot's one tab stop. Absent, the plot fits whatever width it is given. */
  readonly minCellWidth = input<number>();
  /** The plot's height in px. Absent, the height is computed from the row count, one row pitch for each row plus the pads and the legend strip. A chart with many rows therefore grows with its data. The height is the axis the rows run down, so a caller with a fixed tile passes the room it has. A number rather than a dimension string, because the chart does arithmetic with it to place every mark. */
  readonly height = input<number>();

  protected readonly parts = manifest.parts;
  protected readonly styles = arenaHeatmapChartStyles();
  protected readonly arenaSrOnly = ARENA_SR_ONLY;
  protected readonly arenaRailStyle = ARENA_RAIL_STYLE;
  protected readonly inkMuted = ARENA_INK_MUTED;
  protected readonly outlineStyle = OUTLINE_STYLE;
  protected readonly cursorStyle = CURSOR_STYLE;
  protected readonly rowNameStyle = ROW_NAME_STYLE;
  protected readonly columnNameStyle = COLUMN_NAME_STYLE;
  protected readonly rowNameX = arenaCategoryLabelX();
  protected readonly cursor = signal<ArenaCell | null>(null);
  private readonly railView = arenaRailView(() => this.rail()?.nativeElement);

  private readonly write = computed(() => arenaValueWriter({
    prefix: this.valuePrefix(), suffix: this.valueSuffix(), format: this.valueFormat(),
  }));

  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  private readonly measured = arenaContainerWidth(() => this.rail()?.nativeElement);

  private readonly available = computed(() => this.measured() ?? ASSUMED_WIDTH);

  protected readonly name = computed(() => {
    const label = this.label();
    if (!label) throw new Error('ArenaHeatmapChart: `label` is required (it names the chart for the accessible name, and nothing can derive that)');
    return arenaPhrase(this.locale.heatmapChartName, { label });
  });

  private readonly rows = computed(() => {
    const series = this.series();
    if (series.some((one) => one.colorId !== undefined || one.colorIds !== undefined || one.tone !== undefined)) {
      arenaWarnOnce('ArenaHeatmapChart: a series\' colorId, colorIds and tone are ignored, because a cell\'s colour is its magnitude');
    }
    return series.length;
  });

  private readonly cols = computed(() => Math.max(this.labels().length, arenaSeriesPointCount(this.series())));

  protected readonly total = computed(() => this.height() ?? arenaHeatmapHeight(this.rows()));

  private readonly strip = computed(() => arenaHeatLegendStrip(this.total()));
  protected readonly plotH = computed(() => this.strip().plotH);
  protected readonly stripH = computed(() => this.strip().stripH);

  protected readonly width = computed(() => arenaHeatmapWidth(this.available(), this.cols(), this.minCellWidth()));
  protected readonly scrolls = computed(() => this.width() > this.available());

  private readonly box = computed(() => arenaHeatmapBox(this.width(), this.plotH()));
  protected readonly plotLeft = computed(() => this.box().x);
  protected readonly plotTop = computed(() => this.box().y);
  protected readonly innerWidth = computed(() => this.box().w);
  protected readonly innerHeight = computed(() => this.box().h);

  private readonly colScale = computed(() => {
    const box = this.box();
    return arenaBandScale(this.cols(), box.x, box.w, chartBarGap);
  });

  private readonly rowScale = computed(() => {
    const box = this.box();
    return arenaBandScale(this.rows(), box.y, box.h, chartBarGap);
  });

  private readonly domain = computed(() => arenaHeatDomain(this.series()));

  private readonly cellRect = computed(() => {
    const colScale = this.colScale();
    const rowScale = this.rowScale();
    return (row: number, col: number) => {
      const width = colScale.band;
      const height = rowScale.band;
      return {
        x: arenaBandMark(colScale, col), y: arenaBandMark(rowScale, row), width, height,
        rx: Math.min(chartBarRadius, width / 2, height / 2),
      };
    };
  });

  protected readonly cells = computed(() => {
    const domain = this.domain();
    const rect = this.cellRect();
    const cols = this.cols();
    return this.series().flatMap((one, row) => Array.from({ length: cols }, (_, col) => {
      const value = one.values[col];
      const step = value === undefined ? null : arenaHeatStep(domain, value, ARENA_HEAT_STEPS);
      return { key: `${row}-${col}`, ...rect(row, col), fill: step === null ? null : arenaHeatFill(step) };
    }));
  });

  protected readonly rowNames = computed(() => {
    const scale = this.rowScale();
    return this.series().map((one, index) => ({ index, label: one.label, y: arenaBandCenter(scale, index) }));
  });

  private readonly stride = computed(() => arenaLabelStride(this.colScale().step, this.labels()));

  protected readonly columnNameY = computed(() => arenaCategoryLabelY(this.plotH()));

  protected readonly columnNames = computed(() => {
    const scale = this.colScale();
    const labels = this.labels();
    const stride = this.stride();
    return Array.from({ length: Math.min(this.cols(), labels.length) }, (_, index) => ({
      index, x: arenaBandCenter(scale, index), label: labels[index] as string,
    })).filter((one) => one.index % stride === 0);
  });

  protected readonly legend = computed(() => {
    const domain = this.domain();
    const write = this.write();
    return Array.from({ length: ARENA_HEAT_STEPS }, (_, index) => ({
      index, fill: arenaHeatFill(index + 1), label: write(arenaHeatEdge(domain, index)),
    }));
  });

  protected readonly table = computed(() => arenaHeatmapTable(
    this.locale.heatmapTableRow, this.series(), this.labels(), this.write(),
  ));

  private anchorX(col: number): number {
    const x = arenaBandCenter(this.colScale(), col);
    return arenaRailAnchorX(x, this.scrolls(), this.railView.view(), this.available());
  }

  protected readonly active = computed(() => {
    const at = this.cursor();
    if (!at || at.row >= this.rows() || at.col >= this.cols()) return null;
    const one = this.series()[at.row] as ArenaSeries;
    const value = one.values[at.col];
    return {
      rect: this.cellRect()(at.row, at.col),
      label: this.labels()[at.col] ?? '',
      reading: value !== undefined && Number.isFinite(value) ? `${one.label}: ${this.write()(value)}` : one.label,
      anchor: arenaTooltipAnchor(this.anchorX(at.col), arenaBandMark(this.rowScale(), at.row)),
    };
  });

  constructor() {
    afterRenderEffect(() => {
      const rail = this.rail()?.nativeElement;
      const at = this.cursor();
      this.colScale();
      this.available();
      if (!rail) return;
      if (this.scrolls() && at) {
        const left = arenaBandMark(this.colScale(), at.col);
        const right = left + this.colScale().band;
        if (left < rail.scrollLeft) rail.scrollLeft = left;
        else if (right > rail.scrollLeft + rail.clientWidth) rail.scrollLeft = right - rail.clientWidth;
      }
      this.syncView();
    });
  }

  protected syncView(): void {
    this.railView.sync();
  }

  protected onPointer(event: PointerEvent, phase: string): void {
    if (!this.rows() || !this.cols() || !arenaPointerUpdates(event.pointerType, phase)) return;
    const box = (event.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    this.cursor.set({
      row: arenaBandIndex(this.rowScale(), event.clientY - box.top),
      col: arenaBandIndex(this.colScale(), event.clientX - box.left),
    });
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (arenaPointerClears(event.pointerType)) this.cursor.set(null);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!arenaCursorHandles2d(event.key)) return;
    event.preventDefault();
    this.cursor.set(arenaCursorStep2d(this.cursor(), event.key, this.rows(), this.cols()));
  }
}
