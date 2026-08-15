import {
  ChangeDetectionStrategy, Component, ElementRef, computed, inject, input,
} from '@angular/core';
import type { ArenaScrollerBehaviour } from '../../../Api.generated';
import { arenaScrollerStyles } from './ArenaScroller.variants';

@Component({
  selector: 'arena-scroller',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    role: 'group',
    tabindex: '0',
    '[attr.aria-label]': 'name()',
    '[style.--arena-scroller-item]': 'itemWidth()',
  },
  template: `<ng-content />`,
})
export class ArenaScroller {
  /** Names the row to assistive technology, and nothing else supplies it: a group announced as a group tells a reader that focus moved and nothing about where it landed. Required, and guarded at runtime after trimming, the shape ArenaTable.label carries for the same reason, since the value the guard exists to catch is a present and useless one. */
  readonly label = input.required<string>();
  /** How wide each item is laid out, which a rail has to answer and a grid answers with the same role: the width of a card is one decision, and a wall of them and a row of them should not disagree about it. It is a length rather than a step on the spacing scale, for the reason ArenaGrid.min is one, and it reaches the children as a custom property because a row sets its items' width and cannot reach inside them. */
  readonly itemWidth = input<string, string | undefined>(
    'var(--grid-min)', { transform: (value) => value ?? 'var(--grid-min)' },
  );
  /** Whether the row settles on an item or wherever it was left. Snap by default, because a rail of equal-width cards left halfway across one is a card the reader has to finish scrolling by hand. Nothing moves on its own under either value, so neither answers prefers-reduced-motion and no pause control is owed. */
  readonly behaviour = input<ArenaScrollerBehaviour, ArenaScrollerBehaviour | undefined>(
    'snap', { transform: (value) => value ?? 'snap' },
  );

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly name = computed(() => {
    const text = this.label();
    if (text.trim() === '') {
      throw new Error('ArenaScroller: `label` is required, and names the row a reader lands on');
    }
    return text;
  });

  protected readonly styles = computed(() => arenaScrollerStyles({ behaviour: this.behaviour() }));

  protected ngAfterContentInit(): void {
    const element = this.host.nativeElement as HTMLElement;
    if (element.children.length === 0) {
      throw new Error('ArenaScroller: a row with no children is a tab stop over nothing');
    }
  }
}
