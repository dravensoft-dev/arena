import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaDialog } from './ArenaDialog';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { assertSameNode } from '../../../test/NodeAssert';

const source = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'feedback/arena-dialog/ArenaDialog.manifest.json'), 'utf8')) as { variants: { fill: { true: { panel: string } } } };

const BP_MD = '768px';

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
  document.documentElement.style.setProperty('--bp-md', BP_MD);
  return () => {
    globals.ResizeObserver = saved;
    document.documentElement.style.removeProperty('--bp-md');
  };
}

async function render(width: number, fillBelow?: 'md') {
  const restore = stubResize(width);
  const fixture = TestBed.createComponent(ArenaDialog);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('title', 'Edit');
  if (fillBelow) fixture.componentRef.setInput('fillBelow', fillBelow);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const panel = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]') as HTMLElement;
  return { fixture, panel, restore };
}

test('below its breakpoint the panel takes the fill group with its full-width class, and above it does not', async () => {
  for (const [width, filled] of [[400, true], [900, false]] as const) {
    const { fixture, panel, restore } = await render(width, 'md');
    try {
      assert.equal(panel.hasAttribute('data-arena-fill'), filled, `width ${width}`);
      assert.equal(panel.hasAttribute('style'), false, `width ${width}`);
    } finally { fixture.destroy(); restore(); }
  }
});

test('the fill group of the panel carries w-full', () => {
  assert.ok(source.variants.fill.true.panel.split(' ').includes('w-full'));
});

test('with no fillBelow the dialog never fills, however narrow', async () => {
  const { fixture, panel, restore } = await render(300);
  try {
    assert.equal(panel.hasAttribute('data-arena-fill'), false);
  } finally { fixture.destroy(); restore(); }
});

test('focus moves into the panel on open and returns to the opener on close, in both shapes', async () => {
  for (const width of [400, 900]) {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { fixture, panel, restore } = await render(width, 'md');
    try {
      assert.ok(panel === document.activeElement || panel.contains(document.activeElement), `width ${width}: focus is inside the panel`);
      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();
      await fixture.whenStable();
      assertSameNode(document.activeElement, opener, `width ${width}: focus returned to the opener`);
    } finally { fixture.destroy(); restore(); opener.remove(); }
  }
});

test('a filling dialog with a property that is not a width does not warn, because filling ignores the property', async () => {
  forgetArenaWarnings();
  const said: string[] = [];
  const saved = globalThis.console.warn;
  globalThis.console.warn = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  const sheet = document.head.appendChild(document.createElement('style'));
  sheet.textContent = '[data-arena-part="dialog.panel"] { --arena-dialog-width: md; }';
  const { fixture, panel, restore } = await render(400, 'md');
  try {
    assert.equal(panel.hasAttribute('data-arena-fill'), true);
    assert.deepEqual(said, []);
  } finally {
    fixture.destroy(); restore(); sheet.remove(); globalThis.console.warn = saved; forgetArenaWarnings();
  }
});
