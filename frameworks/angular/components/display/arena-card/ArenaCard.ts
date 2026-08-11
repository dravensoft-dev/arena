import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, booleanAttribute, computed, contentChild, input, output,
} from '@angular/core';
import { isArenaOwnActivation, isArenaPrimaryActivation } from '../../../AnchorActivation';
import { ArenaAction } from '../../../ProjectionMarkers';
import { arenaCardStyles } from './ArenaCard.variants';

@Component({
  selector: 'arena-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: contents',
    '[attr.title]': 'null',
  },
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #body>
      @if (headed()) {
        <div [class]="styles().head()">
          <div>
            @if (eyebrow(); as label) {
              <div [class]="styles().eyebrow()">{{ label }}</div>
            }
            @if (title(); as heading) {
              <div [class]="styles().title()">{{ heading }}</div>
            }
          </div>
          <ng-content select="[action]" />
        </div>
      }
      <div [class]="styles().body()"><ng-content /></div>
    </ng-template>

    @if (href(); as url) {
      <a [class]="styles().root()" [href]="url" [attr.aria-disabled]="inert()"
         (click)="onAnchorClick($event)">
        <ng-container *ngTemplateOutlet="body" />
      </a>
    } @else {
      <div [class]="styles().root()" [attr.role]="role()" [attr.tabindex]="stop()"
           [attr.aria-disabled]="inert()" (click)="onClick($event)" (keydown)="onKeydown($event)">
        <ng-container *ngTemplateOutlet="body" />
      </div>
    }
  `,
})
export class ArenaCard {
  /** Header title. Absent, along with eyebrow and action, renders no header block at all. */
  readonly title = input<string>();
  /** Mono uppercase label above the title, in the accent colour. */
  readonly eyebrow = input<string>();
  /** Adds the warm shadow. Depth comes from the shadow and the surface scale, never a gradient. */
  readonly floating = input(false, { transform: booleanAttribute });
  /** Draws the border in the accent colour instead of the surface hairline. */
  readonly accent = input(false, { transform: booleanAttribute });
  /** Whether the whole card is one activation target, which is the ordinary shape of a list on a phone. A boolean rather than "is `click` bound?", because Arena never derives what it draws from what a consumer listens for, the same reason ArenaTableRow.interactive is one. An interactive card is a role="button" tab stop with an Enter/Space handler and the surface's own hover and focus states; a non-interactive one is inert and adds no tab stop, because a dead stop on every card of every list is worse than the gap it would close. It is a ROLE rather than a <button> element for the same reason ArenaTableRow's card shape is: a card body may hold controls of its own, and a control inside a control is reachable by nobody. */
  readonly interactive = input(false, { transform: booleanAttribute });
  /** Whether an interactive card is drawn but cannot be activated. It reflects through aria-disabled rather than any native attribute, and the card stays in the tab order rather than leaving it, because a disabled control nobody can reach is a control nobody knows exists. Without `interactive` there is nothing to disable and the card is inert already. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Present => the card renders an <a>; absent, with `interactive`, a role="button". The same split, and the same reason, as ArenaSideNavItem.href: a control that navigates must be a link, openable in a new tab, address copyable, announced as a link, and none of that can be rebuilt on a div. A primary click with no modifier is cancelled and reported through `click`, so a router owns it; ctrl, meta, shift, alt, a middle click and a context menu stay the browser's and report nothing. It implies interaction on its own, so `interactive` is not also required, and with `disabled` it refuses activation through aria-disabled the way an item does. The card's own content still holds whatever controls it holds; a control inside the anchor is a control inside a link, which is the price of making the whole surface the target and the reason `interactive` exists as the alternative. */
  readonly href = input<string>();
  /** An interactive card was activated, by pointer or by Enter or Space. With `href` it is also how the card reports the one activation a router owns, a primary click or Enter with no modifier, and Arena has already cancelled the anchor's own navigation by the time it fires; a modified or middle click is the browser's and does not fire it at all. No payload, because the consumer wrote this element and already holds what it is about. */
  readonly click = output<void>();

  protected readonly action = contentChild(ArenaAction);

  protected readonly headed = computed(() => Boolean(this.title() || this.eyebrow() || this.action()));

  protected readonly role = computed(() => (this.interactive() ? 'button' : null));

  protected readonly stop = computed(() => (this.interactive() ? 0 : null));

  protected readonly inert = computed(
    () => ((this.interactive() || this.href()) && this.disabled() ? 'true' : null),
  );

  protected readonly styles = computed(() => arenaCardStyles({
    accent: this.accent(), floating: this.floating(),
    interactive: this.interactive() || this.href() !== undefined,
  }));

  protected onAnchorClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) { event.preventDefault(); return; }
    if (!this.ownActivation(event)) return;
    if (!isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.click.emit();
  }

  protected onClick(event: MouseEvent): void {
    if (!this.interactive()) return;
    event.stopPropagation();
    if (!this.ownActivation(event)) return;
    this.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive() || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.ownActivation(event)) return;
    this.emit();
  }

  private ownActivation(event: Event): boolean {
    const container = event.currentTarget;
    return !(container instanceof Element) || isArenaOwnActivation(event.target, container);
  }

  private emit(): void {
    if (!this.disabled()) this.click.emit();
  }
}
