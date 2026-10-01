import type * as React from 'react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

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
  let live = true;
  const disconnect = () => { observer?.disconnect(); observer = null; };
  const observe = (next: T | null) => {
    disconnect();
    if (!next || !live) return;
    const now = outerWidth(next);
    if (now > 0) report(now);
    if (typeof ResizeObserver === 'undefined') return;
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entryWidth(entry);
        if (width > 0) report(width);
      }
    });
    observer.observe(next);
  };
  const ref = (target ?? { current: null }) as React.RefObject<T>;
  interceptCurrent(ref as { current: T | null }, observe);
  return {
    ref,
    resume: () => {
      live = true;
      if (!observer) observe(ref.current);
    },
    stop: () => {
      live = false;
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

const cache = new Map<string, number>();

const warned = new Set<string>();

function warnUnresolved(name: string): void {
  if (warned.has(name) || typeof console === 'undefined') return;
  warned.add(name);
  console.warn(`[arena] --bp-${name} did not resolve, so arenaReadBreakpoint('${name}') is NaN and every`
    + ' comparison against it is false: a responsive component stays on its wide branch on a phone.'
    + " Arena's stylesheet is missing, or it loads after this ran.");
}

export function forgetArenaBreakpoints(): void {
  cache.clear();
  warned.clear();
}

function viewportQuery(threshold: number): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia || !Number.isFinite(threshold)) return null;
  return window.matchMedia(`not all and (min-width: ${threshold}px)`);
}

const serverBelow = () => false;

export function useArenaViewportBelow(name: ArenaBreakpointName): boolean {
  const width = arenaReadBreakpoint(name);
  const subscribe = useCallback((onChange: () => void) => {
    const query = viewportQuery(width);
    if (!query) return () => {};
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [width]);
  const snapshot = useCallback(() => viewportQuery(width)?.matches ?? false, [width]);
  return useSyncExternalStore(subscribe, snapshot, serverBelow);
}

export function arenaReadBreakpoint(name: ArenaBreakpointName): number {
  if (typeof document === 'undefined') return NaN;
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--bp-${name}`);
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) {
    warnUnresolved(name);
    return NaN;
  }
  cache.set(name, value);
  return value;
}
