import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ArenaCatSlot } from '../../../Api.generated';
import { arenaCatColor } from '../../../DataVisuals';
import { arenaBoardStyles } from '../arena-board/ArenaBoard.variants';
import manifest from '../arena-board/ArenaBoard.classes.generated';

@Component({
  selector: 'arena-board-column',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents', '[attr.title]': 'null' },
  template: `
    <section [class]="styles().column()" [attr.data-arena-part]="parts.column"
             role="group" [attr.aria-label]="named()"
             [style.--arena-board-column-cat]="catColour()">
      <div [class]="styles().head()" [attr.data-arena-part]="parts.head">
        @if (colorId() !== undefined) {
          <span aria-hidden="true" [class]="styles().dot()" [attr.data-arena-part]="parts.dot"></span>
        }
        <span [class]="styles().title()" [attr.data-arena-part]="parts.title">{{ named() }}</span>
        @if (count() !== undefined) {
          <span [class]="styles().count()" [attr.data-arena-part]="parts.count">{{ count() }}</span>
        }
        <span [class]="styles().action()" [attr.data-arena-part]="parts.action">
          <ng-content select="[action]" />
        </span>
      </div>
      @if (summary(); as line) {
        <span [class]="styles().summary()" [attr.data-arena-part]="parts.summary">{{ line }}</span>
      }
      <div [class]="styles().stack()" [attr.data-arena-part]="parts.stack">
        <ng-content />
      </div>
      <div [class]="styles().foot()" [attr.data-arena-part]="parts.foot">
        <ng-content select="[footer]" />
      </div>
    </section>
  `,
})
export class ArenaBoardColumn {
  protected readonly parts = manifest.parts;

  /** What this column is: a status, a stage, a person, a day. It is the head's text and the column's accessible name at once. Required and guarded at runtime rather than defaulted, because a column of a board is only ever read by what it groups, and an unnamed one is a pile. */
  readonly title = input.required<string>();
  /** How many things are in the column, drawn beside the title in the numeric register. It is passed rather than counted, because Arena never derives what it draws from what a consumer projected: the column holds the consumer's own elements, one of which may be a placeholder and none of which Arena can read. */
  readonly count = input<number>();
  /** One line under the head: the total the column adds up to, an estimate, a limit. A string rather than a number because the unit travels with it, and a column reading "19 pts" is one value and not two. */
  readonly summary = input<string>();
  /** An identity colour for the column, from the same categorical ramp ArenaTag and the charts read, so a status keeps its colour between a board, a table and a chart. It inks the head's mark and reaches the column as a custom property, `--arena-board-column-cat`, so an appearance that fills the whole head with it is a style plugin's to write and needs no member here. */
  readonly colorId = input<ArenaCatSlot>();

  protected readonly named = computed(() => {
    const name = this.title();
    if (name.trim() === '') {
      throw new Error('ArenaBoardColumn: `title` is required (it is the head and the column\'s accessible name at once)');
    }
    return name;
  });

  protected readonly catColour = computed(() => {
    const slot = this.colorId();
    return slot === undefined ? null : arenaCatColor(slot);
  });

  protected readonly styles = computed(() => arenaBoardStyles({ identity: this.colorId() !== undefined }));
}
