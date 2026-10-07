import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaDialog } from './ArenaDialog.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import manifest from './ArenaDialog.manifest.generated.ts';
import classes from './ArenaDialog.classes.generated.ts';

afterEach(() => cleanup());

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

test('below its breakpoint the panel takes the fill variant with its full-width group, and above it does not', () => {
  for (const [width, filled] of [[400, true], [900, false]] as const) {
    narrowWidths(width, () => {
      mount(<ArenaDialog open title="Edit" fillBelow="md" footer={<button>Save</button>}>Body</ArenaDialog>);
      const panel = document.querySelector('[role="dialog"]') as HTMLElement;
      assert.equal(panel.hasAttribute('data-arena-fill'), filled, `width ${width}`);
      assert.equal(panel.hasAttribute('style'), false, `width ${width}`);
      cleanup();
    });
  }
});

test('the fill group of the panel carries w-full', () => {
  assert.ok(manifest.variants.fill.true.panel.split(' ').includes('w-full'));
});

test('with no fillBelow the dialog never fills, however narrow', () => {
  narrowWidths(300, () => {
    mount(<ArenaDialog open title="Edit">Body</ArenaDialog>);
    const panel = document.querySelector('[role="dialog"]') as HTMLElement;
    assert.equal(panel.hasAttribute('data-arena-fill'), false);
  });
});

test('focus moves into the panel on open and returns to the opener on close, in both shapes', () => {
  for (const width of [400, 900]) {
    narrowWidths(width, () => {
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();
      let setOpen: (open: boolean) => void = () => {};
      function Host() {
        const [open, set] = React.useState(true);
        setOpen = set;
        return <ArenaDialog open={open} title="Edit" fillBelow="md">Body <button>Inside</button></ArenaDialog>;
      }
      mount(<Host />);
      const panel = document.querySelector('[role="dialog"]') as HTMLElement;
      assert.ok(panel.contains(document.activeElement), `width ${width}: focus is inside the panel`);
      act(() => setOpen(false));
      assert.equal(document.activeElement, opener, `width ${width}: focus returned to the opener`);
      cleanup();
      opener.remove();
    });
  }
});

test('a filling dialog with a property that is not a width does not warn, because filling ignores the property', () => {
  forgetArenaWarnings();
  const said: string[] = [];
  const saved = globalThis.console.warn;
  globalThis.console.warn = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  const sheet = document.head.appendChild(document.createElement('style'));
  sheet.textContent = `[data-arena-part="${classes.parts.panel}"] { --arena-dialog-width: md; }`;
  try {
    narrowWidths(400, () => {
      mount(<ArenaDialog open title="Edit" fillBelow="md">Body</ArenaDialog>);
      assert.equal((document.querySelector('[role="dialog"]') as HTMLElement).hasAttribute('data-arena-fill'), true);
    });
    assert.deepEqual(said, []);
  } finally {
    sheet.remove(); globalThis.console.warn = saved; forgetArenaWarnings();
  }
});
