import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ArenaBottomNavState } from './ArenaBottomNavState';
import { arenaBottomNavStyles } from './ArenaBottomNav.variants';
import manifest from './ArenaBottomNav.classes.generated';

@Component({
  selector: 'arena-bottom-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaBottomNavState],
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    role: 'navigation',
    '[attr.aria-label]': 'name()',
  },
  template: `<ng-content />`,
})
export class ArenaBottomNav {
  protected readonly parts = manifest.parts;

  /** The id of the current destination. The ArenaBottomNavItem whose id matches is marked aria-current="page" and draws its glyph in the filled weight, and no item is marked when it names none of them. */
  readonly active = input<string>();
  /** Names this navigation landmark. Required, and **guarded at runtime**: the guard trims before it decides, so a blank name is refused as well as an absent one, because a landmark present with no accessible name is the defect arriving through a value. A phone shell usually carries this bar AND a sidebar or a header, so two navigation landmarks share a page and the pattern asks each for a unique name; a constant default would satisfy the existence half and leave them indistinguishable. */
  readonly ariaLabel = input.required<string>();
  /** A destination was activated, carrying its id. Where the item has an href, Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate; a modified click, a middle click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a bar of real links. */
  readonly nav = output<string>();

  private readonly state = inject(ArenaBottomNavState);

  protected readonly name = computed(() => {
    const label = this.ariaLabel();
    if (label.trim() === '') {
      throw new Error('ArenaBottomNav: `ariaLabel` is required, and names which navigation this landmark is');
    }
    return label;
  });

  protected readonly styles = computed(() => arenaBottomNavStyles());

  constructor() {
    this.state.activeId = this.active;
    this.state.activate = (id: string) => this.nav.emit(id);
  }
}
