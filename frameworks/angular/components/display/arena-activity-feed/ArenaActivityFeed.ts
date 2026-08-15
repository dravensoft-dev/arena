import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import type { ArenaActivityItem } from '../../../Api.generated';
import { arenaFocusableElements } from '../../../FocusTrap';
import { arenaActivityFeedStyles } from './ArenaActivityFeed.variants';
import manifest from './ArenaActivityFeed.classes.generated';

const TONES = Object.keys(manifest.variants.tone);
type ArenaTone = NonNullable<ArenaActivityItem['tone']>;
const toneOf = (tone: string | undefined): ArenaTone | undefined =>
  (tone && TONES.includes(tone) ? tone as ArenaTone : undefined);

export interface ActivityFeedRow {
  item: ArenaActivityItem;
  itemClass: string;
  dotClass: string;
}

export function arenaResolveActivityFeedRows(items: readonly ArenaActivityItem[]): ActivityFeedRow[] {
  return items.map((item, index) => {
    const resolved = arenaActivityFeedStyles({ tone: toneOf(item.tone), divided: index > 0 });
    return { item, itemClass: resolved.item(), dotClass: resolved.dot() };
  });
}

@Component({
  selector: 'arena-activity-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents', '(keydown)': 'onKeydown($event)' },
  template: `
    <ul [class]="base().root()" [attr.data-arena-part]="parts.root" role="feed" [attr.aria-label]="labelText()"
        [attr.aria-busy]="busy() ? 'true' : 'false'">
      @for (row of rows(); track row.item.id ?? $index; let i = $index) {
        <li [class]="row.itemClass" [attr.data-arena-part]="parts.item" role="article" tabindex="0"
            [attr.aria-posinset]="i + 1" [attr.aria-setsize]="rows().length">
          <span [class]="row.dotClass" [attr.data-arena-part]="parts.dot" aria-hidden="true"></span>
          <span [class]="base().text()" [attr.data-arena-part]="parts.text">
            <b [class]="base().actor()" [attr.data-arena-part]="parts.actor">{{ row.item.actor }}</b> {{ row.item.action }}
            @if (row.item.target) {
              <span [class]="base().target()" [attr.data-arena-part]="parts.target">{{ row.item.target }}</span>
            }
          </span>
          @if (row.item.time) {
            <span [class]="base().time()" [attr.data-arena-part]="parts.time">{{ row.item.time }}</span>
          }
        </li>
      }
    </ul>
  `,
})
export class ArenaActivityFeed {
  protected readonly parts = manifest.parts;

  /** Names the feed for assistive technology. Required, and guarded at runtime: nothing can derive it, and a feed is a landmark a reader navigates BY, so say what the events are about ("Deployment activity"), never "Activity feed". */
  readonly label = input.required<string>();
  /** The events, newest first by convention. Each row is drawn by Arena; there is no per-item projection. */
  readonly items = input.required<readonly ArenaActivityItem[]>();
  /** Whether a multi-step update to the feed is in progress, reflected as `aria-busy`. Set it while rows are being loaded or replaced and clear it once they settle, so a screen reader announces the settled feed rather than each intermediate state. It is an input rather than something Arena infers: only the host knows when its own loading has finished. */
  readonly busy = input(false, { transform: booleanAttribute });

  protected readonly labelText = computed(() => {
    const name = this.label();
    if (name.trim() === '') {
      throw new Error('ArenaActivityFeed: `label` is required, and names what the events are about');
    }
    return name;
  });

  protected readonly base = computed(() => arenaActivityFeedStyles());
  protected readonly rows = computed(() => arenaResolveActivityFeedRows(this.items()));

  protected onKeydown(event: KeyboardEvent): void {
    const feed = event.currentTarget as HTMLElement;
    if (event.ctrlKey && (event.key === 'End' || event.key === 'Home')) {
      const after = event.key === 'End';
      const outside = arenaFocusableElements(feed.ownerDocument.body).filter((el) => !feed.contains(el));
      const position = after ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING;
      const reachable = outside.filter((el) => feed.compareDocumentPosition(el) & position);
      const target = after ? reachable[0] : reachable[reachable.length - 1];
      if (!target) return;
      event.preventDefault();
      target.focus();
      return;
    }
    if (event.key !== 'PageDown' && event.key !== 'PageUp') return;
    const articles = Array.from(feed.querySelectorAll<HTMLElement>('[role="article"]'));
    if (articles.length === 0) return;
    const target = event.target as Element | null;
    const here = articles.indexOf(target?.closest('[role="article"]') as HTMLElement);
    const there = here === -1
      ? (event.key === 'PageDown' ? 0 : articles.length - 1)
      : here + (event.key === 'PageDown' ? 1 : -1);
    if (there < 0 || there >= articles.length) return;
    event.preventDefault();
    articles[there].focus();
  }
}
