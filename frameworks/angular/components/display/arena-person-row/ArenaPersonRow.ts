import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { ArenaAvatar } from '../arena-avatar/ArenaAvatar';
import { ARENA_AVATAR_FACE } from '../arena-avatar/AvatarFace';
import { arenaPeopleListStyles } from '../arena-people-list/ArenaPeopleList.variants';
import manifest from '../arena-people-list/ArenaPeopleList.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';

@Component({
  selector: 'arena-person-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArenaSlotAttributes, ArenaAvatar],
  viewProviders: [{ provide: ARENA_AVATAR_FACE, useValue: true }],
  host: { style: 'display: contents', '[attr.name]': 'null' },
  template: `
    <li [class]="styles().row()" [arenaSlotData]="styles().$data.row()" [attr.data-arena-part]="parts.row" [attr.aria-current]="current() ? 'true' : null">
      @if (rank() !== undefined) {
        <span [class]="styles().rank()" [arenaSlotData]="styles().$data.rank()" [attr.data-arena-part]="parts.rank">{{ rank() }}</span>
      }
      <arena-avatar [name]="named()" [src]="src()" nameShown />
      <span [class]="styles().text()" [attr.data-arena-part]="parts.text">
        <span [class]="styles().name()" [arenaSlotData]="styles().$data.name()" [attr.data-arena-part]="parts.name">{{ named() }}</span>
        @if (secondary(); as line) {
          <span [class]="styles().secondary()" [arenaSlotData]="styles().$data.secondary()" [attr.data-arena-part]="parts.secondary">{{ line }}</span>
        }
      </span>
      @if (figure(); as value) {
        <span [class]="styles().figure()" [arenaSlotData]="styles().$data.figure()" [attr.data-arena-part]="parts.figure">{{ value }}</span>
      }
      <span [class]="styles().action()" [attr.data-arena-part]="parts.action" data-arena-boundary>
        <ng-content select="[action]" />
      </span>
    </li>
  `,
})
export class ArenaPersonRow {
  protected readonly parts = manifest.parts;

  /** The person or entity. It is the row's own text and the face's initials when there is no image, which is why one member carries both: a name spelt differently in either is the same person drawn as two. The face sets `nameShown`, so the row announces the name once, from its text. Required and guarded at runtime rather than defaulted, because nothing can derive who a row is about and a blank one draws a face, a rank and a figure around nobody. */
  readonly name = input.required<string>();
  /** The face's image. Absent, the row draws the initials `name` gives it, which is the same fallback ArenaAvatar states and the reason a row needs no second member for the picture. */
  readonly src = input<string>();
  /** One line under the name: a handle, a role, a team, why this person is being suggested. Prose rather than a value, so it is set in the body register and never in the numeric one. */
  readonly secondary = input<string>();
  /** The position this row holds, drawn in front of the face in a column wide enough for the list's longest. It is the number a standings list is read by, so it is set in the numeric register, and it says nothing about the order the rows are in: that is `ArenaPeopleList.ordered`. */
  readonly rank = input<number>();
  /** The quantity this row is about, drawn at the end: a score, a count, a share. A string rather than a number because the unit travels with it and a row reading "1815 XP" is one value and not two, which also keeps the formatting where the data is. */
  readonly figure = input<string>();
  /** Whether this row is the reader's own. It fills the row so it can be found without reading it, and it says so rather than only showing it, because a highlight nothing announces is a highlight half the readers do not get. */
  readonly current = input(false, { transform: booleanAttribute });

  protected readonly named = computed(() => {
    const name = this.name();
    if (name.trim() === '') {
      throw new Error('ArenaPersonRow: `name` is required (it is the row\'s text and the face\'s initials at once)');
    }
    return name;
  });

  protected readonly styles = computed(
    () => arenaPeopleListStyles({ current: this.current() }),
  );
}
