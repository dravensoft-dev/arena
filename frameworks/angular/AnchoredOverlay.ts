import {
  DOCUMENT, DestroyRef, Injector, ViewContainerRef, afterNextRender, effect, inject, signal, untracked,
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
import { arenaFocusableElements, arenaTabStopOf } from './FocusTrap';
import { ArenaThemeService, arenaPolarityClass } from './theme/ArenaThemeService';

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

export interface ArenaScopeDress {
  classes: string[];
  properties: Record<string, string>;
}

export function arenaScopeDress(anchor: Element, theme: ArenaThemeService | null): ArenaScopeDress {
  const style = getComputedStyle(anchor);
  const read = (property: string) => style.getPropertyValue(property).trim();
  const runtime = theme?.runtimePalette(read('--arena-palette')) ?? null;
  const classes = ['--arena-palette', '--arena-plugin', '--arena-density']
    .map((property) => [property, read(property)] as const)
    .filter(([, value]) => value !== '')
    .map(([property, value]) => (runtime && property === '--arena-palette' ? arenaPolarityClass(runtime.polarity) : `arena-${value}`));
  return { classes, properties: runtime ? { ...runtime.properties } : {} };
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
  private paneClasses: string[] = [];
  private paneProperties: string[] = [];
  private following = false;

  readonly isOpen: Signal<boolean> = this.shown.asReadonly();

  constructor(options: ArenaAnchoredOverlayOptions) {
    this.options = options;
    inject(DestroyRef).onDestroy(() => this.close());
  }

  private followTheme(): void {
    if (this.following) return;
    this.following = true;
    const theme = this.injector.get(ArenaThemeService, null);
    if (!theme) return;
    effect(() => {
      theme.theme();
      theme.runtimePalettes();
      untracked(() => this.refreshPaneClasses());
    }, { injector: this.injector });
  }

  private refreshPaneClasses(): void {
    const ref = this.ref;
    const anchor = this.options.anchor();
    if (!ref || !anchor) return;
    const { classes: next, properties } = arenaScopeDress(anchor, this.injector.get(ArenaThemeService, null));
    const stale = this.paneClasses.filter((name) => !next.includes(name));
    if (stale.length) ref.removePanelClass(stale);
    if (next.length) ref.addPanelClass(next);
    this.paneClasses = next;
    this.wearProperties(ref, properties);
  }

  private wearProperties(ref: OverlayRef, properties: Record<string, string>): void {
    for (const name of this.paneProperties) ref.overlayElement.style.removeProperty(name);
    for (const [name, value] of Object.entries(properties)) ref.overlayElement.style.setProperty(name, value);
    this.paneProperties = Object.keys(properties);
  }

  panelElement(): HTMLElement | null {
    const first = this.ref?.overlayElement.firstElementChild;
    return first instanceof HTMLElement ? first : null;
  }

  open(): void {
    const anchor = this.options.anchor();
    if (this.ref || !anchor) return;
    const { classes, properties } = arenaScopeDress(anchor, this.injector.get(ArenaThemeService, null));
    const ref = createOverlayRef(this.injector, {
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, anchor)
        .withPositions(arenaPhysicalPositions(this.options.positions(), this.directionality.value === 'rtl'))
        .withPush(true),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      panelClass: classes,
    });
    if (this.options.matchAnchorWidth) ref.updateSize({ minWidth: anchor.getBoundingClientRect().width });
    ref.attach(new TemplatePortal(this.options.panel(), this.viewContainer));
    this.ref = ref;
    this.paneClasses = classes;
    this.paneProperties = [];
    this.wearProperties(ref, properties);
    this.followTheme();
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
    this.paneClasses = [];
    this.paneProperties = [];
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
      const list = arenaFocusableElements(ref.overlayElement);
      if (!arenaTabLeavesPanel(list, arenaTabStopOf(list, this.doc.activeElement), event.shiftKey)) return;
      event.preventDefault();
      dismiss('tab');
    };
    this.doc.addEventListener('keydown', onKey, true);
    this.doc.addEventListener('mousedown', onPress, true);
    ref.overlayElement.addEventListener('keydown', onTab);
    const anchor = this.options.anchor();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (anchor && this.options.matchAnchorWidth) ref.updateSize({ minWidth: anchor.getBoundingClientRect().width });
      ref.updatePosition();
    }) : null;
    observer?.observe(ref.overlayElement);
    if (anchor) observer?.observe(anchor);
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
