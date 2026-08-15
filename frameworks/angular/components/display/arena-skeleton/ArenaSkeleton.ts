import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaSkeletonStyles } from './ArenaSkeleton.variants';
import manifest from './ArenaSkeleton.classes.generated';
import type { ArenaSkeletonVariant } from '../../../Api.generated';

export function arenaSkeletonRowSlot(row: number, total: number): 'line' | 'lastLine' {
  return row === total && total > 1 ? 'lastLine' : 'line';
}

@Component({
  selector: 'arena-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '[attr.data-arena-part]': 'parts.root',
    '[style.width]': 'hostWidth()',
    '[style.height]': 'hostHeight()',
    '[style.borderRadius]': 'hostRadius()',
    role: 'status',
    'aria-label': 'Loading',
  },
  template: `
    @if (stacked()) {
      @for (row of rows(); track row) {
        <div [class]="rowSlot(row, rows().length) === 'lastLine' ? styles().lastLine() : styles().line()"
             [attr.data-arena-part]="parts.line"></div>
      }
    }
  `,
})
export class ArenaSkeleton {
  protected readonly parts = manifest.parts;

  /** The shape the placeholder reserves. */
  readonly variant = input<ArenaSkeletonVariant, ArenaSkeletonVariant | undefined>(
    'block',
    { transform: (value) => value ?? 'block' },
  );
  /** Number of rows when variant="text". The last runs short. */
  readonly lines = input<number, number | undefined>(3, { transform: (value) => value ?? 3 });
  /** CSS width, e.g. "100%" or "12rem". Defaults to full width. */
  readonly width = input<string>();
  /** CSS height. Defaults per variant. For the `circle` variant a single diameter is what is wanted, so `height` wins over `width` when both are set. */
  readonly height = input<string>();
  /** CSS border radius. Defaults to a small token radius. */
  readonly radius = input<string>();

  protected readonly styles = computed(() => arenaSkeletonStyles({ variant: this.variant() }));
  protected readonly stacked = computed(() => this.variant() === 'text');
  protected readonly rows = computed(() => Array.from({ length: this.lines() }, (_, i) => i + 1));
  protected readonly hostClass = computed(() => (this.stacked() ? this.styles().stack() : this.styles().root()));
  protected readonly rowSlot = arenaSkeletonRowSlot;

  protected readonly diameter = computed<string | undefined>(() => this.height() || this.width());
  protected readonly hostWidth = computed<string | undefined>(() =>
    this.variant() === 'circle' ? this.diameter() : this.width());
  protected readonly hostHeight = computed<string | undefined>(() => {
    const v = this.variant();
    if (v === 'circle') return this.diameter();
    if (v === 'text') return undefined;
    return this.height();
  });
  protected readonly hostRadius = computed<string | undefined>(() =>
    this.variant() === 'block' ? this.radius() : undefined);
}
