import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, TemplateRef,
  afterNextRender, afterRenderEffect, computed, inject, input, output, untracked, viewChild,
} from '@angular/core';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import type { ArenaMenuAlign, ArenaMenuItem } from '../../../Api.generated';
import { delayTypeahead, sp1 } from '../../../Tokens.generated';
import { ArenaIdGenerator } from '../../../ArenaIds';
import { arenaTypeAheadBuffer, arenaTypeAheadNext } from '../../../TypeAhead';
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

export type ArenaMenuBlock =
  | { kind: 'divider'; index: number }
  | { kind: 'rows'; header: number | null; rows: number[] };

/** Splits the entries into what the panel draws: rows before the first header form a block with no header, and a divider or a header ends a block. */
export function arenaMenuBlocks(items: readonly ArenaMenuItem[]): ArenaMenuBlock[] {
  const blocks: ArenaMenuBlock[] = [];
  let current: { kind: 'rows'; header: number | null; rows: number[] } | null = null;
  items.forEach((it, index) => {
    if (it.divider) {
      current = null;
      blocks.push({ kind: 'divider', index });
    } else if (it.header) {
      current = { kind: 'rows', header: index, rows: [] };
      blocks.push(current);
    } else {
      if (current === null) {
        current = { kind: 'rows', header: null, rows: [] };
        blocks.push(current);
      }
      current.rows.push(index);
    }
  });
  return blocks.filter((block) => block.kind === 'divider' || block.header !== null || block.rows.length > 0);
}

export function isArenaActivatable(item: ArenaMenuItem): boolean {
  return !item.divider && item.header === undefined;
}

@Component({
  selector: 'arena-menu',
  standalone: true,
  imports: [ArenaIcon, ArenaSlotAttributes, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.align]': 'null',
  },
  template: `
    <ng-content select="[trigger]" />
    <ng-template #row let-item>
      <button type="button" role="menuitem" tabindex="-1" [class]="rowStyles(item).item()" [arenaSlotData]="rowStyles(item).$data.item()" [attr.data-arena-part]="parts.item" [disabled]="item.disabled"
              (click)="run(item)">
        @if (item.icon; as glyph) {
          <span [class]="styles().icon()" [attr.data-arena-part]="parts.icon" aria-hidden="true"><arena-icon [icon]="glyph" /></span>
        }
        <span [class]="styles().label()" [attr.data-arena-part]="parts.label">{{ item.label }}</span>
        @if (item.shortcut; as keys) {
          <kbd [class]="styles().shortcut()" [attr.data-arena-part]="parts.shortcut">{{ keys }}</kbd>
        }
      </button>
    </ng-template>
    <ng-template #panel>
      <div role="menu" (keydown)="onKeydown($event)" [class]="styles().panel()" [attr.data-arena-surface]="'floating'" [arenaSlotData]="styles().$data.panel()" [attr.data-arena-part]="parts.panel">
        @for (block of blocks(); track $index) {
          @if (block.kind === 'divider') {
            <div role="separator" [class]="styles().divider()" [attr.data-arena-part]="parts.divider"></div>
          } @else if (block.header !== null) {
            <div role="group" [attr.aria-labelledby]="headerId(block.header)" [class]="styles().group()" [attr.data-arena-part]="parts.group">
              <div [id]="headerId(block.header)" [class]="styles().header()" [attr.data-arena-part]="parts.header">{{ items()[block.header]!.header }}</div>
              @for (at of block.rows; track at) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: items()[at]! }" />
              }
            </div>
          } @else {
            @for (at of block.rows; track at) {
              <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: items()[at]! }" />
            }
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
  protected readonly blocks = computed(() => arenaMenuBlocks(this.items()));

  private readonly idBase = inject(ArenaIdGenerator).next('arena-menu');
  private buffer = '';
  private clock: ReturnType<typeof setTimeout> | null = null;

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
    inject(DestroyRef).onDestroy(() => {
      this.detachTrigger?.();
      if (this.clock !== null) clearTimeout(this.clock);
    });
  }

  protected headerId(index: number): string {
    return `${this.idBase}-h${index}`;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const menu = event.currentTarget as HTMLElement;
    const rows = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
    const at = rows.findIndex((row) => row === menu.ownerDocument.activeElement);
    const total = rows.length;
    let target = -1;
    if (event.key === 'ArrowDown') target = total === 0 ? -1 : (at + 1) % total;
    else if (event.key === 'ArrowUp') target = total === 0 ? -1 : (at <= 0 ? total - 1 : at - 1);
    else if (event.key === 'Home') target = total === 0 ? -1 : 0;
    else if (event.key === 'End') target = total === 0 ? -1 : total - 1;
    else if (event.key.length === 1 && (event.key !== ' ' || this.buffer !== '')) {
      this.buffer = arenaTypeAheadBuffer(this.buffer, event.key);
      if (this.clock !== null) clearTimeout(this.clock);
      this.clock = setTimeout(() => { this.buffer = ''; this.clock = null; }, delayTypeahead);
      const labels = rows.map((row) => row.querySelector('[data-arena-part="menu.label"]')?.textContent ?? '');
      const found = arenaTypeAheadNext(labels, at, this.buffer);
      if (found < 0) return;
      event.preventDefault();
      rows[found]!.focus();
      return;
    } else return;
    event.preventDefault();
    if (target >= 0) rows[target]!.focus();
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
