/* The bar measures its own host below the sm breakpoint and stacks, and stacking reorders nothing:
 * the controls, the chips and Clear all keep one order in both shapes, so focus order matches
 * reading order. happy-dom's ResizeObserver never fires on its own, so the suite stubs it. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaFilterBar } from './ArenaFilterBar';

const page = document.documentElement;
before(() => { page.style.setProperty('--bp-sm', '480px'); });
after(() => { page.style.removeProperty('--bp-sm'); });

@Component({
  selector: 'filter-bar-layout-host',
  standalone: true,
  imports: [ArenaFilterBar],
  template: `<arena-filter-bar label="Deployment filters" [applied]="[{ id: 'region', label: 'Region: Europe West' }]">
    <select aria-label="Region"></select><input aria-label="Search" />
  </arena-filter-bar>`,
})
class Host {}

function measured(width: number): HTMLElement {
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
    unobserve(): void {}
    disconnect(): void {}
  };
  try {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  } finally {
    globals.ResizeObserver = saved;
  }
}

const order = (root: Element) => [...root.querySelectorAll('select, input, button')].map((el) => el.getAttribute('aria-label') ?? el.getAttribute('data-arena-part'));

test('a host narrower than sm stacks, and a wide one stays a row', () => {
  assert.equal(measured(320).querySelector('arena-filter-bar')!.hasAttribute('data-arena-narrow'), true);
  assert.equal(measured(900).querySelector('arena-filter-bar')!.hasAttribute('data-arena-narrow'), false);
});

test('stacking reorders nothing', () => {
  const narrow = order(measured(320));
  const wide = order(measured(900));
  assert.deepEqual(narrow, wide);
  assert.deepEqual(wide, ['Region', 'Search', 'tag.close', 'Clear all filters']);
});

test('the bar stacks one pixel under sm and stays a row at sm itself', () => {
  assert.equal(measured(479).querySelector('arena-filter-bar')!.hasAttribute('data-arena-narrow'), true);
  assert.equal(measured(480).querySelector('arena-filter-bar')!.hasAttribute('data-arena-narrow'), false);
});
