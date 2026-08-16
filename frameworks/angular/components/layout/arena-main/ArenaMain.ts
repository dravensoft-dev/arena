import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { arenaMainStyles } from './ArenaMain.variants';
import manifest from './ArenaMain.classes.generated';

export const ARENA_MAIN_ID = 'arena-main';

@Component({
  selector: 'arena-main',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <main [id]="id" tabindex="-1" [class]="styles().root()" [attr.data-arena-part]="parts.root">
      <ng-content />
    </main>
  `,
})
export class ArenaMain {
  protected readonly parts = manifest.parts;
  protected readonly id = ARENA_MAIN_ID;

  protected readonly styles = computed(() => arenaMainStyles());
}
