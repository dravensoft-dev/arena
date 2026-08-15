import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import type { ArenaHeroAlign, ArenaHeroLayout } from '../../../Api.generated';
import { ArenaActions, ArenaFigureSlot } from '../../../ProjectionMarkers';
import { arenaHeroStyles } from './ArenaHero.variants';
import manifest from './ArenaHero.classes.generated';

const SPLIT_MIN = 'calc(var(--grid-min) * 1.5)';

@Component({
  selector: 'arena-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[style.gridTemplateColumns]': 'tracks()',
    '[attr.title]': 'null',
  },
  template: `
    <div [class]="styles().words()" [attr.data-arena-part]="parts.words">
      @if (eyebrow(); as label) { <p [class]="styles().eyebrow()" [attr.data-arena-part]="parts.eyebrow">{{ label }}</p> }
      <h1 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading() }}</h1>
      @if (lede(); as line) { <p [class]="styles().lede()" [attr.data-arena-part]="parts.lede">{{ line }}</p> }
      @if (actions()) { <div [class]="styles().actions()" [attr.data-arena-part]="parts.actions"><ng-content select="[actions]" /></div> }
    </div>
    @if (figure()) { <div [class]="styles().figure()" [attr.data-arena-part]="parts.figure"><ng-content select="[figure]" /></div> }
  `,
})
export class ArenaHero {
  protected readonly parts = manifest.parts;

  /** The one line the page is built around. Required, and guarded at runtime after trimming: a hero is that line plus its setting, and a hero without it is a figure with buttons under it. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. */
  readonly title = input.required<string>();
  /** A line above the title saying what kind of page this is. Same register as every other eyebrow in the system, so a style plugin that takes them out of the console's mono capitals takes this one with them. */
  readonly eyebrow = input<string>();
  /** The paragraph under the title, held to a reading width rather than to the column's, because a line that runs the whole width of a hero loses its return sweep. Named lede and not description, since this is the sentence that carries the page and not a note about the heading. */
  readonly lede = input<string>();
  /** How the words sit against the figure. Split puts them side by side and falls to one column when the room runs out, with no breakpoint deciding when; stacked keeps them in one column at every width, for a hero whose figure is a band rather than a partner; bleed lays the words on the figure, over the wash the media overlay role paints, which is the arrangement that needs that role to be readable. */
  readonly layout = input<ArenaHeroLayout, ArenaHeroLayout | undefined>(
    'split', { transform: (value) => value ?? 'split' },
  );
  /** Whether the words run from the start edge or are centred in their column. Centred is what a bleed hero usually wants and a split one usually does not, and it is a separate decision from the layout because a stacked hero can want either. */
  readonly align = input<ArenaHeroAlign, ArenaHeroAlign | undefined>(
    'start', { transform: (value) => value ?? 'start' },
  );

  protected readonly actions = contentChild(ArenaActions);
  protected readonly figure = contentChild(ArenaFigureSlot);

  protected readonly heading = computed(() => {
    const text = this.title();
    if (text.trim() === '') {
      throw new Error('ArenaHero: `title` is required, and names the page it opens');
    }
    return text;
  });

  protected readonly tracks = computed(() => (this.layout() === 'split'
    ? `repeat(auto-fit, minmax(min(${SPLIT_MIN}, 100%), 1fr))`
    : null));

  protected readonly styles = computed(() => arenaHeroStyles({ layout: this.layout(), align: this.align() }));
}
