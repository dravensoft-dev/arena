/* The index carried is the index in `values`, and the fixture is built so the two lists cannot
 * be confused: a zero-valued slice paints no path, so the third VALUE is the second PATH. A
 * consumer indexing the SVG has to reproduce that omission from outside to translate one into
 * the other, which is reverse engineering of a component's own DOM.
 * The legend layout is asserted through the ResizeObserver stub, because happy-dom's never
 * fires on its own and the measured width is what `auto` decides on. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ArenaChartLegendLayout } from '../../../Api.generated';
import { ArenaDoughnutChart } from './ArenaDoughnutChart';

const LABELS = ['Retail', 'Wholesale', 'Consignment', 'Export'];
const VALUES = [40, 25, 0, 35];

@Component({
  standalone: true,
  imports: [ArenaDoughnutChart],
  template: `
    <arena-doughnut-chart [labels]="labels" [series]="series" label="Revenue by channel"
                          [legendLayout]="legendLayout" (sliceActivate)="seen.push($event)" />
  `,
})
class DoughnutHost {
  labels = LABELS;
  values = VALUES;
  series = [{ label: 'Revenue by channel', values: VALUES }];
  legendLayout: ArenaChartLegendLayout = 'auto';
  seen: number[] = [];
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

async function render(patch: Partial<DoughnutHost> = {}): Promise<ComponentFixture<DoughnutHost>> {
  const fixture = TestBed.createComponent(DoughnutHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function host(fixture: ComponentFixture<DoughnutHost>): Element {
  return fixture.nativeElement as Element;
}

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function textWrapper(fixture: ComponentFixture<DoughnutHost>): HTMLElement {
  return host(fixture).querySelector('[role="group"] > button > span:nth-child(2)') as HTMLElement;
}

function stackedText(fixture: ComponentFixture<DoughnutHost>): boolean {
  return textWrapper(fixture).className.includes('--stacked-true');
}

test('a zero-valued slice paints no path, so the drawn shapes are not the values', async () => {
  const fixture = await render();
  try {
    assert.equal(host(fixture).querySelectorAll('path').length, 3,
      'four values, one of them zero, and three arcs: the two lists differ by construction');
  } finally { fixture.destroy(); }
});

test('the index carried is the index in values, not the index among the drawn paths', async () => {
  const fixture = await render();
  try {
    const paths = [...host(fixture).querySelectorAll('path')];
    click(paths[2]!);
    assert.deepEqual(fixture.componentInstance.seen, [3],
      'the third drawn arc is the FOURTH value, and reporting 2 here is the defect this member ends');

    click(paths[0]!);
    assert.deepEqual(fixture.componentInstance.seen, [3, 0]);
  } finally { fixture.destroy(); }
});

test('a legend row reports the same index the arc does, including for the slice with no arc', async () => {
  const fixture = await render();
  try {
    const rows = [...host(fixture).querySelectorAll('[role="group"] > button')];
    assert.equal(rows.length, 4, 'the legend lists every value, arc or no arc');

    click(rows[2]!);
    assert.deepEqual(fixture.componentInstance.seen, [2],
      'the zero-valued entry is unreachable through the SVG, and reachable here');
  } finally { fixture.destroy(); }
});

test('a narrow legend stacks the concept over the figure, and a wide one keeps one line', async () => {
  let narrow: ComponentFixture<DoughnutHost> | null = null;
  let wide: ComponentFixture<DoughnutHost> | null = null;
  const restoreNarrow = stubResize(390);
  try {
    narrow = await render();
    assert.ok(stackedText(narrow),
      'on one line the figure does not yield, so the concept is what gets truncated');
    restoreNarrow();

    const restoreWide = stubResize(1200);
    try {
      wide = await render();
      assert.ok(!stackedText(wide));
    } finally { restoreWide(); }
  } finally {
    narrow?.destroy();
    wide?.destroy();
  }
});

test('the layout can be pinned either way, whatever the container measures', async () => {
  let forced: ComponentFixture<DoughnutHost> | null = null;
  let inline: ComponentFixture<DoughnutHost> | null = null;
  const restoreWide = stubResize(1200);
  try {
    forced = await render({ legendLayout: 'stacked' });
    assert.ok(stackedText(forced));
    restoreWide();

    const restoreNarrow = stubResize(390);
    try {
      inline = await render({ legendLayout: 'inline' });
      assert.ok(!stackedText(inline));
    } finally { restoreNarrow(); }
  } finally {
    forced?.destroy();
    inline?.destroy();
  }
});
