import { afterNextRender, DestroyRef, DOCUMENT, ElementRef, inject, signal, Signal } from '@angular/core';

export type ArenaBreakpointName = 'sm' | 'md' | 'lg';

const breakpoints = new Map<string, number>();

export type WidthTarget = ElementRef<HTMLElement> | (() => HTMLElement | null | undefined);

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

export function arenaContainerWidth(target?: WidthTarget): Signal<number | null> {
  const fallback = target === undefined ? inject<ElementRef<HTMLElement>>(ElementRef) : null;
  const destroyRef = inject(DestroyRef);
  const width = signal<number | null>(null);

  afterNextRender(() => {
    const element = typeof target === 'function'
      ? target()
      : (target ?? fallback)?.nativeElement;
    if (!element) return;
    const now = outerWidth(element);
    if (now > 0) width.set(now);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const next = entryWidth(entry);
        if (next > 0) width.set(next);
      }
    });
    observer.observe(element, { box: 'border-box' });
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
  const view = doc.defaultView;
  if (!view?.matchMedia || !Number.isFinite(width)) return signal(false).asReadonly();
  const query = view.matchMedia(`not all and (min-width: ${width}px)`);
  const below = signal(query.matches);
  const onChange = (event: MediaQueryListEvent) => below.set(event.matches);
  query.addEventListener('change', onChange);
  destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
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
