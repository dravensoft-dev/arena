import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ArenaGridGap } from '../../../Api.generated';
import { arenaGridStyles } from './ArenaGrid.variants';

@Component({
  selector: 'arena-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[style.gridTemplateColumns]': 'tracks()',
    '[style.maxWidth]': 'maxWidth()',
  },
  template: `<ng-content />`,
})
export class ArenaGrid {
  /** The narrowest a cell may be before the count drops. It is the one number this component takes and it is page geometry rather than a step on the spacing scale, which models rhythm and not the width of a card. It is clamped against the container, so a minimum wider than the room available yields one full-width column instead of overflowing it. The default is a role rather than the arithmetic it used to spell, so a style plugin can answer how many cards a viewport shows: a gallery wants a dense wall and a ledger wants a wide column, from the same markup. */
  readonly min = input<string, string | undefined>(
    'calc(var(--sp-1) * 50)',
    { transform: (value) => value ?? 'var(--grid-min)' },
  );
  /** The air between cells, on both axes. Named steps rather than a length, because rhythm is what the spacing scale is for and a grid is where a hand-picked one shows worst. Its steps are the page rhythm scale itself, so sm groups related cells, md sets two peers apart and lg reads as two sections, and none closes the gap entirely; a grid is that rhythm plus a grid, and nothing here is a number this component chose. */
  readonly gap = input<ArenaGridGap, ArenaGridGap | undefined>('md', { transform: (value) => value ?? 'md' });
  /** A ceiling on the grid's own width, centred in whatever contains it. Absent, it fills its container, which is what a grid nested inside a page should do; a page's own reading width is what this is for. */
  readonly maxWidth = input<string>();

  protected readonly tracks = computed(() => `repeat(auto-fit, minmax(min(${this.min()}, 100%), 1fr))`);
  protected readonly styles = computed(() => arenaGridStyles({ gap: this.gap(), centred: this.maxWidth() !== undefined }));
}
