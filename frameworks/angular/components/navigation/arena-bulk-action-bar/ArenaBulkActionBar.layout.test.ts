/* The bar did not fit a phone and exposed nothing about layout, so a consumer reached in and
 * reordered its children by nth-of-type with `order`, which moves the visual order and leaves
 * the focus order where it was. That is the assertion below, and it is the point of the member:
 * stacking must reorder NOTHING. Reaching the narrow shape needs the same lever the ArenaTable
 * suites use, since happy-dom's ResizeObserver never fires on its own. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaBulkAction, ArenaBulkActionBarLayout } from '../../../Api.generated';
import { ArenaBulkActionBar } from './ArenaBulkActionBar';

const BP_SM = '480px';
const NARROW_WIDTH = 390;

const ACTIONS: ArenaBulkAction[] = [
  { id: 'export', label: 'Export' },
  { id: 'archive', label: 'Archive' },
  { id: 'delete', label: 'Delete', destructive: true },
];

@Component({
  standalone: true,
  imports: [ArenaBulkActionBar],
  template: `
    <arena-bulk-action-bar [count]="3" noun="sales" [actions]="actions" [layout]="layout" />
  `,
})
class BarHost {
  actions = ACTIONS;
  layout: ArenaBulkActionBarLayout = 'auto';
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

async function render(patch: Partial<BarHost> = {}): Promise<ComponentFixture<BarHost>> {
  const fixture = TestBed.createComponent(BarHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function bar(fixture: ComponentFixture<BarHost>): HTMLElement {
  return (fixture.nativeElement as Element).querySelector('arena-bulk-action-bar') as HTMLElement;
}

function labels(fixture: ComponentFixture<BarHost>): string[] {
  return [...bar(fixture).querySelectorAll('button')].map((b) => (b.textContent ?? '').trim());
}

test('the narrow shape stacks and reorders NOTHING, so focus order still matches reading order', async () => {
  document.documentElement.style.setProperty('--bp-sm', BP_SM);
  const restore = stubResize(NARROW_WIDTH);
  let narrow: ComponentFixture<BarHost> | null = null;
  let wide: ComponentFixture<BarHost> | null = null;
  try {
    narrow = await render();
    const root = bar(narrow);
    assert.match(root.className, /arena-bulk-action-bar__root--narrow-true/, 'the narrow shape must stack');
    assert.match(root.className, /arena-bulk-action-bar__root--narrow-true/);

    const stacked = labels(narrow);
    restore();
    wide = await render();
    assert.deepEqual(stacked, labels(wide),
      'stacking must not move a single control: the DOM order IS the focus order, and any '
      + '`order` or reversal here puts the tab sequence out of step with what is on screen');
    assert.deepEqual(stacked, ['Export', 'Archive', 'Delete', 'Clear']);
  } finally {
    narrow?.destroy();
    wide?.destroy();
    document.documentElement.style.removeProperty('--bp-sm');
  }
});

test('layout="inline" keeps the one row at every width', async () => {
  document.documentElement.style.setProperty('--bp-sm', BP_SM);
  const restore = stubResize(NARROW_WIDTH);
  let fixture: ComponentFixture<BarHost> | null = null;
  try {
    fixture = await render({ layout: 'inline' });
    assert.doesNotMatch(bar(fixture).className, /arena-bulk-action-bar__root--narrow-true/,
      'inline is the opt-out for a bar in a place the consumer knows is wide');
  } finally {
    fixture?.destroy();
    restore();
    document.documentElement.style.removeProperty('--bp-sm');
  }
});

test('the wide shape is the single row it always was', async () => {
  let fixture: ComponentFixture<BarHost> | null = null;
  try {
    fixture = await render();
    assert.doesNotMatch(bar(fixture).className, /arena-bulk-action-bar__root--narrow-true/);
    assert.deepEqual(labels(fixture), ['Export', 'Archive', 'Delete', 'Clear']);
  } finally { fixture?.destroy(); }
});
