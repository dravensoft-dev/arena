import type * as React from 'react';
import { useEffect, useRef } from 'react';

const REACHABLE_BY_TAB = ':not([tabindex="-1"])';
const NOT_DISABLED = ':not([disabled])';

const FOCUSABLE_SELECTOR = [
  `a[href]${REACHABLE_BY_TAB}`,
  `button${NOT_DISABLED}${REACHABLE_BY_TAB}`,
  `input${NOT_DISABLED}${REACHABLE_BY_TAB}`,
  `select${NOT_DISABLED}${REACHABLE_BY_TAB}`,
  `textarea${NOT_DISABLED}${REACHABLE_BY_TAB}`,
  `[tabindex]${REACHABLE_BY_TAB}`,
].join(', ');

export function arenaFocusableElements(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function arenaFocusFirstFocusable(container: HTMLElement): void {
  const [first] = arenaFocusableElements(container);
  (first ?? container).focus();
}

export function arenaTrapTabKey(
  container: Element,
  event: Pick<KeyboardEvent, 'shiftKey'> & { key?: string; preventDefault(): void },
  activeElement: Element | null,
): void {
  const focusables = arenaFocusableElements(container);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (first === undefined || last === undefined) { event.preventDefault(); return; }
  if (event.shiftKey && activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && activeElement === last) { event.preventDefault(); first.focus(); }
}

export interface ArenaDialogModalOptions {
  open: boolean;
  panelRef: React.RefObject<HTMLElement | null>;
  onDismiss?: () => void;
}

export function useArenaDialogModal({ open, panelRef, onDismiss }: ArenaDialogModalOptions):
(event: React.KeyboardEvent) => void {
  const restoreTo = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      if (restoreTo.current === null) {
        restoreTo.current = typeof document === 'undefined' ? null : document.activeElement;
      }
      const panel = panelRef.current;
      if (panel) arenaFocusFirstFocusable(panel);
      return undefined;
    }
    const target = restoreTo.current;
    restoreTo.current = null;
    if (target instanceof HTMLElement) target.focus();
    return undefined;
  }, [open]);

  return (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); if (onDismiss) onDismiss(); return; }
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (panel) arenaTrapTabKey(panel, event, panel.ownerDocument.activeElement);
  };
}
