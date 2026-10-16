import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ArenaTimelineItem } from '../../../Api.generated';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaTimelineGlyph, arenaTimelineState, arenaTimelineTone } from './TimelineGlyphs';
import { arenaTimelineStyles } from './ArenaTimeline.variants';
import manifest from './ArenaTimeline.classes.generated';

@Component({
  selector: 'arena-timeline',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @if (rows().length > 0) {
      <ol role="list" [attr.aria-label]="name()" [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root">
        @for (row of rows(); track row.item.id ?? $index) {
          <li [attr.aria-current]="row.state === 'current' ? 'step' : null" [class]="row.styles.item()" [arenaSlotData]="row.styles.$data.item()" [attr.data-arena-part]="parts.item">
            <span aria-hidden="true" [class]="row.styles.rail()" [arenaSlotData]="row.styles.$data.rail()" [attr.data-arena-part]="parts.rail">
              <span [class]="row.styles.dot()" [arenaSlotData]="row.styles.$data.dot()" [attr.data-arena-part]="parts.dot">@if (row.glyph) {<i [class]="row.glyph + ' ' + row.styles.icon()" [arenaSlotData]="row.styles.$data.icon()" [attr.data-arena-part]="parts.icon"></i>}</span>
              @if (!row.last) {
                <span [class]="row.styles.connector()" [arenaSlotData]="row.styles.$data.connector()" [attr.data-arena-part]="parts.connector"></span>
              }
            </span>
            <div [class]="row.styles.content()" [arenaSlotData]="row.styles.$data.content()" [attr.data-arena-part]="parts.content">
              @if (row.word) {
                <span [class]="row.styles.name()" [arenaSlotData]="row.styles.$data.name()" [attr.data-arena-part]="parts.name">{{ row.word }}</span>
              }
              <span [class]="row.styles.title()" [arenaSlotData]="row.styles.$data.title()" [attr.data-arena-part]="parts.title">{{ row.item.title }}</span>
              @if (row.item.description) {
                <span [class]="row.styles.description()" [arenaSlotData]="row.styles.$data.description()" [attr.data-arena-part]="parts.description">{{ row.item.description }}</span>
              }
              @if (row.item.time; as stamp) {
                @if (row.item.dateTime) {
                  <time [attr.datetime]="row.item.dateTime" [class]="row.styles.time()" [arenaSlotData]="row.styles.$data.time()" [attr.data-arena-part]="parts.time">{{ stamp }}</time>
                } @else {
                  <span [class]="row.styles.time()" [arenaSlotData]="row.styles.$data.time()" [attr.data-arena-part]="parts.time">{{ stamp }}</span>
                }
              }
            </div>
          </li>
        }
      </ol>
    }
  `,
})
export class ArenaTimeline {
  protected readonly parts = manifest.parts;
  protected readonly locale = inject(ARENA_LOCALE);

  /** Names the list: what this is the history or the progress of, such as Order 4821, never Timeline. Required, and guarded at runtime after trimming: nothing can derive it. */
  readonly label = input.required<string>();
  /** The milestones, in the order they are drawn. Arena draws each row from its fields; an empty list draws nothing. */
  readonly items = input.required<readonly ArenaTimelineItem[]>();
  /** Which milestone is current, counted from zero, for a timeline still in motion. The milestones before it are complete and the ones after it upcoming. Absent, or at or past the end, every milestone is complete, which is a history. A negative or non-finite value reads as 0. */
  readonly index = input<number | undefined>();

  protected readonly name = computed(() => {
    const name = this.label();
    if (!name?.trim()) throw new Error('ArenaTimeline: `label` is required, and names what the milestones belong to');
    return name;
  });

  protected readonly styles = computed(() => arenaTimelineStyles());

  protected readonly rows = computed(() => {
    this.name();
    const items = this.items();
    const at = this.index();
    const words = { complete: undefined, current: this.locale.timelineCurrent, upcoming: this.locale.timelineUpcoming };
    return items.map((item, index) => {
      const state = arenaTimelineState(index, at, items.length);
      const tone = arenaTimelineTone(item.tone);
      return {
        item, state,
        last: index === items.length - 1,
        glyph: arenaTimelineGlyph(tone, item.icon),
        word: words[state],
        styles: arenaTimelineStyles({ state, tone }),
      };
    });
  });
}
