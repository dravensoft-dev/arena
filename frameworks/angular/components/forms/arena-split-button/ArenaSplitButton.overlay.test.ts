/* The split's menu at work: the caret opens it while the primary action runs and not while the
 * split is disabled, an entry reports the whole item, and Escape brings focus back to the caret.
 * happy-dom lays nothing out, so the alignment cases stub every box, the caret's apart from the
 * split's, and read where the overlay put the panel to see which box it was placed against. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaMenuAlign, ArenaMenuItem } from '../../../Api.generated';
import { ArenaSplitButton } from './ArenaSplitButton';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { disposeOverlays } from '../../../test/Overlays';

const ITEMS: ArenaMenuItem[] = [{ label: 'Deploy to staging' }, { divider: true }, { label: 'Roll back', destructive: true }];

@Component({
  selector: 'split-button-overlay-host',
  standalone: true,
  imports: [ArenaSplitButton],
  template: `
    @if (align(); as edge) {
      <arena-split-button label="Deployment" menuLabel="More deploy options" [items]="items" [align]="edge"
                          [loading]="loading()" [disabled]="disabled()" (select)="chosen.push($event)">Deploy</arena-split-button>
    } @else {
      <arena-split-button label="Deployment" menuLabel="More deploy options" [items]="items"
                          [loading]="loading()" [disabled]="disabled()" (select)="chosen.push($event)">Deploy</arena-split-button>
    }
  `,
})
class Host {
  readonly items = ITEMS;
  readonly align = signal<ArenaMenuAlign | undefined>(undefined);
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly chosen: ArenaMenuItem[] = [];
}

function render(patch: { align?: ArenaMenuAlign; loading?: boolean; disabled?: boolean } = {}) {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  if (patch.align !== undefined) host.align.set(patch.align);
  if (patch.loading !== undefined) host.loading.set(patch.loading);
  if (patch.disabled !== undefined) host.disabled.set(patch.disabled);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const primary = root.querySelector<HTMLButtonElement>('[data-arena-part="split-button.primary"]')!;
  const caret = root.querySelector<HTMLButtonElement>('[data-arena-part="split-button.caret"]')!;
  const open = () => { caret.click(); fixture.detectChanges(); };
  return { fixture, root, primary, caret, open, host };
}

function panel(): HTMLElement | null {
  return document.body.querySelector('.cdk-overlay-container [role="menu"]');
}

test('the caret opens the menu in the overlay container, outside the split', () => {
  const { fixture, root, caret, open } = render();
  try {
    open();
    const menu = panel();
    assert.ok(menu, 'activating the caret did not open the menu');
    assert.equal(caret.getAttribute('aria-expanded'), 'true');
    assert.equal(root.contains(menu), false, 'the panel sits inside the split, where an overflow: hidden ancestor clips it');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('an entry reports the whole item and closes the menu', () => {
  const { fixture, open, host } = render();
  try {
    open();
    const rows = panel()!.querySelectorAll<HTMLElement>('[role="menuitem"]');
    rows[1]!.click();
    fixture.detectChanges();
    assert.equal(host.chosen.length, 1);
    assert.equal(host.chosen[0], ITEMS[2], 'select did not carry the item the caller passed in');
    assertNoNode(panel(), 'activating an entry left the menu open');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('the tab stops are the primary half, then the caret', () => {
  const { fixture, root, primary, caret } = render();
  try {
    const stops = [...root.querySelectorAll<HTMLElement>('button, [tabindex]')].filter((one) => one.tabIndex >= 0);
    assert.deepEqual(stops, [primary, caret]);
  } finally { fixture.destroy(); }
});

test('Escape closes the menu and returns focus to the caret', () => {
  const { fixture, caret, open } = render();
  try {
    open();
    const first = panel()!.querySelector<HTMLElement>('[role="menuitem"]')!;
    assertSameNode(document.activeElement, first, 'opening did not move focus to the first entry');
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    assertNoNode(panel(), 'Escape did not close the menu');
    assertSameNode(document.activeElement, caret, 'Escape closed the menu and dropped focus');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('the caret opens the menu while the primary action is loading', () => {
  const { fixture, caret, open } = render({ loading: true });
  try {
    open();
    assert.ok(panel(), 'loading blocked the caret as well');
    assert.equal(caret.getAttribute('aria-expanded'), 'true');
  } finally { fixture.destroy(); disposeOverlays(); }
});

test('disabled blocks the caret', () => {
  const { fixture, caret, open } = render({ disabled: true });
  try {
    assert.equal(caret.disabled, true);
    open();
    assertNoNode(panel(), 'a disabled split opened its menu');
  } finally { fixture.destroy(); disposeOverlays(); }
});

type Box = { left: number; top: number; width: number; height: number };

function box(left: number, top: number, width: number, height: number): Box {
  return { left, top, width, height };
}

const SPLIT = box(100, 50, 300, 40);
const CARET = box(340, 60, 40, 40);
const PANEL = box(0, 0, 120, 80);

function boxOf(element: Element): Box {
  const part = element.getAttribute('data-arena-part');
  if (part === 'split-button') return SPLIT;
  if (part === 'menu' || part === 'split-button.caret') return CARET;
  if (part === 'menu.panel' || element.classList.contains('cdk-overlay-pane')) return PANEL;
  return box(0, 0, 0, 0);
}

function placed(align?: ArenaMenuAlign): { watched: Element[]; edge: string } {
  const watched: Element[] = [];
  const observer = globalThis.ResizeObserver;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(element: Element): void { watched.push(element); }
    disconnect(): void {}
  };
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function stubbed(this: Element) {
    const { left, top, width, height } = boxOf(this);
    return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() { return this; } } as DOMRect;
  };
  const page = document.documentElement;
  Object.defineProperty(page, 'clientWidth', { configurable: true, get: () => 1024 });
  Object.defineProperty(page, 'clientHeight', { configurable: true, get: () => 768 });
  const { fixture, open } = render(align ? { align } : {});
  try {
    open();
    const bounding = panel()!.closest<HTMLElement>('.cdk-overlay-connected-position-bounding-box')!;
    const { left, right, top } = bounding.style;
    return { watched: watched.filter((element) => !element.classList.contains('cdk-overlay-pane')), edge: `${left} ${right} ${top}` };
  } finally {
    Element.prototype.getBoundingClientRect = rect;
    delete (page as { clientWidth?: number }).clientWidth;
    delete (page as { clientHeight?: number }).clientHeight;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = observer;
    fixture.destroy();
    disposeOverlays();
  }
}

test('the panel is placed against the whole split, never the caret', () => {
  const { watched } = placed();
  assert.equal(watched.length, 1, 'the overlay watched some count of elements other than its one anchor');
  assert.equal(watched[0]?.getAttribute('data-arena-part'), 'split-button', 'the panel was connected to some element other than the split');
});

test('align start lines the panel up with the start edge of the whole split', () => {
  assert.equal(placed('start').edge, '100px auto 90px', 'the panel was measured from the caret, not from the split');
});

test('align end lines the panel up with the end edge of the whole split', () => {
  assert.equal(placed('end').edge, 'auto 624px 90px', 'the panel was measured from the caret, not from the split');
});

test('align defaults to the end edge', () => {
  assert.equal(placed().edge, placed('end').edge);
});
