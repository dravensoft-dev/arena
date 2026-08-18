import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { arenaContainerWidth, arenaReadBreakpoint } from '../../../ContainerSize';
import { ArenaActions } from '../../../ProjectionMarkers';
import { arenaPageHeadStyles } from './ArenaPageHead.variants';
import manifest from './ArenaPageHead.classes.generated';
import type { ArenaHeadingLevel, ArenaPageHeadAlign } from '../../../Api.generated';

@Component({
  selector: 'arena-page-head',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.title]': 'null',
  },
  template: `
    <div [class]="styles().titles()" [attr.data-arena-part]="parts.titles">
      @switch (level()) {
        @case ('h2') { <h2 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</h2> }
        @case ('h3') { <h3 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</h3> }
        @case ('h4') { <h4 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</h4> }
        @default { <h1 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ title() }}</h1> }
      }
      @if (subtitle(); as caption) {
        <p [class]="styles().subtitle()" [attr.data-arena-part]="parts.subtitle">{{ caption }}</p>
      }
    </div>
    @if (actions()) {
      <div [class]="styles().actions()" [attr.data-arena-part]="parts.actions"><ng-content select="[actions]" /></div>
    }
  `,
})
export class ArenaPageHead {
  protected readonly parts = manifest.parts;

  /** The page title. Required: a page head with no title is a bug, not a state. */
  readonly title = input.required<string>();
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h1` because a page head is the page's own title and the screen it heads carries no other. Under a hero, the one rung above it on the title ladder, it takes `h2` and leaves the page's single `h1` to the hero; that is the one arrangement where the default is wrong, and it is a member rather than something read off the page, because what a component renders is never derived from what sits above it. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. */
  readonly headingLevel = input<ArenaHeadingLevel, ArenaHeadingLevel | undefined>(
    'h1', { transform: (value) => value ?? 'h1' },
  );
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

  protected readonly level = computed(() => {
    const level = this.headingLevel();
    if (level === 'none') {
      throw new Error('ArenaPageHead: `headingLevel` cannot be none, because `title` is required and is the page\'s own title');
    }
    return level;
  });

  protected readonly styles = computed(() => {
    const measured = this.width();
    return arenaPageHeadStyles({ narrow: measured !== null && measured < this.small, align: this.align() });
  });
}
