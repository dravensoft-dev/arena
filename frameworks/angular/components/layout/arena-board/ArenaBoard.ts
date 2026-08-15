import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaBoardStyles } from './ArenaBoard.variants';
import manifest from './ArenaBoard.classes.generated';

@Component({
  selector: 'arena-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    role: 'group',
    tabindex: '0',
    '[attr.aria-label]': 'named()',
    '[style.--arena-board-column]': 'minColumn()',
  },
  template: `<ng-content />`,
})
export class ArenaBoard {
  protected readonly parts = manifest.parts;

  /** Names the board to assistive technology: what the columns are columns OF. "Sprint 32 tasks by status", never "Board". Required and guarded at runtime after trimming, the shape ArenaScroller.label carries for the same reason, since a group announced as a group tells a reader that focus moved and nothing about where it landed. */
  readonly label = input.required<string>();
  /** The narrowest a column may be before the board scrolls rather than squeezing. Columns share the room equally above it, so a board of four fills the width it is given and a board of twelve scrolls. It is a length rather than a step on the spacing scale, for the reason ArenaGrid.min is one: this is page geometry and the spacing scale models rhythm. The default is the same role a grid's cell reads, so a card is one width across a wall, a rail and a board. */
  readonly minColumn = input<string, string | undefined>(
    'var(--grid-min)',
    { transform: (value) => value ?? 'var(--grid-min)' },
  );

  protected readonly named = computed(() => {
    const name = this.label();
    if (name.trim() === '') {
      throw new Error('ArenaBoard: `label` is required, and it names what the columns are columns of');
    }
    return name;
  });

  protected readonly styles = computed(() => arenaBoardStyles());
}
