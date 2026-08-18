import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import type { ArenaHeadingLevel } from '../../../Api.generated';
import { ArenaAction } from '../../../ProjectionMarkers';
import { arenaEmptyStateStyles } from './ArenaEmptyState.variants';
import manifest from './ArenaEmptyState.classes.generated';

@Component({
  selector: 'arena-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.title]': 'null',
  },
  template: `
    @if (icon(); as glyph) {
      <div [class]="styles().icon()" [attr.data-arena-part]="parts.icon"><i [class]="glyph" aria-hidden="true"></i></div>
    }
    @if (title(); as heading) {
      @switch (level()) {
        @case ('h1') { <h1 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</h1> }
        @case ('h2') { <h2 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</h2> }
        @case ('h4') { <h4 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</h4> }
        @default { <h3 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</h3> }
      }
    }
    @if (message(); as body) {
      <div [class]="styles().message()" [attr.data-arena-part]="parts.message">{{ body }}</div>
    }
    @if (action()) {
      <div [class]="styles().action()" [attr.data-arena-part]="parts.action"><ng-content select="[action]" /></div>
    }
  `,
})
export class ArenaEmptyState {
  protected readonly parts = manifest.parts;

  /** A Phosphor class name for the glyph Arena draws, muted. */
  readonly icon = input<string>();
  /** The headline: what is empty. */
  readonly title = input.required<string>();
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h3`, the card rung of the title ladder, because an empty state fills the body of a region something above it already names, so its headline sits under that name rather than beside it. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. */
  readonly headingLevel = input<ArenaHeadingLevel, ArenaHeadingLevel | undefined>(
    'h3', { transform: (value) => value ?? 'h3' },
  );
  /** A sentence of guidance under the title. */
  readonly message = input<string>();

  protected readonly action = contentChild(ArenaAction);

  protected readonly level = computed(() => {
    const level = this.headingLevel();
    if (level === 'none') {
      throw new Error('ArenaEmptyState: `headingLevel` cannot be none, because `title` is required and is the headline a reader lands on');
    }
    return level;
  });

  protected readonly styles = computed(() => arenaEmptyStateStyles());
}
