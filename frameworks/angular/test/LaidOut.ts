/* happy-dom has no layout: every box is 0 wide and its ResizeObserver never reports. laidOut
 * gives every element one width through getBoundingClientRect and installs an observer that
 * records what it was handed and never reports, so a width a test sees came from the hook's
 * own synchronous read and from nothing an observer delivered. */
export class SilentObserver {
  static made: SilentObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;
  readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    SilentObserver.made.push(this);
  }
  observe(target: Element): void { this.observed.push(target); }
  unobserve(): void {}
  disconnect(): void { this.disconnected = true; }
}

export function laidOut<T>(width: number, body: () => T): T {
  const savedObserver = globalThis.ResizeObserver;
  const savedRect = Element.prototype.getBoundingClientRect;
  SilentObserver.made = [];
  globalThis.ResizeObserver = SilentObserver as unknown as typeof ResizeObserver;
  Element.prototype.getBoundingClientRect = function rect(): DOMRect {
    return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: width, width, height: 0, toJSON() { return this; } } as DOMRect;
  };
  try {
    return body();
  } finally {
    globalThis.ResizeObserver = savedObserver;
    Element.prototype.getBoundingClientRect = savedRect;
  }
}
