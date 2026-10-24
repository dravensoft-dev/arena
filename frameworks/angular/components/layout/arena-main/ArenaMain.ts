import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { arenaMainStyles } from './ArenaMain.variants';
import manifest from './ArenaMain.classes.generated';
import { ARENA_MAIN_ID } from '../MainRegion';

export { ARENA_MAIN_ID } from '../MainRegion';

@Component({
  selector: 'arena-main',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <main [id]="id" tabindex="-1" [class]="styles().root()" [attr.data-arena-part]="parts.root" data-arena-boundary>
      <ng-content />
    </main>
  `,
})
export class ArenaMain {
  protected readonly parts = manifest.parts;
  protected readonly id = ARENA_MAIN_ID;

  protected readonly styles = computed(() => arenaMainStyles());
}
