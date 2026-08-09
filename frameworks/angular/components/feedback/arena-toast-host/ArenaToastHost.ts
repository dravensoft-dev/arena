import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ArenaToastPlacement } from '../../../Api.generated';
import { arenaToastHostStyles } from './ArenaToastHost.variants';

@Component({
  selector: 'arena-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
  },
  template: `<ng-content />`,
})
export class ArenaToastHost {
  /** Which corner the stack is pinned to. A bottom placement clears the device's own bottom inset, so a stack on a phone never lands under the home indicator. */
  readonly placement = input<ArenaToastPlacement, ArenaToastPlacement | undefined>(
    'bottom-end',
    { transform: (value) => value ?? 'bottom-end' },
  );

  protected readonly styles = computed(() => arenaToastHostStyles({ placement: this.placement() }));
}
