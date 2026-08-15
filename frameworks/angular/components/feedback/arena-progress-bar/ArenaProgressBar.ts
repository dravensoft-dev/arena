import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';
import type { ArenaControlSize, ArenaProgressTone } from '../../../Api.generated';
import { arenaProgressBarStyles } from './ArenaProgressBar.variants';
import manifest from './ArenaProgressBar.classes.generated';

export function arenaClampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

@Component({
  selector: 'arena-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
  },
  template: `
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
  `,
})
export class ArenaProgressBar {
  protected readonly parts = manifest.parts;

  /** How far along, 0-100. Clamped and rounded. Ignored when `indeterminate`. */
  readonly progressPercentage = input(0, { transform: numberAttribute });
  /** A wait with no percentage; the bar sweeps instead of filling. */
  readonly indeterminate = input(false, { transform: booleanAttribute });
  /** The bar's colour. */
  readonly tone = input<ArenaProgressTone, ArenaProgressTone | undefined>(
    'accent',
    { transform: (value) => value ?? 'accent' },
  );
  /** Names what is progressing. Drawn above the bar, and it is the bar's accessible name. Required and guarded rather than defaulted: nothing can derive what is progressing, and a fallback of "Progress" satisfies roles.label mechanically while telling a screen-reader user only what the component is -- two of them on one page announce identically. */
  readonly label = input.required<string>();
  /** Draws the label above the bar. False leaves the bar alone and keeps the accessible name, which is carried by aria-label on the progressbar element rather than by the text. For a bar in a table cell or a card row, where the row already names what is progressing and repeating it is noise. `label` stays required either way, on the reading it already carries: what a screen reader announces is not a decision about what is drawn. It is the same escape ArenaIconButton.showLabel offers, and it is here because the two components pose one question. */
  readonly showLabel = input(true, { transform: booleanAttribute });
  /** Shows the percentage beside the label. Determinate only. */
  readonly showPercentage = input(true, { transform: booleanAttribute });
  /** The bar's thickness. */
  readonly size = input<ArenaControlSize, ArenaControlSize | undefined>(
    'md',
    { transform: (value) => value ?? 'md' },
  );

  protected readonly percentage = computed(() => arenaClampPercentage(this.progressPercentage()));
  protected readonly showsValue = computed(() => this.showPercentage() && !this.indeterminate());

  protected readonly styles = computed(() => arenaProgressBarStyles({ tone: this.tone(), size: this.size() }));

  protected readonly trackClass = computed(() => {
    const styles = this.styles();
    return this.indeterminate() ? `${styles.track()} ${styles.indeterminate()}` : styles.track();
  });
}
