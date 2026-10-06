import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { arenaPeopleListStyles } from './ArenaPeopleList.variants';
import manifest from './ArenaPeopleList.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';

@Component({
  selector: 'arena-people-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [ArenaSlotAttributes, NgTemplateOutlet],
  template: `
    <ng-template #rows><ng-content /></ng-template>
    @if (ordered()) {
      <ol [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root" data-arena-boundary [attr.aria-label]="named()">
        <ng-container [ngTemplateOutlet]="rows" />
      </ol>
    } @else {
      <ul [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root" data-arena-boundary [attr.aria-label]="named()">
        <ng-container [ngTemplateOutlet]="rows" />
      </ul>
    }
  `,
})
export class ArenaPeopleList {
  protected readonly parts = manifest.parts;

  /** Names the list for assistive technology: what these people are a list OF, never that they are people. "Ruby league standings", "Suggested accounts", never "People". Required and guarded at runtime rather than defaulted, because nothing can derive it and a name that only says what the component is satisfies the requirement mechanically while telling a screen-reader user nothing: two lists on one page announce identically. */
  readonly label = input.required<string>();
  /** Whether the order is part of the meaning. A standings table read in any other order is a different claim, and its rows are numbered; a set of suggestions is a set. It is a declared input rather than something inferred from the rows carrying a `rank`, because Arena never derives what it draws from what a consumer happened to pass, and a numbered list whose numbers are decoration is a lie told to a screen reader. */
  readonly ordered = input(false, { transform: booleanAttribute });

  protected readonly named = computed(() => {
    const name = this.label();
    if (name.trim() === '') {
      throw new Error('ArenaPeopleList: `label` is required, and it names what these people are a list of');
    }
    return name;
  });

  protected readonly styles = computed(() => arenaPeopleListStyles({}));
}
