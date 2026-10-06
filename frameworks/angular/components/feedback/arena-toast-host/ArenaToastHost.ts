import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { arenaToastHostStyles } from './ArenaToastHost.variants';
import manifest from './ArenaToastHost.classes.generated';

@Component({
  selector: 'arena-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-arena-boundary': '',
    '[class]': 'styles().root()',
    '[attr.data-arena-surface]': "'floating'",
    '[attr.data-arena-part]': 'parts.root',
  },
  template: `<ng-content />`,
})
export class ArenaToastHost {
  protected readonly parts = manifest.parts;

  protected readonly styles = computed(() => arenaToastHostStyles());
}
