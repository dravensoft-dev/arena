/* What is this component's own is the two guards, the order it renders in, and the classes it
 * draws from its manifest; all four are read out of the markup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaFieldset } from './ArenaFieldset.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const field = <span>A field</span>;

test('a fieldset with no legend is refused, and a legend of nothing but spaces with it', () => {
  // @ts-expect-error the contract requires it, and the guard is what this asserts
  assert.throws(() => render(<ArenaFieldset>{field}</ArenaFieldset>), /^Error: ArenaFieldset: `legend` is required/);
  assert.throws(() => render(<ArenaFieldset legend="   ">{field}</ArenaFieldset>), /`legend` is required/);
});

test('a fieldset with no children is refused, counting a false conditional as none', () => {
  // @ts-expect-error the contract requires it, and the guard is what this asserts
  assert.throws(() => render(<ArenaFieldset legend="Notifications" />), /not a legal shape/);
  assert.throws(() => render(<ArenaFieldset legend="Notifications">{false}</ArenaFieldset>), /not a legal shape/);
});

test('the legend is the first child, then the fields, then the note, each drawn from the manifest', () => {
  const html = render(<ArenaFieldset legend="Notifications" hint="At most once a day.">{field}</ArenaFieldset>);
  assert.match(html, /^<fieldset class="arena-fieldset__root"[^>]*><legend class="arena-fieldset__legend"/);
  assert.ok(html.indexOf('arena-fieldset__body') < html.indexOf('arena-fieldset__hint'));
  assert.match(html, /class="arena-fieldset__body"[^>]*data-arena-boundary=""/);
});

test('the set dims under disabled and marks its state under an error', () => {
  assert.match(render(<ArenaFieldset legend="N" disabled>{field}</ArenaFieldset>), /<fieldset[^>]*data-arena-disabled=""[^>]*disabled=""/);
  assert.match(render(<ArenaFieldset legend="N" error="Choose one.">{field}</ArenaFieldset>), /data-arena-state="error"/);
});
