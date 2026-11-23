import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaCheckbox } from './ArenaCheckbox.tsx';

test('the native input carries checked when checked is true', () => {
  const html = renderToStaticMarkup(<ArenaCheckbox checked label="Notify" />);
  assert.match(html, /<input type="checkbox"[^>]*checked=""/);
});

test('the native input carries no checked attribute when checked is false', () => {
  const html = renderToStaticMarkup(<ArenaCheckbox checked={false} label="Notify" />);
  assert.doesNotMatch(html, /checked=""/);
});

test('checked draws the crimson fill; unchecked draws the input surface', () => {
  const on = renderToStaticMarkup(<ArenaCheckbox checked label="Notify" />);
  const off = renderToStaticMarkup(<ArenaCheckbox label="Notify" />);
  assert.match(on, /data-arena-part="checkbox.box"[^>]*\bdata-arena-checked=""/);
  assert.match(off, /data-arena-part="checkbox.box"(?:(?!data-arena-checked=)[^>])*>/);
});

test('the checkbox draws its box slot and no hook class', () => {
  const html = renderToStaticMarkup(<ArenaCheckbox label="Notify" />);
  assert.match(html, /arena-checkbox__box/);
  assert.doesNotMatch(html, /\barena-check-box\b/, 'the hook class the injected sheet needed is gone with it');
});

test('the check mark takes its size, its colour and its stroke from one slot', () => {
  const html = renderToStaticMarkup(<ArenaCheckbox checked label="Notify" />);
  assert.match(html, /<svg class="arena-checkbox__check"/);
  assert.match(html, /stroke="currentColor"/, 'the path takes the colour the slot sets rather than naming one');
});

test('name, value and required reach the native input', () => {
  const html = renderToStaticMarkup(<ArenaCheckbox name="terms" value="accepted" required label="Accept" />);
  assert.match(html, /name="terms"/);
  assert.match(html, /value="accepted"/);
  assert.match(html, /required=""/);
});

test('label renders beside the box', () => {
  const html = renderToStaticMarkup(<ArenaCheckbox label="Notify on approval" />);
  assert.match(html, /Notify on approval/);
});

test('a blank label is refused even with showLabel false', () => {
  assert.throws(() => renderToStaticMarkup(<ArenaCheckbox label="   " showLabel={false} />), /^Error: ArenaCheckbox:/);
});

test('showLabel false draws no label and keeps the name on the input', () => {
  const html = renderToStaticMarkup(<ArenaCheckbox label="Select row" showLabel={false} />);
  assert.doesNotMatch(html, /data-arena-part="checkbox\.label"/);
  assert.match(html, /<input[^>]*aria-label="Select row"/);
});
