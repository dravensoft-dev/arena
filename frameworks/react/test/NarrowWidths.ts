/* One ResizeObserver stub that reports a single width the moment it observes, for the suites that
 * decide a layout on a measured box. happy-dom's own observer never fires, and `LaidOut.ts`'s
 * SilentObserver deliberately never reports either; this one reports on `observe`. A suite that
 * captures the callback and reports later keeps its own stub. */
function reportingObserver(width: number): typeof ResizeObserver {
  return class {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) { this.callback = callback; }
    observe(target: Element) {
      this.callback([{ target, borderBoxSize: [{ inlineSize: width, blockSize: 0 }], contentRect: { width } }] as unknown as ResizeObserverEntry[], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

export function stubNarrow(width: number): () => void {
  const saved = globalThis.ResizeObserver;
  globalThis.ResizeObserver = reportingObserver(width);
  return () => { globalThis.ResizeObserver = saved; };
}

export function narrowWidths<T>(width: number, body: () => T): T {
  const restore = stubNarrow(width);
  try {
    return body();
  } finally {
    restore();
  }
}
