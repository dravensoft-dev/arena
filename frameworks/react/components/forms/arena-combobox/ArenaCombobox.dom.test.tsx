/* What the field does under a keyboard and a pointer, read from the DOM after each event: typing opens
 * and narrows the list and reports the text, the cursor moves and stops, Enter chooses, Escape and
 * leaving restore, an emptied field clears an optional value and restores a required one, a
 * composition is never filtered half-typed, and a remote list is drawn as given. Every case runs the
 * controlled shape a consumer writes, a host holding value. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaCombobox, type ArenaComboboxProps } from './ArenaCombobox.tsx';

afterEach(cleanup);

const REGIONS = [
  { value: 'eu-west', label: 'Europe West' },
  { value: 'eu-north', label: 'Europe North' },
  { value: 'us-east', label: 'US East' },
];

type Log = { changes: string[]; searches: string[] };

function Host({ log, initial = 'eu-west', ...rest }: { log: Log; initial?: string } & Partial<ArenaComboboxProps>) {
  const [value, setValue] = useState(initial);
  return (
    <form>
      <ArenaCombobox label="Region" name="region" options={REGIONS} value={value}
        onChange={(next) => { log.changes.push(next); setValue(next); }}
        onSearch={(text) => log.searches.push(text)} {...rest} />
    </form>
  );
}

function render(props: Partial<ArenaComboboxProps> & { initial?: string } = {}) {
  const log: Log = { changes: [], searches: [] };
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

const rows = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((row) => row.textContent);
const activeRow = (input: HTMLElement) => document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent;

test('typing opens the list, keeps the rows whose label holds the text, and reports the text', () => {
  const { input, log } = render();
  type(input, 'europe');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.deepEqual(rows(), ['Europe West', 'Europe North']);
  assert.equal(activeRow(input), 'Europe West', 'the first match is the cursor row while the text is not empty');
  assert.deepEqual(log.searches, ['europe']);
  assert.deepEqual(log.changes, [], 'typing chose nothing');
});

test('ArrowDown opens a closed field on the chosen row with every option shown, and the arrows stop at both ends', () => {
  const { input } = render({ initial: 'eu-north' });
  key(input, 'ArrowDown');
  assert.deepEqual(rows(), ['Europe West', 'Europe North', 'US East'], 'a freshly opened list filters nothing');
  assert.equal(activeRow(input), 'Europe North');
  key(input, 'ArrowDown');
  key(input, 'ArrowDown');
  assert.equal(activeRow(input), 'US East');
  key(input, 'ArrowUp');
  key(input, 'ArrowUp');
  key(input, 'ArrowUp');
  assert.equal(activeRow(input), 'Europe West');
});

test('Enter chooses the cursor row, closes the list and shows its label; the value travels, not the label', () => {
  const { root, input, log } = render();
  type(input, 'us');
  const enter = key(input, 'Enter');
  assert.equal(enter.defaultPrevented, true);
  assert.deepEqual(log.changes, ['us-east']);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.value, 'US East');
  assert.equal(root.querySelector<HTMLInputElement>('input[type="hidden"]')!.value, 'us-east');
});

test('Enter with no cursor row does nothing, and choosing the chosen option again reports nothing', () => {
  const { input, log } = render();
  type(input, 'mars');
  assert.equal(input.hasAttribute('aria-activedescendant'), false);
  key(input, 'Enter');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  type(input, 'west');
  key(input, 'Enter');
  assert.deepEqual(log.changes, [], 'the chosen option was chosen again and reported as a change');
});

test('Escape closes the list and puts the chosen label back, and a second Escape does nothing', () => {
  const { input, log } = render();
  type(input, 'nor');
  key(input, 'Escape');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.value, 'Europe West');
  const again = key(input, 'Escape');
  assert.equal(again.defaultPrevented, false, 'an Escape with nothing open was claimed');
  assert.deepEqual(log.changes, []);
});

test('leaving the field closes the list without choosing and puts the label back', () => {
  const { input, log } = render();
  type(input, 'nor');
  act(() => { input.blur(); });
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.value, 'Europe West');
  assert.deepEqual(log.changes, []);
});

test('an emptied field committed clears an optional value with the empty string', () => {
  const { input, log } = render();
  type(input, '');
  key(input, 'Enter');
  assert.deepEqual(log.changes, ['']);
  assert.equal(input.value, '');
});

test('text typed and then deleted is an emptied field: an optional control clears, a required one restores', () => {
  const optional = render();
  type(optional.input, 'us');
  type(optional.input, '');
  key(optional.input, 'Enter');
  assert.deepEqual(optional.log.changes, ['']);
  cleanup();
  const required = render({ required: true });
  type(required.input, 'us');
  type(required.input, '');
  key(required.input, 'Enter');
  assert.deepEqual(required.log.changes, []);
  assert.equal(required.input.value, 'Europe West');
});

test('an emptied field on a required control puts the label back and reports nothing', () => {
  const { input, log } = render({ required: true });
  type(input, '');
  act(() => { input.blur(); });
  assert.deepEqual(log.changes, []);
  assert.equal(input.value, 'Europe West');
});

test('a press on a row chooses it and leaves focus in the field', () => {
  const { input, log } = render();
  key(input, 'ArrowDown');
  const row = [...document.querySelectorAll<HTMLElement>('[role="option"]')][2]!;
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  act(() => { row.dispatchEvent(down); });
  assert.equal(down.defaultPrevented, true, 'a press on a row would move focus out of the field');
  act(() => { row.click(); });
  assert.deepEqual(log.changes, ['us-east']);
  assert.equal(document.activeElement, input);
});

test('a press outside closes the list, and the field then names no list and no row', () => {
  const { input } = render();
  key(input, 'ArrowDown');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.ok(input.getAttribute('aria-controls'));
  assert.ok(input.getAttribute('aria-activedescendant'));
  act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.hasAttribute('aria-controls'), false);
  assert.equal(input.hasAttribute('aria-activedescendant'), false);
});

test('nothing is filtered or committed while a composition is open', () => {
  const { input, log } = render();
  act(() => { input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); });
  type(input, 'eu');
  assert.deepEqual(log.searches, [], 'a half-composed text was reported');
  key(input, 'Enter', { isComposing: true });
  assert.deepEqual(log.changes, []);
  act(() => { input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); });
  assert.deepEqual(log.searches, ['eu']);
  assert.deepEqual(rows(), ['Europe West', 'Europe North']);
});

test('each Enter guard holds alone: the open composition, isComposing and keyCode 229', () => {
  const { input, log } = render();
  type(input, 'us');
  assert.equal(activeRow(input), 'US East');
  act(() => { input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); });
  key(input, 'Enter');
  assert.deepEqual(log.changes, [], 'an open composition did not hold the Enter alone');
  act(() => { input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); });
  key(input, 'Enter', { isComposing: true });
  assert.deepEqual(log.changes, [], 'isComposing did not hold the Enter alone');
  key(input, 'Enter', { keyCode: 229 });
  assert.deepEqual(log.changes, [], 'the Safari Enter after compositionend chose the cursor row');
  key(input, 'Enter');
  assert.deepEqual(log.changes, ['us-east']);
});

test('Enter on an open list with no cursor row is claimed, so the surrounding form does not submit', () => {
  const log: Log = { changes: [], searches: [] };
  const root = mount(<Host log={log} />);
  const form = root.querySelector('form')!;
  let submitted = 0;
  form.addEventListener('submit', (event) => { submitted += 1; event.preventDefault(); });
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  act(() => { input.focus(); });
  type(input, 'zz');
  const enter = key(input, 'Enter');
  assert.equal(enter.defaultPrevented, true, 'the Enter would run implicit submission with the typed text');
  assert.equal(submitted, 0);
  assert.equal(input.getAttribute('aria-expanded'), 'true');
});

test('a press on the field outside the input opens the list and keeps the focus in the input', () => {
  const { root, input } = render({ error: 'Pick one' });
  for (const part of ['combobox.caret', 'combobox.status-icon']) {
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
});

test('a dismissal that does not blur the input puts the label back and closes the list', () => {
  const { input, log } = render();
  type(input, 'nor');
  act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.value, 'Europe West', 'the draft outlived the dismissal');
  assert.deepEqual(log.changes, []);
  assert.deepEqual(log.searches, ['nor', ''], 'the query it reported was not reset');
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
  act(() => { input.blur(); });
  assert.deepEqual(log.searches, ['us', '', 'eu', '']);
});

function Remote({ log }: { log: Log }) {
  const [value, setValue] = useState('eu-west');
  const [shown, setShown] = useState<{ value: string; label: string }[]>(REGIONS);
  return (
    <form>
      <ArenaCombobox label="Region" name="region" filter="none" options={shown} value={value}
        onChange={(next) => { log.changes.push(next); setValue(next); }}
        onSearch={(text) => { log.searches.push(text); setShown(text === '' ? REGIONS : [{ value: 'fr', label: 'France' }]); }} />
      <button type="button" onClick={() => setShown([])}>drop</button>
      <button type="button" onClick={() => setValue('mars')}>mars</button>
    </form>
  );
}

test('remote mode keeps the label of the chosen value after options stops holding it', () => {
  const log: Log = { changes: [], searches: [] };
  const root = mount(<Remote log={log} />);
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const hidden = () => root.querySelector<HTMLInputElement>('input[type="hidden"]')!;
  act(() => { input.focus(); });
  assert.equal(input.value, 'Europe West');
  type(input, 'fr');
  assert.deepEqual(rows(), ['France']);
  key(input, 'Escape');
  assert.equal(input.value, 'Europe West', 'the field forgot the label when options left the value out');
  assert.equal(hidden().value, 'eu-west');
  type(input, 'fr');
  key(input, 'ArrowDown');
  key(input, 'Enter');
  assert.deepEqual(log.changes, ['fr']);
  act(() => { root.querySelectorAll('button')[0]!.click(); });
  assert.equal(input.value, 'France', 'a chosen row lost its label once options went empty');
});

test('the hidden input posts the empty string when neither options nor a remembered label holds the value', () => {
  const log: Log = { changes: [], searches: [] };
  const root = mount(<Remote log={log} />);
  act(() => { root.querySelectorAll('button')[1]!.click(); });
  assert.equal(root.querySelector<HTMLInputElement>('[role="combobox"]')!.value, '');
  assert.equal(root.querySelector<HTMLInputElement>('input[type="hidden"]')!.value, '');
});

test('the count of rows is announced politely after the text changes', () => {
  const { root, input } = render();
  const status = root.querySelector('[role="status"]')!;
  assert.equal(status.textContent, '');
  type(input, 'europe');
  assert.equal(status.textContent, 'Options available: 2.');
});

test('a list matching nothing says so with the typed text', () => {
  const { input } = render();
  type(input, 'mars');
  assert.equal(document.querySelector('[data-arena-part="combobox.empty"]')?.textContent, 'No results for "mars".');
});

test('loading marks the list busy and draws the status line in place of the empty one', () => {
  const { input } = render({ loading: true, options: [] });
  type(input, 'eu');
  assert.equal(document.querySelector('[role="listbox"]')?.getAttribute('aria-busy'), 'true');
  assert.equal(document.querySelector('[data-arena-part="combobox.status"]')?.textContent, 'Loading results…');
  assert.equal(document.querySelector('[data-arena-part="combobox.empty"]'), null);
  assert.equal(document.querySelector('[role="status"]')?.textContent, '', 'a count was announced before the rows arrived');
});

test('filter none draws the options as given, whatever was typed', () => {
  const { input, log } = render({ filter: 'none' });
  type(input, 'zz');
  assert.deepEqual(rows(), ['Europe West', 'Europe North', 'US East']);
  assert.deepEqual(log.searches, ['zz']);
});

test('the chosen row carries the check and aria-selected, and the cursor row is told apart from it', () => {
  const { input } = render();
  key(input, 'ArrowDown');
  key(input, 'ArrowDown');
  const all = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  assert.equal(all[0]!.getAttribute('aria-selected'), 'true');
  assert.ok(all[0]!.querySelector('[data-arena-part="combobox.option-mark"]'));
  assert.equal(all[1]!.getAttribute('aria-selected'), 'false');
  assert.equal(all[1]!.getAttribute('data-arena-active'), '', 'the cursor row carries the active mark');
  assert.equal(all[0]!.hasAttribute('data-arena-active'), false);
  for (const row of all) assert.equal(row.getAttribute('tabindex'), '-1');
});

test('a disabled field opens nothing', () => {
  const { input } = render({ disabled: true });
  assert.equal(input.disabled, true);
  key(input, 'ArrowDown');
  act(() => { input.click(); });
  assert.equal(input.getAttribute('aria-expanded'), 'false');
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

test('a press on the loading status row keeps the focus in the field and the list open', () => {
  const { input } = render({ loading: true });
  key(input, 'ArrowDown');
  const status = document.querySelector<HTMLElement>('[data-arena-part="combobox.status"]')!;
  assert.ok(status, 'a loading list draws the status row');
  const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  act(() => { status.dispatchEvent(press); });
  assert.equal(press.defaultPrevented, true);
  assert.equal(document.activeElement, input);
  assert.equal(input.getAttribute('aria-expanded'), 'true');
});

test('a value changed from outside while the list is closed is what the field reads', () => {
  function Outside() {
    const [value, setValue] = useState('eu-west');
    return (
      <>
        <button type="button" onClick={() => setValue('us-east')}>set</button>
        <ArenaCombobox label="Region" options={REGIONS} value={value} onChange={setValue} />
      </>
    );
  }
  const root = mount(<Outside />);
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  assert.equal(input.value, 'Europe West');
  act(() => { root.querySelector('button')!.click(); });
  assert.equal(input.value, 'US East');
});

test('options that repeat a value draw every row and key without a warning', () => {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
  try {
    const { input } = render({ options: [...REGIONS, REGIONS[0]!] });
    key(input, 'ArrowDown');
    assert.deepEqual(rows(), ['Europe West', 'Europe North', 'US East', 'Europe West']);
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, []);
});
