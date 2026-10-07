/* A column is named by its key; the table binds the column's width and alignment under it on every
 * header and cell. happy-dom computes no layout, so the fallback a keyed column keeps when its
 * properties are unset is asserted on the slot class, and Chromium holds it through the demo's pixels. */
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ArenaTable } from './ArenaTable.tsx';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';
import classes from './ArenaTable.classes.generated.ts';
import tailwind from './ArenaTable.manifest.generated.ts';

const WIDTH = '--arena-column-width';
const ALIGN = '--arena-column-align';
const warnings: string[] = [];
const savedWarn = console.warn;

beforeEach(() => {
  forgetArenaWarnings();
  warnings.length = 0;
  console.warn = (message: string) => { warnings.push(message); };
});
afterEach(() => { cleanup(); console.warn = savedWarn; });

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

const table = (key: string | undefined, responsive = false) => (
  <ArenaTable label="Deployments" columns={[{ header: 'Status', key }]} responsive={responsive}>
    <ArenaTableRow><ArenaTableCell>Healthy</ArenaTableCell></ArenaTableRow>
  </ArenaTable>
);
const channel = (el: Element, name: string) => (el as HTMLElement).style.getPropertyValue(name);
const cellsOf = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('th, td')];

for (const key of ['order.id', 'first name', '']) {
  test(`the column key "${key}" warns once and writes initial on both channels of the header and the cell`, () => {
    const root = mount(table(key));
    mount(table(key));
    const cells = cellsOf(root);
    assert.equal(cells.length, 2);
    for (const cell of cells) {
      assert.equal(channel(cell, WIDTH), 'initial');
      assert.equal(channel(cell, ALIGN), 'initial');
    }
    assert.equal(warnings.length, 1, 'the warning is once per key');
    assert.match(warnings[0]!, new RegExp(`column key "${key}" is not a custom property name`));
  });
}

test('a valid key binds both properties on the header and on the cell', () => {
  const cells = cellsOf(mount(table('status')));
  assert.deepEqual(cells.map((c) => c.tagName), ['TH', 'TD']);
  for (const cell of cells) {
    assert.equal(channel(cell, WIDTH), 'var(--arena-column-status-width)');
    assert.equal(channel(cell, ALIGN), 'var(--arena-column-status-align)');
  }
  assert.equal(warnings.length, 0);
});

test('a column with no key writes initial on both channels and warns nothing', () => {
  for (const cell of cellsOf(mount(table(undefined)))) {
    assert.equal(channel(cell, WIDTH), 'initial');
    assert.equal(channel(cell, ALIGN), 'initial');
  }
  assert.equal(warnings.length, 0);
});

test('a narrow (card) table writes initial on both channels of every cell', () => {
  const root = narrowWidths(300, () => mount(table('status', true)));
  const cells = [...root.querySelectorAll<HTMLElement>('td')];
  assert.ok(cells.length > 0, 'the card layout drew no cell');
  assert.equal(root.querySelectorAll('th').length, 0, 'the card layout drew a header');
  for (const cell of cells) {
    assert.equal(channel(cell, WIDTH), 'initial');
    assert.equal(channel(cell, ALIGN), 'initial');
  }
});

test('a keyed column with no property set keeps auto and left on its header and cell', () => {
  const root = mount(<div style={{ textAlign: 'center' }}>{table('status')}</div>);
  const th = root.querySelector('th')!;
  assert.ok(th.classList.contains(classes.slots.th), 'the header does not carry the th slot class');
  assert.ok(tailwind.slots.th.includes(`[text-align:var(${ALIGN},left)]`), 'the th slot does not fall back to left');
  assert.ok(tailwind.slots.th.includes(`w-[var(${WIDTH},auto)]`), 'the th slot does not fall back to auto');
  const td = root.querySelector('td')!;
  assert.ok(td.classList.contains(classes.slots.td), 'the cell does not carry the td slot class');
  assert.ok(tailwind.slots.td.includes(`[text-align:var(${ALIGN},left)]`), 'the td slot does not fall back to left');
  assert.ok(tailwind.slots.td.includes(`w-[var(${WIDTH},auto)]`), 'the td slot does not fall back to auto');
});
