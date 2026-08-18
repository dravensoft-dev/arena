import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import type { ArenaHeadingLevel } from '../../../Api.generated';
import { ArenaActions } from '../../../ProjectionMarkers';
import { arenaChartCardStyles } from './ArenaChartCard.variants';
import manifest from './ArenaChartCard.classes.generated';

@Component({
  selector: 'arena-chart-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.title]': 'null',
  },
  template: `
    @if (title() || actions()) {
      <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
        @if (title(); as label) {
          @switch (headingLevel()) {
            @case ('h1') { <h1 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ label }}</h1> }
            @case ('h2') { <h2 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ label }}</h2> }
            @case ('h3') { <h3 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ label }}</h3> }
            @case ('h4') { <h4 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ label }}</h4> }
            @default { <span [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ label }}</span> }
          }
        }
        @if (actions()) {
          <div [class]="styles().actions()" [attr.data-arena-part]="parts.actions"><ng-content select="[actions]" /></div>
        }
      </div>
    }
    <ng-content />
  `,
})
export class ArenaChartCard {
  protected readonly parts = manifest.parts;

  /** The card heading. Absent renders no head unless `actions` is present. */
  readonly title = input<string>();
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it, the micro register this title is drawn in included. It is the one title on the ladder that defaults to `none`, because the ordinary chart card is a tile in a dashboard grid and a dozen tiles each opening a rung invents an outline where a page has one region; the chart inside carries its own accessible name, so nothing goes unnamed. A tile that genuinely IS a region of the page says which rung it takes, and `h3` is the card rung a chart card inside a section would want. */
  readonly headingLevel = input<ArenaHeadingLevel, ArenaHeadingLevel | undefined>(
    'none', { transform: (value) => value ?? 'none' },
  );

  protected readonly actions = contentChild(ArenaActions);

  protected readonly styles = computed(() => arenaChartCardStyles());
}
