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

function isRadio(el: Element): el is HTMLInputElement {
  return el instanceof HTMLInputElement && el.type === 'radio';
}

function sameRadioGroup(a: HTMLInputElement, b: HTMLInputElement): boolean {
  return a.name !== '' && a.name === b.name && a.form === b.form;
}

function reachableElements(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function arenaFocusableElements(container: Element): HTMLElement[] {
  const reachable = reachableElements(container);
  return reachable.filter((el) => {
    if (!isRadio(el) || el.name === '') return true;
    const group = reachable.filter((one): one is HTMLInputElement => isRadio(one) && sameRadioGroup(one, el));
    return el === (group.find((one) => one.checked) ?? group[0]);
  });
}

export function arenaTabStopOf(focusables: readonly HTMLElement[], el: Element | null): Element | null {
  if (el === null || !isRadio(el) || focusables.includes(el as HTMLElement)) return el;
  const stop = focusables.find((one) => isRadio(one) && sameRadioGroup(one, el));
  return stop ?? el;
}

function lastStop(container: Element, stop: HTMLElement): HTMLElement {
  if (!isRadio(stop) || stop.name === '' || stop.checked) return stop;
  const group = reachableElements(container).filter((one): one is HTMLInputElement => isRadio(one) && sameRadioGroup(one, stop));
  return group[group.length - 1] ?? stop;
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
  const stopNow = arenaTabStopOf(focusables, activeElement);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (first === undefined || last === undefined) { event.preventDefault(); return; }
  if (event.shiftKey && stopNow === first) { event.preventDefault(); lastStop(container, last).focus(); }
  else if (!event.shiftKey && stopNow === last) { event.preventDefault(); first.focus(); }
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
