import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { arenaContainerWidth, arenaReadBreakpoint } from '../../../ContainerSize';
import { ArenaActions } from '../../../ProjectionMarkers';
import { arenaPageHeadStyles } from './ArenaPageHead.variants';
import type { ArenaPageHeadAlign } from '../../../Api.generated';

@Component({
  selector: 'arena-page-head',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.title]': 'null',
  },
  template: `
    <div [class]="styles().titles()">
      <h1 [class]="styles().title()">{{ title() }}</h1>
      @if (subtitle(); as caption) {
        <p [class]="styles().subtitle()">{{ caption }}</p>
      }
    </div>
    @if (actions()) {
      <div [class]="styles().actions()"><ng-content select="[actions]" /></div>
    }
  `,
})
export class ArenaPageHead {
  /** The page title. Required: a page head with no title is a bug, not a state. */
  readonly title = input.required<string>();
  /** A muted line under the title. */
  readonly subtitle = input<string>();
  /** Cross-axis alignment of the actions block against the title, wide layout only. */
  readonly align = input<ArenaPageHeadAlign, ArenaPageHeadAlign | undefined>(
    'start',
    { transform: (value) => value ?? 'start' },
  );

  protected readonly actions = contentChild(ArenaActions);

  private readonly width = arenaContainerWidth();
  private readonly small = arenaReadBreakpoint('sm');

  protected readonly styles = computed(() => {
    const measured = this.width();
    return arenaPageHeadStyles({ narrow: measured !== null && measured < this.small, align: this.align() });
  });
}
