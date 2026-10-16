/* What a press does, with the clipboard stubbed and every timer captured rather than waited on:
 * the glyph swaps, the region beside the button says one word, one event fires, and the window
 * from the confirmation token reverts both. The name stays the same throughout, a second press
 * restarts the window, and a destroyed button leaves no timer behind. The framework schedules
 * timers of its own with no delay, so a window is the timer set for the confirmation token. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaCopyButton, ARENA_COPY_CONFIRMATION, ARENA_COPY_GLYPHS } from './ArenaCopyButton';
import { dismissConfirmation } from '../../../Tokens.generated';

@Component({
  selector: 'copy-button-behaviour-host',
  standalone: true,
  imports: [ArenaCopyButton],
  template: `<arena-copy-button [text]="text" [label]="label" [disabled]="disabled"
                                (copied)="copied = copied + 1" (copyFailed)="failed = failed + 1" />`,
})
class CopyButtonHost {
  text = 'bun add @dravensoft/arena-angular';
  label: string | undefined = 'Copy the install command';
  disabled = false;
  copied = 0;
  failed = 0;
}

type Timer = { fire: () => void; ms: number; id: number };
let timers: Timer[] = [];
let cleared: number[] = [];
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;

function captureTimers(): void {
  timers = [];
  cleared = [];
  (globalThis as { setTimeout: unknown }).setTimeout = (fire: () => void, ms: number) => {
    const id = timers.length + 1;
    timers.push({ fire, ms, id });
    return id;
  };
  (globalThis as { clearTimeout: unknown }).clearTimeout = (id: number | undefined) => {
    if (id !== undefined) cleared.push(id);
  };
}

const realClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
function clipboard(writeText: ((text: string) => Promise<void>) | null): void {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: writeText ? { writeText } : undefined });
}

afterEach(() => {
  globalThis.setTimeout = realSetTimeout;
  globalThis.clearTimeout = realClearTimeout;
  if (realClipboard) Object.defineProperty(navigator, 'clipboard', realClipboard);
  else delete (navigator as { clipboard?: unknown }).clipboard;
});

const clocks = () => timers.filter((one) => one.ms === ARENA_COPY_CONFIRMATION);

async function settled(): Promise<void> {
  for (let i = 0; i < 3; i += 1) await Promise.resolve();
}

function render(patch: Partial<CopyButtonHost> = {}) {
  const fixture = TestBed.createComponent(CopyButtonHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const button = root.querySelector('button') as HTMLButtonElement;
  const region = root.querySelector('[role="status"]') as HTMLElement;
  const press = async () => {
    button.click();
    await settled();
    fixture.detectChanges();
  };
  return { fixture, button, region, press, glyph: () => button.querySelector('i')?.className };
}

test('the three glyphs are Arena\'s, and the window is the confirmation token', () => {
  assert.deepEqual({ ...ARENA_COPY_GLYPHS }, { rest: 'ph-bold ph-copy', copied: 'ph-bold ph-check', failed: 'ph-bold ph-warning' });
  assert.equal(ARENA_COPY_CONFIRMATION, dismissConfirmation);
});

test('a copy that lands swaps the glyph, says the word once, reports copied and reverts on the clock', async () => {
  captureTimers();
  const written: string[] = [];
  clipboard(async (text) => { written.push(text); });
  const { fixture, button, region, press, glyph } = render();
  try {
    assert.equal(glyph(), 'ph-bold ph-copy');
    await press();
    assert.deepEqual(written, ['bun add @dravensoft/arena-angular']);
    assert.equal(glyph(), 'ph-bold ph-check');
    assert.equal(region.textContent, 'Copied');
    assert.equal(region.childNodes.length, 1, 'the region holds one text run, so a reader hears one word');
    assert.equal(fixture.componentInstance.copied, 1, 'one press is one copied, whatever listens to the button inside');
    assert.equal(fixture.componentInstance.failed, 0);
    assert.equal(button.getAttribute('aria-label'), 'Copy the install command', 'the name changed with the state, so the control announced itself as a different one');
    assert.equal(clocks().length, 1, 'one press starts one window');
    clocks()[0]?.fire();
    fixture.detectChanges();
    assert.equal(glyph(), 'ph-bold ph-copy');
    assert.equal(region.textContent, '', 'the region empties when the glyph reverts');
  } finally {
    fixture.destroy();
  }
});

test('a refused write says the failure, reports copyFailed and never copied', async () => {
  captureTimers();
  clipboard(() => Promise.reject(new Error('denied')));
  const { fixture, region, press, glyph } = render();
  try {
    await press();
    assert.equal(glyph(), 'ph-bold ph-warning');
    assert.equal(region.textContent, 'Could not copy');
    assert.equal(fixture.componentInstance.failed, 1);
    assert.equal(fixture.componentInstance.copied, 0);
    assert.equal(clocks().length, 1, 'one press starts one window');
  } finally {
    fixture.destroy();
  }
});

test('a page with no clipboard reports the failure the same way, and never pretends to copy', async () => {
  captureTimers();
  clipboard(null);
  const { fixture, region, press, glyph } = render();
  try {
    await press();
    assert.equal(glyph(), 'ph-bold ph-warning');
    assert.equal(region.textContent, 'Could not copy');
    assert.equal(fixture.componentInstance.failed, 1);
    assert.equal(fixture.componentInstance.copied, 0);
  } finally {
    fixture.destroy();
  }
});

test('a second press inside the window restarts the clock', async () => {
  captureTimers();
  clipboard(async () => {});
  const { fixture, press } = render();
  try {
    await press();
    await press();
    assert.equal(clocks().length, 2);
    assert.ok(cleared.includes(clocks()[0]!.id), 'the first window was left running beside the second');
    assert.equal(fixture.componentInstance.copied, 2);
  } finally {
    fixture.destroy();
  }
});

test('destroying inside the window leaves no timer, and a write that lands after it starts none', async () => {
  captureTimers();
  clipboard(async () => {});
  const first = render();
  await first.press();
  first.fixture.destroy();
  assert.ok(cleared.includes(clocks()[0]!.id), 'the window outlived the button');

  let land: () => void = () => {};
  clipboard(() => new Promise<void>((resolve) => { land = resolve; }));
  const second = render();
  second.button.click();
  second.fixture.destroy();
  const before = clocks().length;
  land();
  await settled();
  assert.equal(clocks().length, before, 'a copy that landed after destroy started a clock nobody clears');
  assert.equal(second.fixture.componentInstance.copied, 0);
});

test('with no label, or a blank one, the locale names the button, and a blank text disables it', () => {
  for (const label of [undefined, '   ']) {
    const { fixture, button } = render({ label });
    try {
      assert.equal(button.getAttribute('aria-label'), 'Copy');
    } finally {
      fixture.destroy();
    }
  }
  const blank = render({ text: '  ' });
  try {
    assert.equal(blank.button.disabled, true, 'a blank text left a button that copies nothing');
  } finally {
    blank.fixture.destroy();
  }
});

test('a disabled or blank button copies nothing and says nothing', async () => {
  captureTimers();
  const written: string[] = [];
  clipboard(async (text) => { written.push(text); });
  for (const patch of [{ disabled: true }, { text: '   ' }]) {
    const { fixture, region, press } = render(patch);
    try {
      await press();
      assert.deepEqual(written, []);
      assert.equal((region.textContent ?? '').trim(), '');
      assert.equal(fixture.componentInstance.copied + fixture.componentInstance.failed, 0);
    } finally {
      fixture.destroy();
    }
  }
});
