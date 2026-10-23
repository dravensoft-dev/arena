/* The copy button binds button, and its control is the icon button it draws, so the pattern is
 * asserted on that inner element. The live region beside it is a status, which no binding can add
 * to a button, so what it announces is held here by its own cases rather than by check:compliance:
 * the clipboard is stubbed, every timer is captured rather than waited on, and each path asserts
 * the glyph, the one word in the region, the one event and the clock. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { withIcons, domSymbols } from '../../../test/IconsHarness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaCopyButton, ARENA_COPY_CONFIRMATION } from './ArenaCopyButton.tsx';

const BINDING = join(REACT_COMPONENTS, 'forms/arena-copy-button/ArenaCopyButton.behaviour.json');

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
  cleanup();
  globalThis.setTimeout = realSetTimeout;
  globalThis.clearTimeout = realClearTimeout;
  if (realClipboard) Object.defineProperty(navigator, 'clipboard', realClipboard);
  else delete (navigator as { clipboard?: unknown }).clipboard;
});

function render(props: Partial<React.ComponentProps<typeof ArenaCopyButton>> = {}) {
  const heard = { copied: 0, failed: 0 };
  const root = mount(withIcons(
    <ArenaCopyButton text="bun add @dravensoft/arena-react" label="Copy the install command"
      onCopied={() => { heard.copied += 1; }} onCopyFailed={() => { heard.failed += 1; }} {...props} />,
  ));
  const button = root.querySelector('button') as HTMLButtonElement;
  const region = root.querySelector('[role="status"]') as HTMLElement;
  return { root, button, region, heard, glyph: () => domSymbols(button)[0] };
}

async function press(button: HTMLButtonElement): Promise<void> {
  await act(async () => { button.click(); });
}

test('ArenaCopyButton meets the button pattern on the icon button it draws', () => {
  const { root, button } = render();
  assert.equal(button.getAttribute('aria-label'), 'Copy the install command');
  for (const key of ['Enter', ' ']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    act(() => { button.dispatchEvent(event); });
    assert.equal(event.defaultPrevented, false, 'a handler of ours cancelled a key the button activates on');
  }
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: button },
    behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
  });
});

test('a copy that lands swaps the glyph, says the word once, reports copied and reverts on the clock', async () => {
  captureTimers();
  const written: string[] = [];
  clipboard(async (text) => { written.push(text); });
  const { button, region, heard, glyph } = render();
  await press(button);
  assert.deepEqual(written, ['bun add @dravensoft/arena-react']);
  assert.equal(glyph(), 'bold-check');
  assert.equal(region.textContent, 'Copied');
  assert.equal(region.childNodes.length, 1, 'the region holds one text run, so a reader hears one word');
  assert.deepEqual(heard, { copied: 1, failed: 0 });
  assert.equal(button.getAttribute('aria-label'), 'Copy the install command', 'the name changed with the state, so the control announced itself as a different one');
  assert.deepEqual(timers.map((one) => one.ms), [ARENA_COPY_CONFIRMATION]);
  act(() => { timers[0]?.fire(); });
  assert.equal(glyph(), 'bold-copy');
  assert.equal(region.textContent, '', 'the region empties when the glyph reverts');
});

test('a refused write says the failure, reports copyFailed and never copied', async () => {
  captureTimers();
  clipboard(() => Promise.reject(new Error('denied')));
  const { button, region, heard, glyph } = render();
  await press(button);
  assert.equal(glyph(), 'bold-warning');
  assert.equal(region.textContent, 'Could not copy');
  assert.deepEqual(heard, { copied: 0, failed: 1 });
  assert.deepEqual(timers.map((one) => one.ms), [ARENA_COPY_CONFIRMATION]);
});

test('a page with no clipboard reports the failure the same way, and never pretends to copy', async () => {
  captureTimers();
  clipboard(null);
  const { button, region, heard, glyph } = render();
  await press(button);
  assert.equal(glyph(), 'bold-warning');
  assert.equal(region.textContent, 'Could not copy');
  assert.deepEqual(heard, { copied: 0, failed: 1 });
});

test('a second press inside the window restarts the clock', async () => {
  captureTimers();
  clipboard(async () => {});
  const { button, heard } = render();
  await press(button);
  await press(button);
  assert.equal(timers.length, 2);
  assert.ok(cleared.includes(timers[0]!.id), 'the first window was left running beside the second');
  assert.deepEqual(heard, { copied: 2, failed: 0 });
});

test('unmounting inside the window leaves no timer, and a write that lands after it starts none', async () => {
  captureTimers();
  clipboard(async () => {});
  const first = render();
  await press(first.button);
  cleanup();
  assert.ok(cleared.includes(timers[0]!.id), 'the window outlived the button');

  let land: () => void = () => {};
  clipboard(() => new Promise<void>((resolve) => { land = resolve; }));
  const second = render();
  act(() => { second.button.click(); });
  cleanup();
  const before = timers.length;
  await act(async () => { land(); });
  assert.equal(timers.length, before, 'a copy that landed after unmount started a clock nobody clears');
  assert.deepEqual(second.heard, { copied: 0, failed: 0 });
});

test('a disabled or blank button copies nothing and says nothing', async () => {
  captureTimers();
  const written: string[] = [];
  clipboard(async (text) => { written.push(text); });
  for (const props of [{ disabled: true }, { text: '   ' }]) {
    const { button, region, heard } = render(props);
    await press(button);
    assert.deepEqual(written, []);
    assert.equal(region.textContent, '');
    assert.deepEqual(heard, { copied: 0, failed: 0 });
    cleanup();
  }
});
