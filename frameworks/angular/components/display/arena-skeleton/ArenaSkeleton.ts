import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { arenaSkeletonStyles } from './ArenaSkeleton.variants';
import manifest from './ArenaSkeleton.classes.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaSlotAttributes } from '../../../SlotData';

export function arenaSkeletonRowIsLast(row: number, total: number): boolean {
  return row === total && total > 1;
}

@Component({
  selector: 'arena-skeleton',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '[attr.data-arena-part]': 'stacked() ? parts.stack : parts.root',
    role: 'status',
    '[attr.aria-label]': 'locale.skeletonLabel',
  },
  template: `
    @if (stacked()) {
      @for (row of rows(); track row) {
        <div [class]="(isLast(row, rows().length) ? lastStyles() : styles()).line()"
             [arenaSlotData]="(isLast(row, rows().length) ? lastStyles() : styles()).$data.line()"
             [attr.data-arena-part]="parts.line"></div>
      }
    }
  `,
})
export class ArenaSkeleton {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);

  /** How many lines of text the placeholder stands in for. Absent, it is one box in the shape its class names; given, it is a stack of that many lines, the last running short when there is more than one. */
  readonly lines = input<number>();

  protected readonly styles = computed(() => arenaSkeletonStyles({}));
  protected readonly stacked = computed(() => this.lines() !== undefined);
  protected readonly rows = computed(() => {
    const lines = this.lines() ?? 0;
    return Array.from({ length: Number.isFinite(lines) ? Math.max(0, Math.floor(lines)) : 0 }, (_, i) => i + 1);
  });
  protected readonly hostClass = computed(() => (this.stacked() ? this.styles().stack() : this.styles().root()));
  protected readonly lastStyles = computed(() => arenaSkeletonStyles({ last: true }));
  protected readonly isLast = arenaSkeletonRowIsLast;
}
