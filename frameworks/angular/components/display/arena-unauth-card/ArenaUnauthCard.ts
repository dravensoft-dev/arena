import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import type { ArenaHeadingLevel } from '../../../Api.generated';
import { ArenaCard } from '../arena-card/ArenaCard';
import { ArenaBrand, ArenaFooter } from '../../../ProjectionMarkers';
import { arenaUnauthCardStyles } from './ArenaUnauthCard.variants';
import manifest from './ArenaUnauthCard.classes.generated';

@Component({
  selector: 'arena-unauth-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.title]': 'null',
  },
  imports: [ArenaCard],
  template: `
    <arena-card>
      <div [class]="styles().body()" [attr.data-arena-part]="parts.body">
        @if (brand()) {
          <div [class]="styles().brand()" [attr.data-arena-part]="parts.brand"><ng-content select="[brand]" /></div>
        }
        @if (eyebrow(); as label) {
          <div [class]="styles().eyebrow()" [attr.data-arena-part]="parts.eyebrow">{{ label }}</div>
        }
        @if (title(); as heading) {
          @switch (headingLevel()) {
            @case ('h1') { <h1 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</h1> }
            @case ('h2') { <h2 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</h2> }
            @case ('h3') { <h3 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</h3> }
            @case ('h4') { <h4 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</h4> }
            @default { <div [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading }}</div> }
          }
        }
        <ng-content />
        @if (footer()) {
          <div [class]="styles().footer()" [attr.data-arena-part]="parts.footer"><ng-content select="[footer]" /></div>
        }
      </div>
    </arena-card>
  `,
})
export class ArenaUnauthCard {
  protected readonly parts = manifest.parts;

  /** Mono crimson microlabel: the product, not the task. */
  readonly eyebrow = input<string>();
  /** The task. "Welcome back", "Check your inbox". */
  readonly title = input<string>();
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h2` because this title is drawn in the section register rather than the card one, so the outline follows the register the same way every other title on the ladder does. A signed-out screen whose only title is this one says `h1` and gets the page's one heading, which is the case the member exists for. `none` takes the title out of the outline entirely; with no title there is no heading either way. */
  readonly headingLevel = input<ArenaHeadingLevel, ArenaHeadingLevel | undefined>(
    'h2', { transform: (value) => value ?? 'h2' },
  );

  protected readonly brand = contentChild(ArenaBrand);
  protected readonly footer = contentChild(ArenaFooter);

  protected readonly styles = computed(() => arenaUnauthCardStyles());
}
