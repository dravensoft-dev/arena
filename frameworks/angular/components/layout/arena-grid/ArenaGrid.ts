import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { arenaGridStyles } from './ArenaGrid.variants';
import manifest from './ArenaGrid.classes.generated';

@Component({
  selector: 'arena-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-arena-boundary': '',
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
  },
  template: `<ng-content />`,
})
export class ArenaGrid {
  protected readonly parts = manifest.parts;
  protected readonly styles = computed(() => arenaGridStyles());
}
