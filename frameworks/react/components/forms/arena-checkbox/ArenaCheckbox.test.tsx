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
  assert.match(on, /data-arena-part="checkbox.box"[^>]*\bdata-arena-checked=""/);
  assert.match(off, /data-arena-part="checkbox.box"(?:(?!data-arena-checked=)[^>])*>/);
  assert.match(off, /data-arena-part="checkbox.box"(?:(?!data-arena-checked=)[^>])*>/);
});

test('the focus ring is a selector on the box, so nothing injects a stylesheet to reach the input', () => {
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

test('ArenaCheckbox drops a consumer style object -- the ...style escape is gone', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaCheckbox label="A" style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaCheckbox drops a consumer attribute -- the {...rest} escape is gone', () => {
  const html = renderToStaticMarkup(<ArenaCheckbox label="A" data-stray="x" />);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});
