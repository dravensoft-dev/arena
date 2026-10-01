/* happy-dom has no layout: every box is 0 wide and its ResizeObserver never reports. laidOut
 * lays every element out at one width, answered as the computed width a browser resolves (a
 * hidden box answers its specified width, a percentage included, as a browser does), and
 * draws it at `drawn`, answered by getBoundingClientRect, which is what a transform changes. It
 * installs an observer that records what it was handed and never reports, so a width a test
 * sees came from the hook's own synchronous read and from nothing an observer delivered. */
export class SilentObserver {
  static made: SilentObserver[] = [];
  static connected = 0;
  static peak = 0;
  readonly observed: Element[] = [];
  readonly options: (ResizeObserverOptions | undefined)[] = [];
  disconnected = false;
  readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    SilentObserver.made.push(this);
  }
  observe(target: Element, options?: ResizeObserverOptions): void {
    if (this.observed.length === 0) {
      SilentObserver.connected += 1;
      SilentObserver.peak = Math.max(SilentObserver.peak, SilentObserver.connected);
    }
    this.observed.push(target);
    this.options.push(options);
  }
  unobserve(): void {}
  disconnect(): void {
    if (!this.disconnected && this.observed.length > 0) SilentObserver.connected -= 1;
    this.disconnected = true;
  }
}

export function laidOut<T>(width: number, body: () => T, drawn = width): T {
  const savedObserver = globalThis.ResizeObserver;
  const savedRect = Element.prototype.getBoundingClientRect;
  const view = document.defaultView!;
  const savedStyle = view.getComputedStyle;
  SilentObserver.made = [];
  SilentObserver.connected = 0;
  SilentObserver.peak = 0;
  globalThis.ResizeObserver = SilentObserver as unknown as typeof ResizeObserver;
  Element.prototype.getBoundingClientRect = function rect(this: Element): DOMRect {
    const box = savedStyle.call(view, this).display === 'none' ? 0 : drawn;
    return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: box, width: box, height: 0, toJSON() { return this; } } as DOMRect;
  };
  view.getComputedStyle = function computed(element: Element, pseudo?: string | null): CSSStyleDeclaration {
    const real = savedStyle.call(view, element, pseudo);
    return new Proxy(real, {
      get(target, property) {
        if (property === 'width') return target.display === 'none' ? target.width || 'auto' : `${width}px`;
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  } as typeof view.getComputedStyle;
  try {
    return body();
  } finally {
    globalThis.ResizeObserver = savedObserver;
    Element.prototype.getBoundingClientRect = savedRect;
    view.getComputedStyle = savedStyle;
  }
}
