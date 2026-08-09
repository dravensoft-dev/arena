import {
  ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, ElementRef, Injector, TemplateRef,
  ViewContainerRef, afterNextRender, afterRenderEffect, computed, inject, input, output, signal,
  untracked, viewChild,
} from '@angular/core';
import {
  type ConnectedPosition, type OverlayRef, createFlexibleConnectedPositionStrategy,
  createOverlayRef, createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import type { ArenaMenuAlign, ArenaMenuItem } from '../../../Api.generated';
import { sp1 } from '../../../Tokens.generated';
import { arenaWarnOnce } from '../../../WarnOnce';
import { arenaMenuStyles } from './ArenaMenu.variants';

const TRIGGER_SELECTOR =
  'button:not([tabindex="-1"]), a[href]:not([tabindex="-1"]), [role="button"]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

export const ARENA_MENU_POSITIONS: Record<ArenaMenuAlign, ConnectedPosition[]> = {
  start: [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: sp1 * 1.5 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -sp1 * 1.5 },
  ],
  end: [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: sp1 * 1.5 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -sp1 * 1.5 },
  ],
};

export function isArenaActivatable(item: ArenaMenuItem): boolean {
  return !item.divider && item.header === undefined;
}

export function arenaRowState(item: ArenaMenuItem): 'disabled' | 'destructive' | 'default' {
  if (item.disabled) return 'disabled';
  return item.destructive ? 'destructive' : 'default';
}

@Component({
  selector: 'arena-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
  },
  template: `
    <ng-content select="[trigger]" />
    <ng-template #panel>
      <div role="menu" [class]="styles().panel()">
        @for (item of items(); track $index) {
          @if (item.divider) {
            <div [class]="styles().divider()"></div>
          } @else if (item.header; as heading) {
            <div [class]="styles().header()">{{ heading }}</div>
          } @else {
            <button type="button" role="menuitem" [class]="rowClass(item)" [disabled]="item.disabled"
                    (click)="run(item)">
              @if (item.icon; as glyph) {
                <i [class]="styles().icon() + ' ' + glyph" aria-hidden="true"></i>
              }
              <span [class]="styles().label()">{{ item.label }}</span>
              @if (item.shortcut; as keys) {
                <span [class]="styles().shortcut()">{{ keys }}</span>
              }
            </button>
          }
        }
      </div>
    </ng-template>
  `,
})
export class ArenaMenu {
  /** The entries, in order: activatable rows, dividers and group headers. */
  readonly items = input.required<readonly ArenaMenuItem[]>();
  /** Which edge of the trigger the panel lines up with. */
  readonly align = input<ArenaMenuAlign>('start');
  /** An entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. */
  readonly select = output<ArenaMenuItem>();

  protected readonly styles = computed(() => arenaMenuStyles({ anchored: true }));

  private readonly open = signal(false);
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly doc = inject(DOCUMENT);

  private ref: OverlayRef | null = null;
  private detachTrigger: (() => void) | null = null;
  private detachDocument: (() => void) | null = null;

  constructor() {
    afterNextRender(() => this.bindTrigger(), { injector: this.injector });
    afterRenderEffect(() => {
      const isOpen = this.open();
      untracked(() => this.describeTrigger(isOpen));
    });
    inject(DestroyRef).onDestroy(() => {
      this.detachTrigger?.();
      this.teardown();
    });
  }

  protected rowClass(item: ArenaMenuItem): string {
    const styles = this.styles();
    const state = arenaRowState(item);
    const modifier = state === 'disabled' ? styles.itemDisabled()
      : state === 'destructive' ? styles.itemDestructive() : styles.itemDefault();
    return `${styles.item()} ${modifier}`;
  }

  protected run(item: ArenaMenuItem): void {
    if (item.disabled) return;
    this.close(true);
    this.select.emit(item);
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
    if (this.open()) this.close(true);
    else this.attach();
  }

  private attach(): void {
    if (this.ref) return;
    const ref = createOverlayRef(this.injector, {
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, this.host)
        .withPositions(ARENA_MENU_POSITIONS[this.align()])
        .withPush(false),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
    });
    ref.attach(new TemplatePortal(this.panel(), this.viewContainer));
    this.ref = ref;
    this.open.set(true);
    this.listenForDismissal();
    afterNextRender(() => this.focusFirstItem(), { injector: this.injector });
  }

  private close(restoreFocus: boolean): void {
    if (!this.ref) return;
    this.teardown();
    this.open.set(false);
    if (restoreFocus) this.trigger()?.focus();
  }

  private teardown(): void {
    this.detachDocument?.();
    this.detachDocument = null;
    this.ref?.dispose();
    this.ref = null;
  }

  private focusFirstItem(): void {
    const first = this.ref?.overlayElement.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
  }

  private listenForDismissal(): void {
    const onKeydown = (event: Event): void => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') this.close(true);
    };
    const onPointerDown = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (this.host.nativeElement.contains(target)) return;
      if (this.ref?.overlayElement.contains(target)) return;
      this.close(false);
    };
    this.doc.addEventListener('keydown', onKeydown);
    this.doc.addEventListener('mousedown', onPointerDown);
    this.detachDocument = () => {
      this.doc.removeEventListener('keydown', onKeydown);
      this.doc.removeEventListener('mousedown', onPointerDown);
    };
  }
}
