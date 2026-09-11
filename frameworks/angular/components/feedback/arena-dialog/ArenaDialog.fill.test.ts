import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaDialog } from './ArenaDialog';
import manifest from './ArenaDialog.classes.generated';

const FILL = manifest.variants.fill.true.panel;
const BP_MD = '768px';

function stubResize(width: number): () => void {
  const globals = globalThis as { ResizeObserver?: unknown };
  const saved = globals.ResizeObserver;
  globals.ResizeObserver = class {
    private readonly callback: (entries: Array<{ target: Element; contentRect: { width: number } }>) => void;

    constructor(callback: (entries: Array<{ target: Element; contentRect: { width: number } }>) => void) {
      this.callback = callback;
    }

    observe(target: Element): void {
      this.callback([{ target, contentRect: { width } }]);
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
  fixture.componentRef.setInput('width', '62%');
  if (fillBelow) fixture.componentRef.setInput('fillBelow', fillBelow);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const panel = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]') as HTMLElement;
  return { fixture, panel, restore };
}

test('below its breakpoint the panel takes the fill variant and drops its width, and above it keeps both', async () => {
  for (const [width, filled] of [[400, true], [900, false]] as const) {
    const { fixture, panel, restore } = await render(width, 'md');
    try {
      assert.equal(panel.className.includes(FILL), filled, `width ${width}`);
      assert.equal(panel.style.width, filled ? '' : '62%', `width ${width}`);
    } finally { fixture.destroy(); restore(); }
  }
});

test('with no fillBelow the dialog never fills, however narrow', async () => {
  const { fixture, panel, restore } = await render(300);
  try {
    assert.equal(panel.className.includes(FILL), false);
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
      assert.equal(document.activeElement, opener, `width ${width}: focus returned to the opener`);
    } finally { fixture.destroy(); restore(); opener.remove(); }
  }
});
