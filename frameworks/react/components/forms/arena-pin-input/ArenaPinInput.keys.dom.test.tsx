/* How a pin input's cells edit one code under real key, input and paste events: a character fills
 * its cell and moves on, Backspace and Delete close the code up, the arrows walk the cells, a paste
 * spreads across them, a refused character fires nothing, and complete follows change once per
 * fill. Focus leaving the group is a blur; a move between cells is not. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaPinInput, type ArenaPinInputProps } from './ArenaPinInput.tsx';

afterEach(cleanup);

const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;

function render(props: Partial<ArenaPinInputProps> = {}, controlled = true, answers = true) {
  const seen: string[] = [];
  function Host() {
    const [value, write] = useState(props.value ?? '');
    const bound = controlled ? { value } : {};
    return (
      <div>
        <ArenaPinInput label="Verification code" {...props} {...bound}
          onValueChange={(next) => { seen.push(`change ${next}`); if (answers) write(next); }}
          onComplete={(code) => seen.push(`complete ${code}`)} onBlur={(code) => seen.push(`blur ${code}`)} />
        <button type="button">Verify</button>
      </div>
    );
  }
  const root = mount(<Host />);
  const cells = () => [...root.querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
  const active = () => cells().indexOf(root.ownerDocument.activeElement as HTMLInputElement);
  const code = () => cells().map((cell) => cell.value).join('');
  const focus = (index: number) => act(() => { cells()[index]!.focus(); });
  const type = (text: string) => act(() => {
    const cell = cells()[active()]!;
    setValue.call(cell, cell.value + text);
    cell.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const key = (name: string) => act(() => {
    cells()[active()]!.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  });
  const paste = (text: string) => act(() => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
    cells()[active()]!.dispatchEvent(event);
  });
  const stops = () => cells().flatMap((cell, index) => (cell.getAttribute('tabindex') === '0' ? [index] : []));
  const autofill = (text: string) => act(() => {
    const cell = cells()[active()]!;
    setValue.call(cell, text);
    cell.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return { root, cells, active, code, focus, type, key, paste, autofill, seen, stops };
}

test('a typed character fills its cell and moves focus to the next', () => {
  const pin = render();
  pin.focus(0);
  pin.type('4');
  pin.type('8');
  assert.equal(pin.code(), '48');
  assert.equal(pin.active(), 2);
  assert.deepEqual(pin.seen, ['change 4', 'change 48']);
});

test('a character the set refuses changes nothing and fires nothing', () => {
  const pin = render();
  pin.focus(0);
  pin.type('x');
  assert.equal(pin.code(), '');
  assert.equal(pin.active(), 0);
  assert.deepEqual(pin.seen, []);
});

test('Backspace walks back: on an empty cell it empties the one before and steps there, and a filled cell it empties and keeps', () => {
  const pin = render({ value: '482' });
  pin.focus(3);
  pin.key('Backspace');
  assert.deepEqual([pin.code(), pin.active()], ['48', 2]);
  pin.key('Backspace');
  assert.deepEqual([pin.code(), pin.active()], ['4', 1]);
  pin.focus(0);
  pin.key('Backspace');
  assert.deepEqual([pin.code(), pin.active()], ['', 0]);
});

test('Delete empties the cell and stays, and the later characters close up', () => {
  const pin = render({ value: '482913' });
  pin.focus(2);
  pin.key('Delete');
  assert.deepEqual([pin.code(), pin.active()], ['48913', 2]);
});

test('the arrows move between cells without wrapping, and Home and End reach the ends', () => {
  const pin = render({ value: '482' });
  pin.focus(0);
  pin.key('ArrowLeft');
  assert.equal(pin.active(), 0);
  pin.key('ArrowRight');
  assert.equal(pin.active(), 1);
  pin.key('End');
  assert.equal(pin.active(), 5);
  pin.key('ArrowRight');
  assert.equal(pin.active(), 5);
  pin.key('Home');
  assert.equal(pin.active(), 0);
  assert.deepEqual(pin.seen, []);
});

test('right to left, Left moves on and Right moves back, as the cells read', () => {
  const pin = render({ value: '482' });
  pin.root.setAttribute('dir', 'rtl');
  pin.focus(1);
  pin.key('ArrowLeft');
  assert.equal(pin.active(), 2);
  pin.key('ArrowRight');
  assert.equal(pin.active(), 1);
});

test('a six-character paste fills six cells from the first, wherever it lands, then completes', () => {
  const pin = render();
  pin.focus(3);
  pin.paste('48 29-13');
  assert.equal(pin.code(), '482913');
  assert.equal(pin.active(), 5);
  assert.deepEqual(pin.seen, ['change 482913', 'complete 482913']);
});

test('a shorter paste fills from the focused cell, and an autofill that types the whole code spreads too', () => {
  const pin = render({ value: '482913' });
  pin.focus(2);
  pin.paste('07');
  assert.equal(pin.code(), '480713');
  cleanup();
  const filled = render();
  filled.focus(0);
  filled.type('551234');
  assert.equal(filled.code(), '551234');
});

test('complete fires once, after change, each time an edit fills the code anew', () => {
  const pin = render({ value: '48291' });
  pin.focus(5);
  pin.type('3');
  pin.key('Backspace');
  pin.type('9');
  pin.type('7');
  assert.deepEqual(pin.seen, ['change 482913', 'complete 482913', 'change 48291', 'change 482919', 'complete 482919', 'change 482917']);
});

test('with no value bound the cells hold what the person types', () => {
  const pin = render({}, false);
  pin.focus(0);
  pin.type('7');
  pin.type('3');
  assert.equal(pin.code(), '73');
});

test('focus leaving the group is a blur carrying the code, and a move between cells is not', () => {
  const pin = render({ value: '48' });
  const [first, second] = pin.cells();
  pin.focus(0);
  act(() => { first!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: second })); });
  assert.deepEqual(pin.seen, []);
  const away = pin.root.querySelector('button')!;
  act(() => { second!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: away })); });
  assert.deepEqual(pin.seen, ['blur 48']);
});

test('a paste that replaces a full code completes again, and a typed character over a full code does not', () => {
  const pin = render({ value: '482913' });
  pin.focus(5);
  pin.paste('111111');
  pin.autofill('222222');
  pin.paste('7a');
  pin.type('3');
  assert.deepEqual(pin.seen, ['change 111111', 'complete 111111', 'change 222222', 'complete 222222', 'change 222227', 'change 222223']);
});

test('a value the host does not write back keeps the cells as the host has them, and change still fires', () => {
  const pin = render({ value: '12' }, true, false);
  pin.focus(2);
  pin.type('3');
  pin.type('4');
  assert.equal(pin.code(), '12');
  assert.deepEqual(pin.seen, ['change 123', 'change 124']);
});

test('focus never sits past the first empty cell once the host has answered an edit', () => {
  const pin = render({ value: '12' }, true, false);
  pin.focus(2);
  pin.type('3');
  assert.equal(pin.active(), 2);
  const full = render({ value: '482913' }, true, false);
  full.focus(5);
  full.type('2');
  assert.equal(full.active(), 5);
});

test('the tab stop follows focus while the group holds it, and returns to the first empty cell after focus leaves', () => {
  const pin = render({ value: '482' });
  assert.deepEqual(pin.stops(), [3]);
  pin.focus(1);
  assert.deepEqual(pin.stops(), [1]);
  const away = pin.root.querySelector('button')!;
  act(() => { pin.cells()[1]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: away })); });
  assert.deepEqual(pin.stops(), [3]);
});

test('Delete past the end of the code changes nothing and keeps focus where it was', () => {
  const pin = render({ value: '48' });
  pin.focus(0);
  pin.key('End');
  pin.key('Delete');
  assert.equal(pin.active(), 5);
  assert.deepEqual(pin.seen, []);
});

test('a host that moves focus on complete keeps it there', () => {
  function Host() {
    const [value, write] = useState('48291');
    const verify = React.useRef<HTMLButtonElement>(null);
    return (
      <div>
        <ArenaPinInput label="Verification code" value={value} onValueChange={write} onComplete={() => verify.current?.focus()} />
        <button type="button" ref={verify}>Verify</button>
      </div>
    );
  }
  const root = mount(<Host />);
  const cells = [...root.querySelectorAll<HTMLInputElement>('[data-arena-part="pin-input.cell"]')];
  act(() => { cells[5]!.focus(); });
  const cell = cells[5]!;
  act(() => {
    setValue.call(cell, cell.value + '3');
    cell.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(root.ownerDocument.activeElement, root.querySelector('button'));
});
