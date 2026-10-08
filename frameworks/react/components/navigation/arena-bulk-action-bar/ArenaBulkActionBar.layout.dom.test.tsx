/* The bar did not fit a phone and exposed nothing about layout, so a consumer reached in and
 * reordered its children by position with `order`, which moves the visual order and leaves the
 * focus order where it was. That is the assertion below, and it is the point of the member:
 * stacking must reorder NOTHING. happy-dom's ResizeObserver never fires on its own, so the
 * narrow shape needs the same stub the ArenaTable suites use and restore. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaBulkActionBar } from './ArenaBulkActionBar.tsx';
import type { ArenaBulkAction, ArenaBulkActionBarLayout } from '../../../Api.generated';

afterEach(cleanup);

const NARROW_WIDTH = 390;

const ACTIONS: ArenaBulkAction[] = [
  { id: 'export', label: 'Export' },
  { id: 'archive', label: 'Archive' },
  { id: 'delete', label: 'Delete', destructive: true },
];

function narrowWidths<T>(width: number, body: () => T): T {
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

function render(layout?: ArenaBulkActionBarLayout) {
  return mount(<ArenaBulkActionBar count={3} noun="sales" actions={ACTIONS} layout={layout} />);
}

function bar(root: Element): HTMLElement {
  return root.querySelector('[role="toolbar"]') as HTMLElement;
}

function labels(root: Element): string[] {
  return [...bar(root).querySelectorAll('button')].map((b) => (b.textContent ?? '').trim());
}

test('the narrow shape stacks and reorders NOTHING, so focus order still matches reading order', () => {
  const narrow = narrowWidths(NARROW_WIDTH, () => render());
  assert.equal(bar(narrow).hasAttribute('data-arena-narrow'), true, 'the narrow shape must stack');
  assert.equal(bar(narrow).hasAttribute('data-arena-narrow'), true);
  const stacked = labels(narrow);

  cleanup();
  const wide = render();
  assert.deepEqual(stacked, labels(wide),
    'stacking must not move a single control: the DOM order IS the focus order, and any '
    + '`order` or reversal here puts the tab sequence out of step with what is on screen');
  assert.deepEqual(stacked, ['Export', 'Archive', 'Delete', 'Clear']);
});

test('layout="inline" keeps the one row at every width', () => {
  const root = narrowWidths(NARROW_WIDTH, () => render('inline'));
  assert.equal(bar(root).hasAttribute('data-arena-narrow'), false,
    'inline is the opt-out for a bar in a place the consumer knows is wide');
});

test('the wide shape is the single row it always was', () => {
  const root = render();
  assert.equal(bar(root).hasAttribute('data-arena-narrow'), false);
  assert.deepEqual(labels(root), ['Export', 'Archive', 'Delete', 'Clear']);
});
