/* What the list does for a set, read from the DOM after each event: Enter toggles the cursor row and closes
 * the list, a press toggles a row and keeps it open, the text clears after a toggle, the set keeps the
 * order chosen, the cap blocks an addition and says so, the clear control empties the set, and a
 * composition is never filtered half-typed. Every case runs a host holding value. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import type { ArenaValueSet } from '../../../Api.generated';
import { ArenaMultiSelect, type ArenaMultiSelectProps } from './ArenaMultiSelect.tsx';

afterEach(cleanup);

const REGIONS = [
  { value: 'eu-west', label: 'Europe West' },
  { value: 'eu-north', label: 'Europe North' },
  { value: 'us-east', label: 'US East' },
];

type Log = { sets: (readonly string[])[]; searches: string[] };

function Host({ log, initial = [], ...rest }: { log: Log; initial?: string[] } & Partial<ArenaMultiSelectProps>) {
  const [value, setValue] = useState<readonly string[]>(initial);
  return (
    <ArenaMultiSelect label="Regions" name="regions" options={REGIONS} value={value}
      onChange={(set: ArenaValueSet) => { log.sets.push(set.values); setValue(set.values); }}
      onSearch={(text) => log.searches.push(text)} {...rest} />
  );
}

function render(props: Partial<ArenaMultiSelectProps> & { initial?: string[] } = {}) {
  const log: Log = { sets: [], searches: [] };
  const root = mount(<Host log={log} {...props} />);
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  act(() => { input.focus(); });
  return { root, input, log };
}

function type(input: HTMLInputElement, text: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function key(target: Element, name: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
  act(() => { target.dispatchEvent(event); });
  return event;
}

const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const activeRow = (input: HTMLElement) => document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent;

test('Enter toggles the cursor row, clears the text and closes the list; the cursor opens again on the chosen row', () => {
  const { input, log } = render();
  type(input, 'north');
  key(input, 'Enter');
  assert.deepEqual(log.sets, [['eu-north']]);
  assert.equal(input.getAttribute('aria-expanded'), 'false', 'the list stayed open after Enter');
  assert.equal(input.value, '');
  assert.deepEqual(log.searches, ['north', '']);
  key(input, 'ArrowDown');
  assert.equal(options().length, REGIONS.length, 'the cleared text still filtered the list');
  assert.equal(activeRow(input), 'Europe North');
  key(input, 'Enter');
  assert.deepEqual(log.sets[1], [], 'choosing a chosen row again did not remove it');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
});

test('the set keeps the order chosen, whatever the order of the options', () => {
  const { input, log } = render();
  key(input, 'ArrowDown');
  key(input, 'ArrowDown');
  key(input, 'ArrowDown');
  key(input, 'Enter');
  key(input, 'ArrowDown');
  key(input, 'ArrowUp');
  key(input, 'ArrowUp');
  key(input, 'Enter');
  assert.deepEqual(log.sets.at(-1), ['us-east', 'eu-west']);
});

test('a chosen row carries the check and aria-selected, and a press toggles it without moving focus', () => {
  const { input, log } = render({ initial: ['eu-west'] });
  key(input, 'ArrowDown');
  const [first, second] = options();
  assert.equal(first!.getAttribute('aria-selected'), 'true');
  assert.ok(first!.querySelector('[data-arena-part="combobox.option-mark"]'));
  assert.equal(second!.getAttribute('aria-selected'), 'false');
  act(() => { second!.click(); });
  assert.deepEqual(log.sets, [['eu-west', 'eu-north']]);
  assert.equal(document.activeElement, input);
  assert.equal(input.getAttribute('aria-expanded'), 'true', 'a press on a row closed the list');
});

test('at the cap the unchosen rows are unavailable, choosing one is blocked and announced, and removing still works', () => {
  const { root, input, log } = render({ initial: ['eu-west', 'us-east'], max: 2 });
  key(input, 'ArrowDown');
  const [first, second] = options();
  assert.equal(second!.getAttribute('aria-disabled'), 'true');
  assert.equal(first!.hasAttribute('aria-disabled'), false, 'a chosen row stays available, so it can be removed');
  key(input, 'ArrowDown');
  key(input, 'Enter');
  assert.deepEqual(log.sets, []);
  assert.equal(root.querySelector('[role="status"]')?.textContent, 'Maximum of 2 selected.');
  assert.equal(input.getAttribute('aria-expanded'), 'true', 'a blocked Enter closed the list');
  key(input, 'ArrowUp');
  key(input, 'Enter');
  assert.deepEqual(log.sets, [['us-east']]);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
});

test('the clear control empties the set and leaves focus in the field', () => {
  const { root, input, log } = render({ initial: ['eu-west', 'us-east'], clearable: true });
  const clear = root.querySelector<HTMLButtonElement>('[data-arena-part="combobox.clear"]')!;
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  act(() => { clear.dispatchEvent(down); });
  assert.equal(down.defaultPrevented, true);
  act(() => { clear.click(); });
  assert.deepEqual(log.sets, [[]]);
  assert.equal(document.activeElement, input);
  assert.equal(root.querySelector('[data-arena-part="combobox.clear"]'), null);
});

test('typing narrows the list, reports the text and announces the count; Escape closes and clears the text', () => {
  const { root, input, log } = render();
  type(input, 'europe');
  assert.equal(options().length, 2);
  assert.deepEqual(log.searches, ['europe']);
  assert.equal(root.querySelector('[role="status"]')?.textContent, 'Options available: 2.');
  key(input, 'Escape');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.value, '');
  assert.deepEqual(log.sets, []);
});

test('a list matching nothing says so, and loading draws the status line instead', () => {
  const { input } = render();
  type(input, 'mars');
  assert.equal(document.querySelector('[data-arena-part="combobox.empty"]')?.textContent, 'No results for "mars".');
  cleanup();
  const busy = render({ loading: true, options: [] });
  type(busy.input, 'eu');
  assert.equal(document.querySelector('[role="listbox"]')?.getAttribute('aria-busy'), 'true');
  assert.equal(document.querySelector('[data-arena-part="combobox.status"]')?.textContent, 'Loading results…');
});

test('nothing is filtered or toggled while a composition is open', () => {
  const { input, log } = render();
  act(() => { input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); });
  type(input, 'eu');
  key(input, 'Enter', { isComposing: true });
  assert.deepEqual(log.searches, []);
  assert.deepEqual(log.sets, []);
  act(() => { input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); });
  assert.deepEqual(log.searches, ['eu']);
});

test('a disabled control opens nothing and its chips remove nothing', () => {
  const { root, input, log } = render({ initial: ['eu-west'], disabled: true });
  key(input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  act(() => { root.querySelector<HTMLButtonElement>('[data-arena-part="tag.close"]')!.click(); });
  assert.deepEqual(log.sets, []);
});

test('a press on the panel itself or on its empty row keeps the focus in the field and the list open', () => {
  const { input } = render();
  type(input, 'zz-nothing');
  const panel = document.querySelector<HTMLElement>('[data-arena-part="combobox.panel"]')!;
  const empty = document.querySelector<HTMLElement>('[data-arena-part="combobox.empty"]')!;
  assert.ok(empty, 'no row matches, so the empty row is drawn');
  for (const target of [panel, empty]) {
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    act(() => { target.dispatchEvent(press); });
    assert.equal(press.defaultPrevented, true);
    assert.equal(document.activeElement, input);
    assert.equal(input.getAttribute('aria-expanded'), 'true');
  }
});

const status = (root: Element) => root.querySelector('[role="status"]')?.textContent ?? '';

test('a blocked choice said twice reads differently, so the live region speaks the second attempt', () => {
  const { root, input } = render({ initial: ['eu-west', 'us-east'], max: 2 });
  key(input, 'ArrowDown');
  key(input, 'ArrowDown');
  key(input, 'Enter');
  const first = status(root);
  key(input, 'Enter');
  assert.notEqual(status(root), first, 'the second blocked Enter set the same text');
  assert.equal(status(root).trim(), first);
});

test('the cap notice goes when a chip is removed or the set is cleared', () => {
  const { root, input } = render({ initial: ['eu-west', 'us-east'], max: 2, clearable: true });
  key(input, 'ArrowDown');
  key(input, 'ArrowDown');
  key(input, 'Enter');
  assert.equal(status(root), 'Maximum of 2 selected.');
  act(() => { root.querySelector<HTMLButtonElement>('[data-arena-part="tag.close"]')!.click(); });
  assert.equal(status(root), '', 'a removal left the notice');
  cleanup();
  const again = render({ initial: ['eu-west', 'us-east'], max: 2, clearable: true });
  key(again.input, 'ArrowDown');
  key(again.input, 'ArrowDown');
  key(again.input, 'Enter');
  act(() => { again.root.querySelector<HTMLButtonElement>('[data-arena-part="combobox.clear"]')!.click(); });
  assert.equal(status(again.root), '', 'clearing left the notice');
});

test('each Enter guard holds alone: the open composition, isComposing and keyCode 229', () => {
  const { input, log } = render();
  type(input, 'us');
  assert.equal(activeRow(input), 'US East');
  act(() => { input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); });
  key(input, 'Enter');
  assert.deepEqual(log.sets, [], 'an open composition did not hold the Enter alone');
  act(() => { input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); });
  key(input, 'Enter', { isComposing: true });
  assert.deepEqual(log.sets, [], 'isComposing did not hold the Enter alone');
  key(input, 'Enter', { keyCode: 229 });
  assert.deepEqual(log.sets, [], 'the Safari Enter after compositionend toggled the cursor row');
  key(input, 'Enter');
  assert.deepEqual(log.sets, [['us-east']]);
});

test('Enter on an open list with no cursor row is claimed, so the surrounding form does not submit', () => {
  const log: Log = { sets: [], searches: [] };
  const root = mount(<form><Host log={log} /></form>);
  let submitted = 0;
  root.querySelector('form')!.addEventListener('submit', (event) => { submitted += 1; event.preventDefault(); });
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  act(() => { input.focus(); });
  type(input, 'zz');
  const enter = key(input, 'Enter');
  assert.equal(enter.defaultPrevented, true, 'the Enter would run implicit submission');
  assert.equal(submitted, 0);
  assert.equal(input.getAttribute('aria-expanded'), 'true');
});

test('a press on the field outside the input opens the list and keeps the focus there; a chip button keeps its own press', () => {
  const { root, input } = render({ initial: ['eu-west'], error: 'Pick one' });
  for (const part of ['combobox.caret', 'combobox.status-icon', 'combobox.chips']) {
    const target = root.querySelector<HTMLElement>(`[data-arena-part="${part}"]`)!;
    assert.ok(target, part);
    act(() => { input.blur(); });
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    act(() => { target.dispatchEvent(press); });
    assert.equal(press.defaultPrevented, true, `${part} let the press move focus away`);
    assert.equal(document.activeElement, input);
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    key(input, 'Escape');
  }
  const remove = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  act(() => { root.querySelector('[data-arena-part="tag.close"]')!.dispatchEvent(remove); });
  assert.equal(remove.defaultPrevented, false, 'the press on a remove button was taken');
});

test('a dismissal that does not blur the input closes the list, clears the text and resets the query', () => {
  const { input, log } = render();
  type(input, 'nor');
  act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.value, '', 'the draft outlived the dismissal');
  assert.deepEqual(log.searches, ['nor', '']);
});

test('search is told the empty text whenever the control empties the query it last reported', () => {
  const { input, log } = render();
  type(input, 'us');
  key(input, 'Enter');
  assert.deepEqual(log.searches, ['us', '']);
  key(input, 'ArrowDown');
  key(input, 'Escape');
  assert.deepEqual(log.searches, ['us', ''], 'an empty query was reported again');
  type(input, 'eu');
  act(() => { options()[0]!.click(); });
  assert.deepEqual(log.searches, ['us', '', 'eu', ''], 'a toggle left the host on the old text');
  type(input, 'eu');
  act(() => { input.blur(); });
  assert.deepEqual(log.searches, ['us', '', 'eu', '', 'eu', '']);
});

const CITIES = [{ value: 'de-be', label: 'Berlin' }, { value: 'pt-li', label: 'Lisbon' }];

function Remote() {
  const [value, setValue] = useState<readonly string[]>(['de-be']);
  const [shown, setShown] = useState(CITIES);
  return (
    <>
      <ArenaMultiSelect label="Cities" filter="none" options={shown} value={value}
        onChange={(set) => setValue(set.values)}
        onSearch={(text) => setShown(text === '' ? CITIES : [{ value: 'fr-pa', label: 'Paris' }])} />
      <button type="button" onClick={() => setShown([])}>drop</button>
    </>
  );
}

const chipTexts = (root: Element) => [...root.querySelectorAll('[data-arena-part="tag.close"]')]
  .map((button) => document.getElementById((button.getAttribute('aria-labelledby') ?? '').split(' ')[1]!)?.textContent?.trim());

test('remote mode keeps a chip\'s label after options stops holding its value', () => {
  const root = mount(<Remote />);
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  act(() => { input.focus(); });
  assert.deepEqual(chipTexts(root), ['Berlin']);
  type(input, 'pa');
  assert.deepEqual(options().map((row) => row.textContent), ['Paris']);
  assert.deepEqual(chipTexts(root), ['Berlin'], 'the chip fell back to its raw value');
  key(input, 'ArrowDown');
  key(input, 'Enter');
  act(() => { root.querySelector('button:not([data-arena-part])')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  assert.deepEqual(chipTexts(root), ['Berlin', 'Paris'], 'a chosen row lost its label once options went empty');
});

test('a value held twice is one chip, one hidden input and one removal', () => {
  const { root, log } = render({ initial: ['eu-west', 'eu-west'] });
  assert.equal(root.querySelectorAll('[data-arena-part="tag.close"]').length, 1);
  assert.equal(root.querySelectorAll('input[type="hidden"]').length, 1);
  act(() => { root.querySelector<HTMLButtonElement>('[data-arena-part="tag.close"]')!.click(); });
  assert.deepEqual(log.sets, [[]]);
});

test('a press with a button other than the main one does not open the list or hold the focus', () => {
  const { root, input } = render();
  const caret = root.querySelector<HTMLElement>('[data-arena-part="combobox.caret"]')!;
  act(() => { input.blur(); });
  for (const button of [1, 2]) {
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button });
    act(() => { caret.dispatchEvent(press); });
    assert.equal(press.defaultPrevented, false, `button ${button} was taken`);
    assert.equal(input.getAttribute('aria-expanded'), 'false');
  }
  const main = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 });
  act(() => { caret.dispatchEvent(main); });
  assert.equal(main.defaultPrevented, true);
  assert.equal(input.getAttribute('aria-expanded'), 'true');
});

test('options that repeat a value draw every row and key without a warning', () => {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
  try {
    const { input } = render({ options: [...REGIONS, REGIONS[0]!] });
    key(input, 'ArrowDown');
    assert.equal(options().length, 4);
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, []);
});
