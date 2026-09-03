import { afterNextRender, DestroyRef, DOCUMENT, ElementRef, inject, signal, Signal } from '@angular/core';

export type ArenaBreakpointName = 'sm' | 'md' | 'lg';

const breakpoints = new Map<string, number>();

export type WidthTarget = ElementRef<HTMLElement> | (() => HTMLElement | null | undefined);

export function arenaContainerWidth(target?: WidthTarget): Signal<number | null> {
  const fallback = target === undefined ? inject<ElementRef<HTMLElement>>(ElementRef) : null;
  const destroyRef = inject(DestroyRef);
  const width = signal<number | null>(null);

  afterNextRender(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const element = typeof target === 'function'
      ? target()
      : (target ?? fallback)?.nativeElement;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) width.set(entry.contentRect.width);
    });
    observer.observe(element);
    destroyRef.onDestroy(() => observer.disconnect());
  });

  return width.asReadonly();
}

const warned = new Set<string>();

function warnUnresolved(name: string): void {
  if (warned.has(name) || typeof console === 'undefined') return;
  warned.add(name);
  console.warn(`[arena] --bp-${name} did not resolve, so arenaReadBreakpoint('${name}') is NaN and every`
    + ' comparison against it is false: a responsive component stays on its wide branch on a phone.'
    + " Arena's stylesheet is missing, or it loads after this ran.");
}

function warnAfterTheFirstRender(name: string): void {
  afterNextRender(() => warnUnresolved(name));
}

export function forgetArenaBreakpoints(): void {
  breakpoints.clear();
  warned.clear();
}

export function arenaViewportBelow(name: ArenaBreakpointName): Signal<boolean> {
  const doc = inject(DOCUMENT);
  const destroyRef = inject(DestroyRef);
  const width = arenaReadBreakpoint(name);
  const below = signal(false);

  afterNextRender(() => {
    const view = doc.defaultView;
    if (!view?.matchMedia || !Number.isFinite(width)) return;
    const query = view.matchMedia(`not all and (min-width: ${width}px)`);
    below.set(query.matches);
    const onChange = (event: MediaQueryListEvent) => below.set(event.matches);
    query.addEventListener('change', onChange);
    destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  });

  return below.asReadonly();
}

export function arenaReadBreakpoint(name: ArenaBreakpointName): number {
  const doc = inject(DOCUMENT);
  const cached = breakpoints.get(name);
  if (cached !== undefined) return cached;
  const raw = doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue(`--bp-${name}`);
  const value = Number.parseFloat(raw ?? '');
  if (!Number.isFinite(value)) {
    warnAfterTheFirstRender(name);
    return Number.NaN;
  }
  breakpoints.set(name, value);
  return value;
}
