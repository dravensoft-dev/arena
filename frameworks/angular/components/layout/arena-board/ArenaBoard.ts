import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaBoardStyles } from './ArenaBoard.variants';
import manifest from './ArenaBoard.classes.generated';

@Component({
  selector: 'arena-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-arena-boundary': '',
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    role: 'group',
    tabindex: '0',
    '[attr.aria-label]': 'named()',
  },
  template: `<ng-content />`,
})
export class ArenaBoard {
  protected readonly parts = manifest.parts;

  /** Names the board to assistive technology: what the columns are columns OF. "Sprint 32 tasks by status", never "Board". Required and guarded at runtime after trimming, the shape ArenaScroller.label carries for the same reason, since a group announced as a group tells a reader that focus moved and nothing about where it landed. */
  readonly label = input.required<string>();

  protected readonly named = computed(() => {
    const name = this.label();
    if (name.trim() === '') {
      throw new Error('ArenaBoard: `label` is required, and it names what the columns are columns of');
    }
    return name;
  });

  protected readonly styles = computed(() => arenaBoardStyles());
}
