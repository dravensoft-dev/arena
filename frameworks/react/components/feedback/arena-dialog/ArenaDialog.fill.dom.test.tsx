import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaDialog } from './ArenaDialog.tsx';
import manifest from './ArenaDialog.classes.generated.ts';

afterEach(() => cleanup());

function narrowWidths<T>(width: number, body: () => T): T {
  const saved = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) { this.callback = callback; }
    observe(target: Element) {
      this.callback([{ target, contentRect: { width } }] as unknown as ResizeObserverEntry[], this as unknown as ResizeObserver);
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

const FILL = manifest.variants.fill.true.panel;

test('below its breakpoint the panel takes the fill variant and drops its width, and above it keeps both', () => {
  for (const [width, filled] of [[400, true], [900, false]] as const) {
    narrowWidths(width, () => {
      mount(<ArenaDialog open title="Edit" fillBelow="md" width="62%" footer={<button>Save</button>}>Body</ArenaDialog>);
      const panel = document.querySelector('[role="dialog"]') as HTMLElement;
      assert.equal(panel.className.includes(FILL), filled, `width ${width}`);
      assert.equal(panel.style.width, filled ? '' : '62%', `width ${width}`);
      cleanup();
    });
  }
});

test('with no fillBelow the dialog never fills, however narrow', () => {
  narrowWidths(300, () => {
    mount(<ArenaDialog open title="Edit">Body</ArenaDialog>);
    const panel = document.querySelector('[role="dialog"]') as HTMLElement;
    assert.equal(panel.className.includes(FILL), false);
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
