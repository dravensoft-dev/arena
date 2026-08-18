import {
  ChangeDetectionStrategy, Component, ElementRef, computed, contentChild, input, viewChild,
} from '@angular/core';
import type { ArenaHeadingLevel, ArenaSectionRhythm } from '../../../Api.generated';
import { ArenaAction } from '../../../ProjectionMarkers';
import { arenaSectionStyles } from './ArenaSection.variants';
import manifest from './ArenaSection.classes.generated';

@Component({
  selector: 'arena-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root', '[attr.title]': 'null' },
  template: `
    <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
      <div [class]="styles().titles()" [attr.data-arena-part]="parts.titles">
        @if (eyebrow(); as label) { <div [class]="styles().eyebrow()" [attr.data-arena-part]="parts.eyebrow">{{ label }}</div> }
        @switch (level()) {
          @case ('h1') { <h1 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading() }}</h1> }
          @case ('h3') { <h3 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading() }}</h3> }
          @case ('h4') { <h4 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading() }}</h4> }
          @default { <h2 [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ heading() }}</h2> }
        }
        @if (description(); as line) { <p [class]="styles().description()" [attr.data-arena-part]="parts.description">{{ line }}</p> }
      </div>
      @if (action()) { <div [class]="styles().action()" [attr.data-arena-part]="parts.action"><ng-content select="[action]" /></div> }
    </div>
    <div #body [class]="styles().body()" [attr.data-arena-part]="parts.body"><ng-content /></div>
  `,
})
export class ArenaSection {
  protected readonly parts = manifest.parts;

  /** Names the region, both on screen and to assistive technology. Required, and guarded at runtime after trimming: a section is a heading over a group, and one with no heading is a stack, which css/rhythm.css already ships as a class. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. */
  readonly title = input.required<string>();
  /** Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h2` because the section register is already a step under a page's title and a step over a card's, and this is that register said as structure rather than as a size. `none` is refused at runtime, the rule every component whose `title` is required follows: a title required because it names the thing it draws cannot also be told that the name is not one. */
  readonly headingLevel = input<ArenaHeadingLevel, ArenaHeadingLevel | undefined>(
    'h2', { transform: (value) => value ?? 'h2' },
  );
  /** A line above the title saying which part of the page this is. Same register as every other eyebrow in the system, so a style plugin that takes them out of the console's mono capitals takes this one with them. */
  readonly eyebrow = input<string>();
  /** A line under the title, in the muted ink. It sits below the head row rather than beside the title, because a sentence and an action competing for the same row is what makes a head wrap on a narrow screen. */
  readonly description = input<string>();
  /** How far the head stands from the body. The steps are the page rhythm scale itself, so sm reads as one unit, md as a head over its own content and lg as a head over a region of the page, and none closes the distance entirely for a section whose body carries its own top edge. Nothing here is a number this component chose. */
  readonly rhythm = input<ArenaSectionRhythm, ArenaSectionRhythm | undefined>(
    'md', { transform: (value) => value ?? 'md' },
  );

  protected readonly action = contentChild(ArenaAction);
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  protected readonly heading = computed(() => {
    const text = this.title();
    if (text.trim() === '') {
      throw new Error('ArenaSection: `title` is required, and names the region its heading introduces');
    }
    return text;
  });

  protected readonly level = computed(() => {
    const level = this.headingLevel();
    if (level === 'none') {
      throw new Error('ArenaSection: `headingLevel` cannot be none, because `title` is required and names the region its heading introduces');
    }
    return level;
  });

  protected readonly styles = computed(() => arenaSectionStyles({ rhythm: this.rhythm() }));

  protected ngAfterContentInit(): void {
    if (this.projected().length === 0) {
      throw new Error('ArenaSection: a section with no children is not a legal shape, because its heading would name nothing');
    }
  }

  private projected(): ChildNode[] {
    const element = this.body().nativeElement;
    return [...element.childNodes].filter(
      (node) => node.nodeType !== node.TEXT_NODE || (node.textContent ?? '').trim() !== '',
    );
  }
}
