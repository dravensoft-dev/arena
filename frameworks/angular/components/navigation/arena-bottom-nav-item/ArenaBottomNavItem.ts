import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { isArenaPrimaryActivation } from '../../../AnchorActivation';
import { ArenaBottomNavState } from '../arena-bottom-nav/ArenaBottomNavState';
import { arenaBottomNavStyles } from '../arena-bottom-nav/ArenaBottomNav.variants';
import manifest from '../arena-bottom-nav/ArenaBottomNav.classes.generated';
import { arenaActiveWeight, arenaBadgeCount } from '../../../NavRow';

@Component({
  selector: 'arena-bottom-nav-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: contents',
    '[attr.id]': 'null',
  },
  template: `
    @if (href(); as url) {
      <a [class]="styles().item()" [attr.data-arena-part]="parts.item" [href]="url"
         [attr.aria-current]="current()" [attr.aria-disabled]="off()"
         (click)="activateAnchor($event)">
        <span [class]="styles().glyph()" [attr.data-arena-part]="parts.glyph">
          <i [class]="glyphClass()" aria-hidden="true"></i>
          @if (count(); as tally) {
            <span [class]="styles().badge()" [attr.data-arena-part]="parts.badge">{{ tally }}</span>
          }
        </span>
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ name() }}</span>
      </a>
    } @else {
      <button type="button" [class]="styles().item()" [attr.data-arena-part]="parts.item"
              [attr.aria-current]="current()" [attr.aria-disabled]="off()"
              (click)="activate($event)">
        <span [class]="styles().glyph()" [attr.data-arena-part]="parts.glyph">
          <i [class]="glyphClass()" aria-hidden="true"></i>
          @if (count(); as tally) {
            <span [class]="styles().badge()" [attr.data-arena-part]="parts.badge">{{ tally }}</span>
          }
        </span>
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ name() }}</span>
      </button>
    }
  `,
})
export class ArenaBottomNavItem {
  protected readonly parts = manifest.parts;

  /** Identifies the destination. ArenaBottomNav.active names one of these, and the item whose id matches is the one marked aria-current="page". Required, and guarded with a falsy check rather than an absence check: a blank id can never match and is an omission wearing a value. */
  readonly id = input.required<string>();
  /** What the item reads under its glyph, and the whole of its accessible name unless a badge adds a count to it. Required and falsy-guarded for the same reason. It is drawn rather than hidden: a bar of glyphs alone asks every reader to have learnt the icons, and the label is what makes the destination sayable. */
  readonly label = input.required<string>();
  /** A Phosphor class name drawn above the label. Arena draws the element, the consumer names the glyph. **The ACTIVE destination is drawn in the filled weight, and there is no member for it**: the item whose id matches ArenaBottomNav.active swaps whatever weight the string carries for `ph-fill`, so a consumer passes one string per destination rather than two and a conditional. It is Arena's convention, so Arena applies it, and passing `ph-fill` yourself changes nothing because the swap is idempotent. Required here where a sidebar leaves it optional: a bar of five equal columns has no room for a label long enough to stand alone, and one column without a glyph breaks the row's rhythm. */
  readonly icon = input.required<string>();
  /** A count drawn over the glyph's trailing corner: pending orders, unread notices. Zero draws nothing, because a badge reading 0 is a mark that says there is nothing to mark; above 99 it reads "99+", so a four-digit count cannot widen the column. A number rather than a string, because both rules are arithmetic and a caller who has already formatted the value has taken them away. It is NOT hidden from assistive technology, so the destination announces "Orders 12". */
  readonly badge = input<number>();
  /** Present => the item renders an <a>; absent => a <button>. A control that navigates must be a link: openable in a new tab, address copyable, announced as a link. An item that only changes local state is a button. A primary click with no modifier is cancelled and reported through ArenaBottomNav's `nav`, so a router owns it; a modified or middle click is the browser's and reports nothing. */
  readonly href = input<string>();
  /** Whether the destination is drawn but cannot be reached. It reflects through `aria-disabled` rather than the native attribute, and rather than by not rendering the item at all: a destination a user can see and hear announced as unavailable is what tells them it exists. The anchor keeps its `href` so the case split stays what it is; what changes is that activation is refused and the state is announced. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly nav = inject(ArenaBottomNavState);

  protected readonly on = computed(() => this.key() === this.nav.activeId());
  protected readonly current = computed(() => (this.on() ? 'page' : null));
  protected readonly off = computed(() => (this.disabled() ? 'true' : null));
  protected readonly count = computed(() => arenaBadgeCount(this.badge()));
  protected readonly styles = computed(() => arenaBottomNavStyles({ active: this.on() }));

  protected readonly name = computed(() => {
    const text = this.label();
    if (text.trim() === '') {
      throw new Error('ArenaBottomNavItem: `label` is required, and is what the destination reads');
    }
    return text;
  });

  protected readonly glyphClass = computed(() => {
    const glyph = this.icon();
    if (glyph.trim() === '') {
      throw new Error('ArenaBottomNavItem: `icon` is required, and a column of a bar has no room to stand without one');
    }
    return this.on() ? arenaActiveWeight(glyph) : glyph;
  });

  protected activate(event: Event): void {
    if (this.disabled()) { event.preventDefault(); return; }
    this.nav.activate(this.key());
  }

  protected activateAnchor(event: MouseEvent): void {
    if (this.disabled()) { event.preventDefault(); return; }
    if (!isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.nav.activate(this.key());
  }

  private key(): string {
    const value = this.id();
    if (value.trim() === '') {
      throw new Error('ArenaBottomNavItem: `id` is required, and is what ArenaBottomNav.active names');
    }
    return value;
  }
}
