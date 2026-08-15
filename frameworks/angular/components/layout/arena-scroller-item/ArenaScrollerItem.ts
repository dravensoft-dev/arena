import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { arenaScrollerItemStyles } from './ArenaScrollerItem.variants';
import manifest from './ArenaScrollerItem.classes.generated';

@Component({
  selector: 'arena-scroller-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root', },
  template: `<ng-content />`,
})
export class ArenaScrollerItem {
  protected readonly parts = manifest.parts;

  protected readonly styles = computed(() => arenaScrollerItemStyles());
}
