import {
  DOCUMENT, DestroyRef, Injector, ViewContainerRef, afterNextRender, inject, signal,
  type Signal, type TemplateRef,
} from '@angular/core';
import {
  type ConnectedPosition, type OverlayRef, createFlexibleConnectedPositionStrategy,
  createOverlayRef, createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { Directionality } from '@angular/cdk/bidi';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  arenaEscapeInsideModal, arenaOpeningFocus, arenaPanelsAbove, arenaPressInside, arenaTabLeavesPanel, arenaTopmostPanel,
  type ArenaPanelAlign, type ArenaPanelDismissal, type ArenaPanelSide,
} from './AnchoredPanel';
import { arenaFocusableElements } from './FocusTrap';

export type { ArenaPanelAlign, ArenaPanelDismissal, ArenaPanelSide };

export interface ArenaAnchoredOverlayOptions {
  anchor: () => HTMLElement | null;
  trigger: () => HTMLElement | null;
  panel: () => TemplateRef<unknown>;
  positions: () => readonly ConnectedPosition[];
  onDismiss: (reason: ArenaPanelDismissal) => void;
  matchAnchorWidth?: boolean;
  focusOnOpen?: (panel: HTMLElement) => HTMLElement | null;
  restoreFocus?: boolean;
  tabOut?: boolean;
  anchorPressDismisses?: boolean;
}

interface StackEntry {
  panel: HTMLElement;
}

const stack: StackEntry[] = [];

const live = () => stack.filter((entry) => entry.panel.isConnected);

export function arenaConnectedPositions(align: ArenaPanelAlign, prefer: ArenaPanelSide, offset: number): ConnectedPosition[] {
  const opposite = { start: 'end', end: 'start', center: 'center' } as const;
  const at = (side: ArenaPanelSide, edge: ArenaPanelAlign): ConnectedPosition => side === 'below'
    ? { originX: edge, originY: 'bottom', overlayX: edge, overlayY: 'top', offsetY: offset }
    : { originX: edge, originY: 'top', overlayX: edge, overlayY: 'bottom', offsetY: -offset };
  const other: ArenaPanelSide = prefer === 'below' ? 'above' : 'below';
  const edges: ArenaPanelAlign[] = align === 'center' ? [align] : [align, opposite[align]];
  return [prefer, other].flatMap((side) => edges.map((edge) => at(side, edge)));
}

export function arenaPhysicalPositions(positions: readonly ConnectedPosition[], rtl: boolean): ConnectedPosition[] {
  const swap = { start: 'end', end: 'start', center: 'center' } as const;
  if (!rtl) return [...positions];
  return positions.map((position) => ({
    ...position, originX: swap[position.originX], overlayX: swap[position.overlayX],
  }));
}

export function arenaFirstFocusable(panel: HTMLElement): HTMLElement {
  return arenaOpeningFocus(arenaFocusableElements(panel), panel);
}

export class ArenaAnchoredOverlay {
  private readonly injector = inject(Injector);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly doc = inject(DOCUMENT);
  private readonly directionality = inject(Directionality);
  private readonly options: ArenaAnchoredOverlayOptions;
  private readonly shown = signal(false);
  private ref: OverlayRef | null = null;
  private detach: (() => void) | null = null;

  readonly isOpen: Signal<boolean> = this.shown.asReadonly();

  constructor(options: ArenaAnchoredOverlayOptions) {
    this.options = options;
    inject(DestroyRef).onDestroy(() => this.close());
  }

  panelElement(): HTMLElement | null {
    const first = this.ref?.overlayElement.firstElementChild;
    return first instanceof HTMLElement ? first : null;
  }

  open(): void {
    const anchor = this.options.anchor();
    if (this.ref || !anchor) return;
    const ref = createOverlayRef(this.injector, {
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, anchor)
        .withPositions(arenaPhysicalPositions(this.options.positions(), this.directionality.value === 'rtl'))
        .withPush(true),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
    });
    if (this.options.matchAnchorWidth) ref.updateSize({ minWidth: anchor.getBoundingClientRect().width });
    ref.attach(new TemplatePortal(this.options.panel(), this.viewContainer));
    this.ref = ref;
    this.listen(ref);
    this.shown.set(true);
    const focusOnOpen = this.options.focusOnOpen;
    if (focusOnOpen) {
      afterNextRender(() => {
        const panel = this.panelElement();
        if (panel) focusOnOpen(panel)?.focus();
      }, { injector: this.injector });
    }
  }

  close(): void {
    this.detach?.();
    this.detach = null;
    this.ref?.dispose();
    this.ref = null;
    this.shown.set(false);
  }

  private listen(ref: OverlayRef): void {
    const entry: StackEntry = { panel: ref.overlayElement };
    stack.push(entry);
    const dismiss = (reason: ArenaPanelDismissal): void => {
      this.options.onDismiss(reason);
      if (reason !== 'outside' && this.options.restoreFocus) this.options.trigger()?.focus();
    };
    const onKey = (event: Event): void => {
      if (!(event instanceof KeyboardEvent) || event.key !== 'Escape') return;
      if (arenaTopmostPanel(live()) !== entry) return;
      if (event.target instanceof Element && arenaEscapeInsideModal<Element>(event.target, ref.overlayElement)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dismiss('escape');
    };
    const onPress = (event: Event): void => {
      if (!(event.target instanceof Node)) return;
      const above = arenaPanelsAbove(live(), entry).map((one) => one.panel);
      const anchor = this.options.anchorPressDismisses ? null : this.options.anchor();
      const regions = [anchor, this.options.trigger(), ref.overlayElement, ...above];
      if (!arenaPressInside(event.target, regions)) dismiss('outside');
    };
    const onTab = (event: Event): void => {
      if (!(event instanceof KeyboardEvent) || event.key !== 'Tab') return;
      if (event.defaultPrevented || !this.options.tabOut || arenaTopmostPanel(live()) !== entry) return;
      if (!arenaTabLeavesPanel(arenaFocusableElements(ref.overlayElement), this.doc.activeElement, event.shiftKey)) return;
      event.preventDefault();
      dismiss('tab');
    };
    this.doc.addEventListener('keydown', onKey, true);
    this.doc.addEventListener('mousedown', onPress, true);
    ref.overlayElement.addEventListener('keydown', onTab);
    const anchor = this.options.anchor();
    const observer = anchor && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (this.options.matchAnchorWidth) ref.updateSize({ minWidth: anchor.getBoundingClientRect().width });
      ref.updatePosition();
    }) : null;
    observer?.observe(anchor!);
    this.detach = () => {
      observer?.disconnect();
      this.doc.removeEventListener('keydown', onKey, true);
      this.doc.removeEventListener('mousedown', onPress, true);
      ref.overlayElement.removeEventListener('keydown', onTab);
      const at = stack.indexOf(entry);
      if (at !== -1) stack.splice(at, 1);
    };
  }
}
