/* A column is named by its key; the table binds the column's width and alignment under it on every
 * header and cell. happy-dom computes no layout, so the fallback a keyed column keeps when its
 * properties are unset is asserted on the slot class, and Chromium holds it through the demo's pixels. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { forgetArenaWarnings } from '../../../WarnOnce';
import type { ArenaTableColumn } from '../../../Api.generated';
import { ArenaTable } from './ArenaTable';
import { ArenaTableRow } from '../arena-table-row/ArenaTableRow';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell';
import classes from './ArenaTable.classes.generated';

const tailwind = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'display/arena-table/ArenaTable.manifest.json'), 'utf8')) as { slots: Record<string, string> };
const WIDTH = '--arena-column-width';
const ALIGN = '--arena-column-align';
const warnings: string[] = [];
const savedWarn = console.warn;

beforeEach(() => {
  forgetArenaWarnings();
  warnings.length = 0;
  console.warn = (message: string) => { warnings.push(message); };
});
afterEach(() => { console.warn = savedWarn; });

@Component({
  standalone: true,
  imports: [ArenaTable, ArenaTableRow, ArenaTableCell],
  template: `
    <arena-table label="Deployments" [columns]="columns" [responsive]="responsive">
      <tr arena-table-row><td arena-table-cell>Healthy</td></tr>
    </arena-table>
  `,
})
class ColumnsHost {
  columns: ArenaTableColumn[] = [{ header: 'Status' }];
  responsive = false;
}

function stubResize(width: number): () => void {
  const globals = globalThis as { ResizeObserver?: unknown };
  const saved = globals.ResizeObserver;
  globals.ResizeObserver = class {
    private readonly callback: (entries: Array<{ target: Element; borderBoxSize: Array<{ inlineSize: number; blockSize: number }>; contentRect: { width: number } }>) => void;

    constructor(callback: (entries: Array<{ target: Element; borderBoxSize: Array<{ inlineSize: number; blockSize: number }>; contentRect: { width: number } }>) => void) {
      this.callback = callback;
    }

    observe(target: Element): void {
      this.callback([{ target, borderBoxSize: [{ inlineSize: width, blockSize: 0 }], contentRect: { width } }]);
    }

    disconnect(): void {}
  };
  return () => { globals.ResizeObserver = saved; };
}

async function render(key: string | undefined, responsive = false): Promise<ComponentFixture<ColumnsHost>> {
  const fixture = TestBed.createComponent(ColumnsHost);
  fixture.componentInstance.columns = [{ header: 'Status', key }];
  fixture.componentInstance.responsive = responsive;
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const channel = (el: Element, name: string) => (el as HTMLElement).style.getPropertyValue(name);
const cellsOf = (fixture: ComponentFixture<unknown>) => [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('th, td')];

for (const key of ['order.id', 'first name', '']) {
  test(`the column key "${key}" warns once and writes initial on both channels of the header and the cell`, async () => {
    const fixture = await render(key);
    await render(key);
    const cells = cellsOf(fixture);
    assert.equal(cells.length, 2);
    for (const cell of cells) {
      assert.equal(channel(cell, WIDTH), 'initial');
      assert.equal(channel(cell, ALIGN), 'initial');
    }
    assert.equal(warnings.length, 1, 'the warning is once per key');
    assert.match(warnings[0]!, new RegExp(`ArenaTable "Deployments": column key "${key}" is not a custom property name`));
  });
}

test('a valid key binds both properties on the header and on the cell', async () => {
  const cells = cellsOf(await render('status'));
  assert.deepEqual(cells.map((c) => c.tagName), ['TH', 'TD']);
  for (const cell of cells) {
    assert.equal(channel(cell, WIDTH), 'var(--arena-column-status-width)');
    assert.equal(channel(cell, ALIGN), 'var(--arena-column-status-align)');
  }
  assert.equal(warnings.length, 0);
});

test('a column with no key writes initial on both channels and warns nothing', async () => {
  for (const cell of cellsOf(await render(undefined))) {
    assert.equal(channel(cell, WIDTH), 'initial');
    assert.equal(channel(cell, ALIGN), 'initial');
  }
  assert.equal(warnings.length, 0);
});

test('a narrow (card) table writes initial on both channels of every cell', async () => {
  document.documentElement.style.setProperty('--bp-md', '768px');
  const restore = stubResize(300);
  try {
    const fixture = await render('status', true);
    const root = fixture.nativeElement as HTMLElement;
    const cells = [...root.querySelectorAll<HTMLElement>('td')];
    assert.ok(cells.length > 0, 'the card layout drew no cell');
    assert.equal(root.querySelectorAll('th').length, 0, 'the card layout drew a header');
    for (const cell of cells) {
      assert.equal(channel(cell, WIDTH), 'initial');
      assert.equal(channel(cell, ALIGN), 'initial');
    }
  } finally {
    restore();
  }
});

test('a keyed column with no property set keeps auto and left on its header and cell', async () => {
  const fixture = await render('status');
  const th = fixture.nativeElement.querySelector('th') as HTMLElement;
  assert.ok(th.classList.contains(classes.slots.th), 'the header does not carry the th slot class');
  assert.ok(tailwind.slots['th'].includes(`[text-align:var(${ALIGN},left)]`), 'the th slot does not fall back to left');
  assert.ok(tailwind.slots['th'].includes(`w-[var(${WIDTH},auto)]`), 'the th slot does not fall back to auto');
  const td = fixture.nativeElement.querySelector('td') as HTMLElement;
  assert.ok(td.classList.contains(classes.slots.td), 'the cell does not carry the td slot class');
  assert.ok(tailwind.slots['td'].includes(`[text-align:var(${ALIGN},left)]`), 'the td slot does not fall back to left');
  assert.ok(tailwind.slots['td'].includes(`w-[var(${WIDTH},auto)]`), 'the td slot does not fall back to auto');
});
