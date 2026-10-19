import {
  ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, computed, inject, input, output, viewChild,
} from '@angular/core';
import { isArenaPrimaryActivation } from '../../../AnchorActivation';
import { ARENA_LOCALE } from '../../../ArenaLocale';
import { arenaLinkStyles } from './ArenaLink.variants';
import manifest from './ArenaLink.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaLinkRel, arenaLinkRoutes, arenaLinkTarget } from './LinkRules';

@Component({
  selector: 'arena-link',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `<a #anchor [attr.href]="address()" [attr.target]="written()" [attr.rel]="relation()" [attr.download]="download() ? '' : null" [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root" data-arena-boundary (click)="onClick($event)"><ng-content />@if (external()) {<span [class]="styles().external()" [arenaSlotData]="styles().$data.external()" [attr.data-arena-part]="parts.external">{{ hint }}</span>}</a>`,
})
export class ArenaLink {
  protected readonly parts = manifest.parts;
  protected readonly hint = ` ${inject(ARENA_LOCALE).linkExternal}`;

  /** Where the link goes. Required, and guarded at runtime after trimming: an <a> without an address is not a link and takes no focus. */
  readonly href = input.required<string>();
  /** Opens the address in a new tab. Arena writes target="_blank", adds noopener and noreferrer to rel, and says the locale's linkExternal word after the text without drawing it. The member is the one route to a new tab, and nothing is cancelled: a router cannot own a tab it did not open, so navigate does not fire. */
  readonly external = input(false, { transform: booleanAttribute });
  /** Saves the address instead of navigating to it, under the name the browser chooses. Nothing is cancelled and navigate does not fire, because a router cannot own a download. */
  readonly download = input(false, { transform: booleanAttribute });
  /** Link types the consumer adds to rel, such as nofollow or ugc. Arena merges them with its own: it adds noopener whenever the link opens another browsing context, through external or a target that names one. Arena drops an opener token, so no list written here hands the new page this one. */
  readonly rel = input<readonly string[]>();
  /** A named browsing context the link opens in, such as a help window reused across links, or a keyword such as _top. _blank is not taken here: a new tab is external, so a _blank target is ignored and warned once. A target it writes other than _self cancels nothing and fires no navigate. The navigation happens in a context a router does not own. */
  readonly target = input<string>();
  /** The link was activated by the one activation a router owns, a primary click with no modifier, or Enter on the focused link. Arena has already cancelled the anchor's own navigation by the time the event fires. A modified click, a middle click and a context menu are the browser's and fire nothing, and so does a link that is external, a download or targeted elsewhere. No payload, because the consumer wrote this element and already holds what it is about. */
  readonly navigate = output<void>();

  private readonly anchor = viewChild.required<ElementRef<HTMLAnchorElement>>('anchor');

  protected readonly address = computed(() => {
    const href = this.href();
    if (!href?.trim()) throw new Error('ArenaLink: `href` is required, and is where the link goes: an anchor with no address is not a link');
    return href;
  });

  protected readonly written = computed(() => arenaLinkTarget(this.external(), this.target()) ?? null);

  protected readonly relation = computed(() => arenaLinkRel(this.rel(), this.external(), this.target()) ?? null);

  private readonly routed = computed(() => arenaLinkRoutes(this.external(), this.download(), this.target()));

  protected readonly styles = computed(() => arenaLinkStyles());

  protected ngAfterContentInit(): void {
    const projected = [...this.anchor().nativeElement.childNodes].filter(
      (node) => (node.nodeType === node.ELEMENT_NODE && (node as Element).getAttribute('data-arena-part') !== this.parts.external)
        || (node.nodeType === node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
    );
    if (projected.length === 0) {
      throw new Error('ArenaLink: `content` is required, and is the link text: a link with no text has no name');
    }
  }

  protected onClick(event: MouseEvent): void {
    if (!this.routed() || !isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.navigate.emit();
  }
}
