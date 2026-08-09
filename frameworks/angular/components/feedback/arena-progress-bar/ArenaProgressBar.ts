import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';
import type { ArenaControlSize, ArenaProgressTone } from '../../../Api.generated';
import { arenaProgressBarStyles } from './ArenaProgressBar.variants';

export function arenaClampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

@Component({
  selector: 'arena-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
  },
  template: `
    <div [class]="styles().head()">
      <span [class]="styles().label()">{{ label() }}</span>
      @if (showsValue()) {
        <span [class]="styles().value()">{{ percentage() }}%</span>
      }
    </div>
    <div [class]="trackClass()" role="progressbar" aria-live="polite"
         [attr.aria-valuenow]="indeterminate() ? null : percentage()"
         aria-valuemin="0" aria-valuemax="100"
         [attr.aria-label]="label()">
      @if (!indeterminate()) {
        <span [class]="styles().announcement()">{{ percentage() }}%</span>
        <span [class]="styles().fill()" [style.width.%]="percentage()"></span>
      }
    </div>
  `,
})
export class ArenaProgressBar {
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
