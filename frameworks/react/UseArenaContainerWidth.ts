import type * as React from 'react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export function useArenaContainerWidth<T extends Element = HTMLDivElement>(target?: React.RefObject<T | null>):
[React.RefObject<T>, number | null] {
  const own = useRef<T>(null);
  const ref = (target ?? own) as React.RefObject<T>;
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
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

function viewportQuery(width: number): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia || !Number.isFinite(width)) return null;
  return window.matchMedia(`not all and (min-width: ${width}px)`);
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
