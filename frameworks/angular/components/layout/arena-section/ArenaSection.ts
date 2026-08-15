import {
  ChangeDetectionStrategy, Component, ElementRef, computed, contentChild, input, viewChild,
} from '@angular/core';
import type { ArenaSectionRhythm } from '../../../Api.generated';
import { ArenaAction } from '../../../ProjectionMarkers';
import { arenaSectionStyles } from './ArenaSection.variants';

@Component({
  selector: 'arena-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'styles().root()', '[attr.title]': 'null' },
  template: `
    <div [class]="styles().head()">
      <div [class]="styles().titles()">
        @if (eyebrow(); as label) { <div [class]="styles().eyebrow()">{{ label }}</div> }
        <h2 [class]="styles().title()">{{ heading() }}</h2>
        @if (description(); as line) { <p [class]="styles().description()">{{ line }}</p> }
      </div>
      @if (action()) { <div [class]="styles().action()"><ng-content select="[action]" /></div> }
    </div>
    <div #body [class]="styles().body()"><ng-content /></div>
  `,
})
export class ArenaSection {
  /** Names the region, both on screen and to assistive technology. Required, and guarded at runtime after trimming: a section is a heading over a group, and one with no heading is a stack, which css/rhythm.css already ships as a class. The guard trims first because the value it exists to catch is a present and useless one, not an absent one, which the type already refuses. */
  readonly title = input.required<string>();
  /** A line above the title saying which part of the page this is. Same register as every other eyebrow in the system, so a voice that takes them out of the console's mono capitals takes this one with them. */
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
