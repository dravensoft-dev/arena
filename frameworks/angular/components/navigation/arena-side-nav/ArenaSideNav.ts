import {
  ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute, output, signal,
} from '@angular/core';
import { ArenaSideNavState } from './ArenaSideNavState';
import { arenaSideNavStyles } from './ArenaSideNav.variants';
import manifest from './ArenaSideNav.classes.generated';

@Component({
  selector: 'arena-side-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ArenaSideNavState],
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    role: 'navigation',
    '[attr.aria-label]': 'label()',
  },
  template: `<ng-content />`,
})
export class ArenaSideNav {
  protected readonly parts = manifest.parts;

  /** The id of the current destination. The ArenaSideNavItem whose id matches is marked aria-current="page", and no item is marked when it names none of them. */
  readonly active = input<string>();
  /** Names this navigation landmark. Required, and guarded at runtime: the guard trims before it decides, so a blank name is refused as well as an absent one, because ariaLabel="" renders a landmark with no accessible name, which is the defect arriving through a value that is present. Guarded rather than defaulted: the navigation pattern asks each landmark on a page for a UNIQUE name, and a constant default satisfies the existence half while two sidebars on one page stay indistinguishable. Nothing can derive it either; what a nav is FOR is editorial. Say what it navigates -- "Primary", "Project settings" -- the ArenaTable.label and ArenaSegmentedControl.ariaLabel shape. */
  readonly ariaLabel = input.required<string>();
  /** How far each nesting level indents, as a MULTIPLIER of --sp-1 rather than a length: the row at depth N is padded calc(var(--sp-1) * 3 + var(--sp-1) * indentStep * N). A CSS string was rejected -- a caller-supplied "1.5rem" is neither a token nor a derivation of one, so it would stop re-densifying inside .arena-compact, and no gate would catch it because the gate that forbids a bare length scans source and not the values a caller passes in. */
  readonly indentStep = input(3, { transform: numberAttribute });
  /** An item was activated, carrying its id. It carries the id alone, on the ArenaBreadcrumbs precedent that the platform event leaves the payload and the item travels by itself, and under the compound shape there is no item datum left to carry either, because the consumer wrote the element and already holds everything on it. Where the item has an href, Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate; ctrl-click, middle-click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a working column of real links. */
  readonly nav = output<string>();

  private readonly state = inject(ArenaSideNavState);

  protected readonly label = computed(() => {
    const name = this.ariaLabel();
    if (name.trim() === '') {
      throw new Error('ArenaSideNav: `ariaLabel` is required, and names which navigation this landmark is');
    }
    return name;
  });

  protected readonly styles = computed(() => arenaSideNavStyles());

  constructor() {
    this.state.depth = signal(0);
    this.state.activeId = this.active;
    this.state.indentStep = this.indentStep;
    this.state.activate = (id: string) => this.nav.emit(id);
  }
}
