import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  arenaEscapeInsideModal, arenaOpeningFocus, arenaPanelsAbove, arenaPlacePanel, arenaPressInside, arenaTabLeavesPanel,
  arenaTopmostPanel,
} from './AnchoredPanel.ts';
import type { ArenaPanelAlign, ArenaPanelDismissal, ArenaPanelSide } from './AnchoredPanel.ts';
import { arenaFocusableElements } from './UseDialogModal.ts';

export type { ArenaPanelAlign, ArenaPanelDismissal, ArenaPanelSide };

export interface ArenaAnchoredPanelOptions {
  open: boolean;
  anchor: React.RefObject<HTMLElement | null>;
  trigger: () => HTMLElement | null;
  panel: React.RefObject<HTMLElement | null>;
  onDismiss: (reason: ArenaPanelDismissal) => void;
  offset: number;
  align?: ArenaPanelAlign;
  prefer?: ArenaPanelSide;
  matchAnchorWidth?: boolean;
  focusOnOpen?: (panel: HTMLElement) => HTMLElement | null;
  restoreFocus?: boolean;
  tabOut?: boolean;
}

interface StackEntry {
  panel: HTMLElement;
}

const stack: StackEntry[] = [];

const live = () => stack.filter((entry) => entry.panel.isConnected);

export const ARENA_PANEL_POPOVER: Readonly<Record<string, string>> = { popover: 'manual' };

export function arenaFirstFocusable(panel: HTMLElement): HTMLElement {
  return arenaOpeningFocus(arenaFocusableElements(panel), panel);
}

export function useArenaAnchoredPanel(options: ArenaAnchoredPanelOptions): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const latest = useRef(options);
  latest.current = options;
  const present = options.open && hydrated;

  useEffect(() => {
    const panel = latest.current.panel.current;
    if (!present || !panel) return undefined;
    const doc = panel.ownerDocument;
    const view = doc.defaultView;
    if (panel.isConnected && typeof panel.showPopover === 'function') panel.showPopover();

    let matched = '';
    const place = () => {
      const anchor = latest.current.anchor.current;
      if (!anchor || !view) return;
      const box = anchor.getBoundingClientRect();
      if (latest.current.matchAnchorWidth && matched !== `${box.width}px`) {
        matched = `${box.width}px`;
        panel.style.minWidth = matched;
      }
      panel.style.position = 'fixed';
      panel.style.inset = 'auto';
      panel.style.margin = '0';
      const own = panel.getBoundingClientRect();
      const placed = arenaPlacePanel(box, { width: own.width, height: own.height },
        { width: doc.documentElement.clientWidth, height: view.innerHeight },
        latest.current.align ?? 'start', latest.current.offset, latest.current.prefer ?? 'below');
      panel.style.left = `${placed.x}px`;
      panel.style.top = `${placed.y}px`;
    };
    place();

    const entry: StackEntry = { panel };
    stack.push(entry);
    const dismiss = (reason: ArenaPanelDismissal) => {
      latest.current.onDismiss(reason);
      if (reason !== 'outside' && latest.current.restoreFocus) latest.current.trigger()?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || arenaTopmostPanel(live()) !== entry) return;
      if (event.target instanceof Element && arenaEscapeInsideModal<Element>(event.target, panel)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dismiss('escape');
    };
    const onPress = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      const above = arenaPanelsAbove(live(), entry).map((one) => one.panel);
      const regions = [latest.current.anchor.current, latest.current.trigger(), panel, ...above];
      if (!arenaPressInside(event.target, regions)) dismiss('outside');
    };
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented || !latest.current.tabOut) return;
      if (arenaTopmostPanel(live()) !== entry) return;
      if (!arenaTabLeavesPanel(arenaFocusableElements(panel), doc.activeElement, event.shiftKey)) return;
      event.preventDefault();
      dismiss('tab');
    };
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('mousedown', onPress, true);
    doc.addEventListener('scroll', place, true);
    panel.addEventListener('keydown', onTab);
    view?.addEventListener('resize', place);
    const observer = view && typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(place) : null;
    observer?.observe(panel);
    const anchorNow = latest.current.anchor.current;
    if (anchorNow) observer?.observe(anchorNow);
    const focusOnOpen = latest.current.focusOnOpen;
    if (focusOnOpen) focusOnOpen(panel)?.focus();

    return () => {
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('mousedown', onPress, true);
      doc.removeEventListener('scroll', place, true);
      panel.removeEventListener('keydown', onTab);
      view?.removeEventListener('resize', place);
      observer?.disconnect();
      const at = stack.indexOf(entry);
      if (at !== -1) stack.splice(at, 1);
      if (panel.isConnected && typeof panel.hidePopover === 'function') panel.hidePopover();
    };
  }, [present]);

  return present;
}
