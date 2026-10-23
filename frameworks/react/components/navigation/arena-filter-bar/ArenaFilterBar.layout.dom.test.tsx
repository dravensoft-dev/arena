/* The bar stacks by its own width, measured on its own box below the sm breakpoint, and stacking
 * reorders nothing: the controls, the chips and Clear all keep one order wide and narrow, so focus
 * order still matches reading order. happy-dom's ResizeObserver never fires on its own, so the
 * narrow shape needs the stub the bulk action bar's suite uses and restores. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaFilterBar } from './ArenaFilterBar.tsx';

afterEach(cleanup);

function measured<T>(width: number, body: () => T): T {
  const saved = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) { this.callback = callback; }
    observe(target: Element) {
      this.callback([{ target, borderBoxSize: [{ inlineSize: width, blockSize: 0 }], contentRect: { width } }] as unknown as ResizeObserverEntry[], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  try {
    return body();
  } finally {
    globalThis.ResizeObserver = saved;
  }
}

const render = () => mount(
  <ArenaFilterBar label="Deployment filters" applied={[{ id: 'region', label: 'Region: Europe West' }]}>
    <select aria-label="Region" />
    <input aria-label="Search" />
  </ArenaFilterBar>,
);

const order = (root: Element) => [...root.querySelectorAll('select, input, button')].map((el) => el.getAttribute('aria-label') ?? el.getAttribute('data-arena-part'));

test('a bar narrower than sm stacks, and a wide one does not', () => {
  const narrow = measured(320, render).querySelector('[data-arena-part="filter-bar"]')!;
  assert.equal(narrow.hasAttribute('data-arena-narrow'), true);
  cleanup();
  const wide = measured(900, render).querySelector('[data-arena-part="filter-bar"]')!;
  assert.equal(wide.hasAttribute('data-arena-narrow'), false);
});

test('the narrow shape reorders nothing', () => {
  const narrow = order(measured(320, render));
  cleanup();
  const wide = order(measured(900, render));
  assert.deepEqual(narrow, wide);
  assert.deepEqual(wide, ['Region', 'Search', 'tag.close', 'Clear all filters']);
});

test('the bar stacks one pixel under sm and stays a row at sm itself', () => {
  assert.equal(measured(479, render).querySelector('[data-arena-part="filter-bar"]')!.hasAttribute('data-arena-narrow'), true);
  cleanup();
  assert.equal(measured(480, render).querySelector('[data-arena-part="filter-bar"]')!.hasAttribute('data-arena-narrow'), false);
});
