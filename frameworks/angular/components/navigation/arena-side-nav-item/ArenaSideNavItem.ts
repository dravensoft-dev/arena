import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, effect, inject, input,
} from '@angular/core';
import { isArenaPrimaryActivation } from '../../../AnchorActivation';
import { ArenaSideNavState, arenaIndentFor } from '../arena-side-nav/ArenaSideNavState';
import { arenaActiveWeight, arenaBadgeCount } from '../../../NavRow';
import { arenaSideNavStyles } from '../arena-side-nav/ArenaSideNav.variants';

@Component({
  selector: 'arena-side-nav-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: contents',
    '[attr.id]': 'null',
  },
  template: `
    @if (href(); as url) {
      <a [class]="styles().item()" [href]="url" [style.paddingInlineStart]="indent()"
         [attr.aria-current]="current()" [attr.aria-disabled]="off()"
         (click)="activateAnchor($event)">
        @if (glyphClass(); as glyph) {
          <i [class]="glyph" aria-hidden="true"></i>
        }
        {{ name() }}
        @if (count(); as tally) {
          <span [class]="styles().badge()">{{ tally }}</span>
        }
      </a>
    } @else {
      <button type="button" [class]="styles().item()" [style.paddingInlineStart]="indent()"
              [attr.aria-current]="current()" [attr.aria-disabled]="off()"
              (click)="activate($event)">
        @if (glyphClass(); as glyph) {
          <i [class]="glyph" aria-hidden="true"></i>
        }
        {{ name() }}
        @if (count(); as tally) {
          <span [class]="styles().badge()">{{ tally }}</span>
        }
      </button>
    }
  `,
})
export class ArenaSideNavItem {
  /** Identifies the destination. ArenaSideNav.active names one of these, and the item whose id matches is the one marked aria-current="page". Required, and guarded with a falsy check rather than an absence check: a blank id can never match and is an omission wearing a value. */
  readonly id = input.required<string>();
  /** What the item reads, and the whole of its accessible name unless a badge adds a count to it. Required and falsy-guarded for the same reason. */
  readonly label = input.required<string>();
  /** A Phosphor class name drawn before the label -- Arena draws the <i>, the consumer names the glyph. **The ACTIVE row is drawn in the filled weight, and there is no member for it**: the item whose id matches ArenaSideNav.active swaps whatever weight the string carries for `ph-fill`, so a consumer passes one string per destination rather than two and a conditional. It is Arena's convention, so Arena applies it, the same judgement that inverted ArenaPageHead's guidance rather than adding a boolean whose false nobody wants. Pass `ph-fill` yourself and nothing changes, since the swap is idempotent. */
  readonly icon = input<string>();
  /** A count drawn at the row's trailing edge -- pending orders, unread notices. Zero draws nothing, because a badge reading 0 is a mark that says there is nothing to mark; above 99 it reads "99+", so a four-digit count cannot widen the column. A number rather than a string, because the two rules above are arithmetic and a caller who has already formatted the value has taken them away. It is NOT hidden from assistive technology, so the row announces "Orders 12": a count a screen-reader user cannot hear is a count that is not there, and aria-hidden on it would trade a real loss for a tidier name. What the 12 counts stays unsaid, because nothing can derive it and no member states it -- say it in the label where it matters. */
  readonly badge = input<number>();
  /** Present => the item renders an <a>; absent => a <button>. A control that navigates must be a link -- openable in a new tab, address copyable, announced as a link. An item that only changes local state is a button. A primary click with no modifier is cancelled and reported through ArenaSideNav's `nav`, so a router owns it; a modified or middle click is the browser's and reports nothing. */
  readonly href = input<string>();
  /** Whether the destination is drawn but cannot be reached -- one the consumer's rules lock, such as a feature the current plan does not include. It reflects through `aria-disabled` rather than the native attribute, and rather than by not rendering the item at all: an unavailable destination a user can see and hear announced as unavailable is what tells them it exists, which is the whole reason to draw it. The anchor keeps its `href` so the case split stays what it is -- what changes is that activation is refused and the state is announced. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly nav = inject(ArenaSideNavState);

  protected readonly name = computed(() => {
    const text = this.label();
    if (text.trim() === '') {
      throw new Error('ArenaSideNavItem: `label` is required, and names the destination this row leads to');
    }
    return text;
  });

  protected readonly on = computed(() => {
    const key = this.id();
    if (key.trim() === '') {
      throw new Error('ArenaSideNavItem: `id` is required, and is what `active` and `nav` identify this row by');
    }
    return key === this.nav.activeId();
  });

  protected readonly glyphClass = computed(() => {
    const glyph = this.icon();
    if (!glyph) return null;
    return `${this.styles().icon()} ${this.on() ? arenaActiveWeight(glyph) : glyph}`;
  });

  protected readonly current = computed(() => (this.on() ? 'page' : null));
  protected readonly indent = computed(() => arenaIndentFor(this.nav.indentStep(), this.nav.depth()));
  protected readonly styles = computed(() => arenaSideNavStyles({ active: this.on() }));

  protected readonly off = computed(() => (this.disabled() ? 'true' : null));

  protected readonly count = computed(() => arenaBadgeCount(this.badge()));

  constructor() {
    effect((onCleanup) => {
      const key = this.id();
      this.nav.claim(key);
      onCleanup(() => this.nav.release(key));
    });
  }

  protected activate(event: Event): void {
    if (this.disabled()) { event.preventDefault(); return; }
    this.nav.activate(this.id());
  }

  protected activateAnchor(event: MouseEvent): void {
    if (this.disabled()) { event.preventDefault(); return; }
    if (!isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.nav.activate(this.id());
  }
}
