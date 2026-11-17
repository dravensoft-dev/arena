import type * as React from 'react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { arenaBelowQuery, arenaBreakpointPx, arenaTextScaleOf } from './RootScale.ts';

const px = (value: string) => Number.parseFloat(value) || 0;

function outerWidth(element: Element): number {
  const view = element.ownerDocument.defaultView;
  if (!view) return 0;
  const style = view.getComputedStyle(element);
  const width = style.width.endsWith('px') ? px(style.width) : 0;
  if (width === 0 || style.boxSizing === 'border-box') return width;
  return width + px(style.paddingLeft) + px(style.paddingRight)
    + px(style.borderLeftWidth) + px(style.borderRightWidth);
}

const entryWidth = (entry: ResizeObserverEntry) => entry.borderBoxSize?.[0]?.inlineSize ?? outerWidth(entry.target);

function interceptCurrent<T>(ref: { current: T | null }, onSet: (next: T | null) => void): void {
  const own = Object.getOwnPropertyDescriptor(ref, 'current');
  if (!own?.configurable) return;
  let value = own.value as T | null;
  const read = own.get ?? (() => value);
  const write = own.set ?? ((next: T | null) => { value = next; });
  Object.defineProperty(ref, 'current', {
    configurable: true,
    enumerable: true,
    get: read,
    set(next: T | null) { write(next); onSet(next); },
  });
}

interface WidthWatch<T extends Element> {
  ref: React.RefObject<T>;
  resume(): void;
  stop(): void;
}

function watchWidth<T extends Element>(
  target: React.RefObject<T | null> | undefined,
  report: (width: number) => void,
): WidthWatch<T> {
  let observer: ResizeObserver | null = null;
  let state: 'fresh' | 'live' | 'stopped' = 'fresh';
  const disconnect = () => { observer?.disconnect(); observer = null; };
  const observe = (next: T | null) => {
    disconnect();
    if (!next || state === 'stopped') return;
    const now = outerWidth(next);
    if (now > 0) report(now);
    if (state === 'fresh' || typeof ResizeObserver === 'undefined') return;
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entryWidth(entry);
        if (width > 0) report(width);
      }
    });
    observer.observe(next, { box: 'border-box' });
  };
  const ref = (target ?? { current: null }) as React.RefObject<T>;
  interceptCurrent(ref as { current: T | null }, observe);
  return {
    ref,
    resume: () => {
      state = 'live';
      if (!observer) observe(ref.current);
    },
    stop: () => {
      state = 'stopped';
      disconnect();
    },
  };
}

export function useArenaContainerWidth<T extends Element = HTMLDivElement>(target?: React.RefObject<T | null>):
[React.RefObject<T>, number | null] {
  const [width, setWidth] = useState<number | null>(null);
  const watch = useRef<WidthWatch<T> | null>(null);
  watch.current ??= watchWidth<T>(target, setWidth);

  useEffect(() => {
    const current = watch.current!;
    current.resume();
    return current.stop;
  }, []);

  return [watch.current.ref, width];
}

export type ArenaBreakpointName = 'sm' | 'md' | 'lg';

/* The raw token text, by name: the root font size is read against it on every arenaReadBreakpoint call, so a
 * changed root changes the pixels without forgetArenaBreakpoints. The em query does not depend on the root. */
const cache = new Map<string, string>();

const warned = new Set<string>();

function warnUnresolved(name: string): void {
  if (warned.has(name) || typeof console === 'undefined') return;
  warned.add(name);
  console.warn(`[arena] --bp-${name} did not resolve, so arenaReadBreakpoint('${name}') is NaN and every`
    + ' comparison against it is false: a responsive component stays on its wide branch on a phone.'
    + " Arena's stylesheet is missing, or it loads after this ran.");
}

const queries = new Map<string, MediaQueryList>();

export function forgetArenaBreakpoints(): void {
  cache.clear();
  queries.clear();
  warned.clear();
}

function viewportQuery(raw: string | null): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia || raw === null) return null;
  const text = arenaBelowQuery(raw);
  if (text === null) return null;
  let query = queries.get(text);
  if (!query) {
    query = window.matchMedia(text);
    queries.set(text, query);
  }
  return query;
}

const serverBelow = () => false;

export function useArenaViewportBelow(name: ArenaBreakpointName): boolean {
  const raw = typeof document === 'undefined' ? null : rawBreakpoint(name);
  const subscribe = useCallback((onChange: () => void) => {
    const query = viewportQuery(raw);
    if (!query) return () => {};
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [raw]);
  const snapshot = useCallback(() => viewportQuery(raw)?.matches ?? false, [raw]);
  return useSyncExternalStore(subscribe, snapshot, serverBelow);
}

const rootFontSize = () => getComputedStyle(document.documentElement).fontSize;

function rawBreakpoint(name: ArenaBreakpointName): string {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--bp-${name}`).trim();
  if (!Number.isFinite(arenaBreakpointPx(raw, undefined))) {
    warnUnresolved(name);
    return '';
  }
  cache.set(name, raw);
  return raw;
}

/* The breakpoint in px against the root font size as it is now: a rem token follows a changed root, a px
 * token does not. NaN where the token does not resolve. */
export function arenaReadBreakpoint(name: ArenaBreakpointName): number {
  if (typeof document === 'undefined') return NaN;
  const raw = rawBreakpoint(name);
  return raw === '' ? NaN : arenaBreakpointPx(raw, rootFontSize());
}

/* The user's text size as a multiple of the authored root (1 at the browser default), for a reader that
 * measures in px what the stylesheet sizes in rem. 1 where there is no document. */
export function useArenaTextScale(): number {
  if (typeof document === 'undefined') return 1;
  return arenaTextScaleOf(rootFontSize());
}
