import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';
import type { ArenaControlSize, ArenaProgressShape, ArenaProgressTone } from '../../../Api.generated';
import { arenaProgressBarStyles } from './ArenaProgressBar.variants';
import manifest from './ArenaProgressBar.classes.generated';

export function arenaClampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export const ARENA_RING_CENTRE = 50;
export const ARENA_RING_RADIUS = 42;
export const ARENA_RING_SWEEP = 25;

@Component({
  selector: 'arena-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
  },
  template: `
    @if (radial()) {
      <div [class]="styles().ring()" [attr.data-arena-part]="parts.ring" aria-live="polite">
        <svg [class]="styles().ringGeometry()" [attr.data-arena-part]="parts.ringGeometry"
             viewBox="0 0 100 100" role="progressbar"
             [attr.aria-valuenow]="indeterminate() ? null : percentage()"
             aria-valuemin="0" aria-valuemax="100"
             [attr.aria-label]="label()">
          <circle [class]="styles().ringTrack()" [attr.data-arena-part]="parts.ringTrack"
                  [attr.cx]="centre" [attr.cy]="centre" [attr.r]="radius" pathLength="100"></circle>
          <circle [class]="ringFillClass()" [attr.data-arena-part]="parts.ringFill"
                  [attr.cx]="centre" [attr.cy]="centre" [attr.r]="radius" pathLength="100"
                  [style.stroke-dashoffset]="dashOffset()"></circle>
        </svg>
        @if (!indeterminate()) {
          <span [class]="styles().announcement()" [attr.data-arena-part]="parts.announcement">{{ percentage() }}%</span>
        }
        <span [class]="styles().ringContent()" [attr.data-arena-part]="parts.ringContent">
          <ng-content />
        </span>
        @if (showsValue()) {
          <span [class]="styles().value()" [attr.data-arena-part]="parts.value">{{ percentage() }}%</span>
        }
      </div>
      @if (showLabel()) {
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ label() }}</span>
      }
    } @else {
      @if (showLabel() || showsValue()) {
        <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
          @if (showLabel()) {
            <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ label() }}</span>
          }
          @if (showsValue()) {
            <span [class]="styles().value()" [attr.data-arena-part]="parts.value">{{ percentage() }}%</span>
          }
        </div>
      }
      <div [class]="trackClass()" [attr.data-arena-part]="parts.track" role="progressbar" aria-live="polite"
           [attr.aria-valuenow]="indeterminate() ? null : percentage()"
           aria-valuemin="0" aria-valuemax="100"
           [attr.aria-label]="label()">
        @if (!indeterminate()) {
          <span [class]="styles().announcement()" [attr.data-arena-part]="parts.announcement">{{ percentage() }}%</span>
          <span [class]="styles().fill()" [attr.data-arena-part]="parts.fill" [style.width.%]="percentage()"></span>
        }
      </div>
    }
  `,
})
export class ArenaProgressBar {
  protected readonly parts = manifest.parts;
  protected readonly centre = ARENA_RING_CENTRE;
  protected readonly radius = ARENA_RING_RADIUS;

  /** How far along, 0-100. Clamped and rounded. Ignored when `indeterminate`. */
  readonly progressPercentage = input(0, { transform: numberAttribute });
  /** A wait with no percentage; the bar sweeps instead of filling. */
  readonly indeterminate = input(false, { transform: booleanAttribute });
  /** The bar's colour. */
  readonly tone = input<ArenaProgressTone, ArenaProgressTone | undefined>(
    'accent',
    { transform: (value) => value ?? 'accent' },
  );
  /** Names what is progressing. Drawn above the bar or under the ring, and it is the meter's accessible name. Required and guarded rather than defaulted: nothing can derive what is progressing, and a fallback of "Progress" satisfies roles.label mechanically while telling a screen-reader user only what the component is -- two of them on one page announce identically. */
  readonly label = input.required<string>();
  /** Draws the label beside the meter. False leaves the meter alone and keeps the accessible name, which is carried by aria-label on the progressbar element rather than by the text. For a bar in a table cell or a card row, where the row already names what is progressing and repeating it is noise. `label` stays required either way, on the reading it already carries: what a screen reader announces is not a decision about what is drawn. It is the same escape ArenaIconButton.showLabel offers, and it is here because the two components pose one question. */
  readonly showLabel = input(true, { transform: booleanAttribute });
  /** Shows the percentage: beside the label on a bar, and in the middle of a ring, which is the figure a meter in a tile is read by. Determinate only. Turn it off when `content` fills a ring's middle: the two share that space, and Arena never derives what it draws from what a consumer projected, because projected content is not inspectable in at least one layer. */
  readonly showPercentage = input(true, { transform: booleanAttribute });
  /** How heavy the meter is: the bar's thickness, and a ring's diameter with a band the same weight as the bar it replaces. */
  readonly size = input<ArenaControlSize, ArenaControlSize | undefined>(
    'md',
    { transform: (value) => value ?? 'md' },
  );
  /** Whether the meter is drawn as a bar or as a ring. A ring puts the percentage inside its own track and the label under it, which is the arrangement a tile wants and the one a row cannot give: a bar is as wide as its row and reads along it, while a ring is as wide as it is tall and reads at a glance. It is a shape rather than a second component because everything else is the same question answered once: the percentage, the tone, the required name, the announcement and the sweep a wait draws. */
  readonly shape = input<ArenaProgressShape, ArenaProgressShape | undefined>(
    'linear',
    { transform: (value) => value ?? 'linear' },
  );

  protected readonly percentage = computed(() => arenaClampPercentage(this.progressPercentage()));
  protected readonly showsValue = computed(() => this.showPercentage() && !this.indeterminate());
  protected readonly radial = computed(() => this.shape() === 'radial');
  protected readonly dashOffset = computed(
    () => 100 - (this.indeterminate() ? ARENA_RING_SWEEP : this.percentage()),
  );

  protected readonly styles = computed(
    () => arenaProgressBarStyles({ shape: this.shape(), tone: this.tone(), size: this.size() }),
  );

  protected readonly trackClass = computed(() => {
    const styles = this.styles();
    return this.indeterminate() ? `${styles.track()} ${styles.indeterminate()}` : styles.track();
  });

  protected readonly ringFillClass = computed(() => {
    const styles = this.styles();
    return this.indeterminate() ? `${styles.ringFill()} ${styles.ringIndeterminate()}` : styles.ringFill();
  });
}
