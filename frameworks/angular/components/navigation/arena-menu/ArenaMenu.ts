import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, TemplateRef,
  afterNextRender, afterRenderEffect, computed, inject, input, output, untracked, viewChild,
} from '@angular/core';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import type { ArenaMenuAlign, ArenaMenuItem } from '../../../Api.generated';
import { sp1 } from '../../../Tokens.generated';
import { arenaWarnOnce } from '../../../WarnOnce';
import { ArenaAnchoredOverlay, arenaConnectedPositions } from '../../../AnchoredOverlay';
import { arenaMenuStyles } from './ArenaMenu.variants';
import manifest from './ArenaMenu.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';
import { ARENA_MENU_ANCHOR } from './MenuAnchor';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon';

const TRIGGER_SELECTOR =
  'button:not([tabindex="-1"]), a[href]:not([tabindex="-1"]), [role="button"]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

export const ARENA_MENU_POSITIONS: Record<ArenaMenuAlign, ConnectedPosition[]> = {
  start: arenaConnectedPositions('start', 'below', sp1 * 1.5),
  end: arenaConnectedPositions('end', 'below', sp1 * 1.5),
};

export function isArenaActivatable(item: ArenaMenuItem): boolean {
  return !item.divider && item.header === undefined;
}

@Component({
  selector: 'arena-menu',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.align]': 'null',
  },
  template: `
    <ng-content select="[trigger]" />
    <ng-template #panel>
      <div role="menu" [class]="styles().panel()" [attr.data-arena-surface]="'floating'" [arenaSlotData]="styles().$data.panel()" [attr.data-arena-part]="parts.panel">
        @for (item of items(); track $index) {
          @if (item.divider) {
            <div [class]="styles().divider()" [attr.data-arena-part]="parts.divider"></div>
          } @else if (item.header; as heading) {
            <div [class]="styles().header()" [attr.data-arena-part]="parts.header">{{ heading }}</div>
          } @else {
            <button type="button" role="menuitem" [class]="rowStyles(item).item()" [arenaSlotData]="rowStyles(item).$data.item()" [attr.data-arena-part]="parts.item" [disabled]="item.disabled"
                    (click)="run(item)">
              @if (item.icon; as glyph) {
                <span [class]="styles().icon()" [attr.data-arena-part]="parts.icon" aria-hidden="true"><arena-icon [icon]="glyph" /></span>
              }
              <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ item.label }}</span>
              @if (item.shortcut; as keys) {
                <kbd [class]="styles().shortcut()" [attr.data-arena-part]="parts.shortcut">{{ keys }}</kbd>
              }
            </button>
          }
        }
      </div>
    </ng-template>
  `,
})
export class ArenaMenu {
  protected readonly parts = manifest.parts;

  /** The entries, in order: activatable rows, dividers and group headers. */
  readonly items = input.required<readonly ArenaMenuItem[]>();
  /** Which edge of the trigger the panel lines up with. */
  readonly align = input<ArenaMenuAlign, ArenaMenuAlign | undefined>(
    'start',
    { transform: (value) => value ?? 'start' },
  );
  /** An entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. */
  readonly select = output<ArenaMenuItem>();

  protected readonly styles = computed(() => arenaMenuStyles());

  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly composed = inject(ARENA_MENU_ANCHOR, { optional: true });

  private detachTrigger: (() => void) | null = null;

  private readonly overlay = new ArenaAnchoredOverlay({
    anchor: () => (this.composed ? this.composed() : this.host.nativeElement),
    trigger: () => this.trigger(),
    panel: () => this.panel(),
    positions: () => ARENA_MENU_POSITIONS[this.align()],
    onDismiss: () => this.overlay.close(),
    focusOnOpen: (panel) => panel.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])'),
    restoreFocus: true,
    tabOut: true,
    anchorPressDismisses: this.composed !== null,
  });

  constructor() {
    afterNextRender(() => this.bindTrigger(), { injector: this.injector });
    afterRenderEffect(() => {
      const isOpen = this.overlay.isOpen();
      untracked(() => this.describeTrigger(isOpen));
    });
    inject(DestroyRef).onDestroy(() => this.detachTrigger?.());
  }

  protected rowStyles(item: ArenaMenuItem) {
    return arenaMenuStyles({ disabled: !!item.disabled, destructive: !!item.destructive });
  }

  protected run(item: ArenaMenuItem): void {
    if (item.disabled) return;
    this.close();
    this.select.emit(item);
  }

  protected ngAfterViewInit(): void {
    this.describeTrigger(false);
  }

  private trigger(): HTMLElement | null {
    const found = this.host.nativeElement.querySelector<HTMLElement>(TRIGGER_SELECTOR);
    if (found) return found;
    const first = this.host.nativeElement.firstElementChild;
    return first instanceof HTMLElement ? first : null;
  }

  private reportTrigger(): void {
    if (this.host.nativeElement.querySelector(TRIGGER_SELECTOR)) return;
    const first = this.host.nativeElement.firstElementChild;
    arenaWarnOnce(
      first === null
        ? 'arena-menu is given no trigger: mark the element that opens it with the `trigger` '
          + 'attribute, or nothing opens the menu at all.'
        : `arena-menu's trigger is a <${first.tagName.toLowerCase()}>, which takes no focus and `
          + 'answers no key. The menu opens on a pointer and on nothing else, and a reader on a '
          + 'keyboard cannot reach it. Project a control: an ArenaIconButton or an ArenaButton, '
          + 'or your own element carrying a button role and a tabindex.',
    );
  }

  private bindTrigger(): void {
    this.reportTrigger();
    const trigger = this.trigger();
    if (!trigger) return;
    const onClick = (): void => this.toggle();
    const onKeydown = (event: Event): void => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      this.toggle();
    };
    trigger.addEventListener('click', onClick);
    trigger.addEventListener('keydown', onKeydown);
    this.detachTrigger = () => {
      trigger.removeEventListener('click', onClick);
      trigger.removeEventListener('keydown', onKeydown);
    };
  }

  private describeTrigger(isOpen: boolean): void {
    const trigger = this.trigger();
    if (!trigger) return;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', String(isOpen));
  }

  private toggle(): void {
    if (this.overlay.isOpen()) this.close();
    else this.overlay.open();
  }

  private close(): void {
    if (!this.overlay.isOpen()) return;
    this.overlay.close();
    this.trigger()?.focus();
  }
}
