import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { arenaScrollerItemStyles } from './ArenaScrollerItem.variants';

@Component({
  selector: 'arena-scroller-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()' },
  template: `<ng-content />`,
})
export class ArenaScrollerItem {
  protected readonly styles = computed(() => arenaScrollerItemStyles());
}
