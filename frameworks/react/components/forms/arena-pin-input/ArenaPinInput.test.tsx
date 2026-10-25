/* What a server renders for a pin input: a group named by the label, one real text field per
 * character named by its position, one tab stop, no name on any cell, and the whole code in a
 * single hidden field a form submits. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaPinInput } from './ArenaPinInput.tsx';
import tailwind from './ArenaPinInput.manifest.generated.ts';

const render = (node: React.ReactElement) => renderToStaticMarkup(node);
const cells = (html: string) => [...html.matchAll(/<input[^>]*data-arena-part="pin-input.cell"[^>]*>/g)].map((m) => m[0]);

test('six cells in a group the label names, each a text field named by its position', () => {
  const html = render(<ArenaPinInput label="Verification code" />);
  const label = /<span id="([^"]+)"[^>]*data-arena-part="pin-input.label"/.exec(html)?.[1];
  assert.ok(label, html);
  assert.match(html, new RegExp(`role="group" aria-labelledby="${label}"`));
  const all = cells(html);
  assert.equal(all.length, 6);
  all.forEach((cell, i) => {
    for (const attribute of ['type="text"', 'inputMode="numeric"', 'pattern="[0-9]*"', 'autoComplete="one-time-code"', `aria-label="Character ${i + 1} of 6"`])
      assert.ok(cell.includes(attribute), `cell ${i} carries no ${attribute}: ${cell}`);
    assert.ok(!cell.includes('name='), `a cell carries a name: ${cell}`);
    assert.ok(!cell.includes('maxLength'), `a cell caps its length, which cuts an autofilled code: ${cell}`);
  });
});

test('exactly one cell is a tab stop: the first empty one, or the last when the code is full', () => {
  for (const [value, stop] of [['', 0], ['48', 2], ['482913', 5]] as const) {
    const stops = cells(render(<ArenaPinInput label="Verification code" value={value} />)).map((cell) => cell.includes('tabindex="0"'));
    assert.deepEqual(stops.map((s, i) => (s ? i : -1)).filter((i) => i >= 0), [stop], value);
  }
});

test('the code fills the first cells, and a character the set refuses is dropped', () => {
  const values = cells(render(<ArenaPinInput label="Verification code" length={4} value="4x8" />)).map((cell) => /value="([^"]*)"/.exec(cell)?.[1]);
  assert.deepEqual(values, ['4', '8', '', '']);
});

test('the form gets the whole code once, through a hidden field, and nothing without a name', () => {
  const html = render(<ArenaPinInput label="Verification code" name="otp" value="4829" />);
  assert.deepEqual([...html.matchAll(/name="([^"]+)"/g)].map((m) => m[1]), ['otp']);
  assert.match(html, /<input type="hidden" name="otp" value="4829"\/>/);
  assert.ok(!render(<ArenaPinInput label="Verification code" value="4829" />).includes('type="hidden"'));
});

test('masked cells are password fields, alphanumeric asks for the full keyboard, and required is native on every cell', () => {
  const all = cells(render(<ArenaPinInput label="Device PIN" length={4} masked characters="alphanumeric" required />));
  for (const cell of all) {
    assert.ok(cell.includes('type="password"') && cell.includes('inputMode="text"') && cell.includes('required=""'), cell);
    assert.ok(!cell.includes('pattern=') && !cell.includes('aria-required'), cell);
  }
});

test('an error turns every cell invalid and describes each one, and a hint describes them without one', () => {
  const failed = render(<ArenaPinInput label="Verification code" hint="Sent to your phone." error="That code does not match." />);
  const note = /<span id="([^"]+)"[^>]*data-arena-part="pin-input.error"/.exec(failed)?.[1];
  assert.ok(note, failed);
  for (const cell of cells(failed)) assert.ok(cell.includes('aria-invalid="true"') && cell.includes(`aria-describedby="${note}"`), cell);
  assert.ok(!failed.includes('pin-input.hint'));
  const helped = render(<ArenaPinInput label="Verification code" hint="Sent to your phone." />);
  const tip = /<span id="([^"]+)"[^>]*data-arena-part="pin-input.hint"/.exec(helped)?.[1];
  assert.ok(tip, helped);
  for (const cell of cells(helped)) assert.ok(cell.includes('aria-invalid="false"') && cell.includes(`aria-describedby="${tip}"`), cell);
  for (const cell of cells(render(<ArenaPinInput label="Verification code" />))) assert.ok(!cell.includes('aria-describedby'), cell);
});

test('the root and the group both shrink, so six cells fit the width they are given', () => {
  for (const slot of [tailwind.slots.root, tailwind.slots.group]) assert.ok(slot.split(/\s+/).includes('min-w-0'), slot);
});
