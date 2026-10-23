/* What a server renders for a filter bar: a group the label names, the controls first and as given,
 * then a list of chips the locale names, each removed by a button that reads the remove word and
 * the chip's text, then Clear all, drawn only while a filter is applied and the bar is clearable. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaFilterBar, type ArenaAppliedFilter } from './ArenaFilterBar.tsx';

const APPLIED: ArenaAppliedFilter[] = [{ id: 'region', label: 'Region: Europe West' }, { id: 'status', label: 'Status: Failed' }];
const render = (node: React.ReactElement) => renderToStaticMarkup(node);

test('the group is named by the label, and the controls render first, as given', () => {
  const html = render(<ArenaFilterBar label="Deployment filters" applied={APPLIED}><select aria-label="Region" /><input aria-label="Search" /></ArenaFilterBar>);
  assert.match(html, /^<div role="group" aria-label="Deployment filters"/);
  const order = ['<select aria-label="Region"', '<input aria-label="Search"', 'role="list"', 'data-arena-part="filter-bar.clear"'].map((piece) => html.indexOf(piece));
  assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1]!)), `out of order: ${order}`);
});

test('the chips sit in a named list, each removed by a button that names its chip', () => {
  const html = render(<ArenaFilterBar label="Deployment filters" applied={APPLIED}><select aria-label="Region" /></ArenaFilterBar>);
  assert.match(html, /<ul role="list" aria-label="Applied filters"/);
  assert.equal([...html.matchAll(/data-arena-part="filter-bar.chip"/g)].length, 2);
  assert.equal([...html.matchAll(/data-arena-part="tag.close"/g)].length, 2);
  assert.ok(!/tabindex="-1"/.test(html), 'every remove button stays a tab stop');
  assert.match(html, /aria-label="Clear all filters"[^>]*>Clear all<\/button>/);
});

test('Clear all is drawn only while a filter is applied and the bar is clearable, and no chip row is drawn empty', () => {
  const empty = render(<ArenaFilterBar label="Deployment filters"><select aria-label="Region" /></ArenaFilterBar>);
  assert.ok(!empty.includes('filter-bar.clear') && !empty.includes('<ul'));
  const held = render(<ArenaFilterBar label="Deployment filters" applied={APPLIED} clearable={false}><select aria-label="Region" /></ArenaFilterBar>);
  assert.ok(!held.includes('filter-bar.clear') && held.includes('<ul'));
});

test('a blank label and a bar with no control both throw', () => {
  assert.throws(() => render(<ArenaFilterBar label="  "><select aria-label="Region" /></ArenaFilterBar>), /ArenaFilterBar: `label` is required/);
  assert.throws(() => render(<ArenaFilterBar label="Deployment filters">{null}</ArenaFilterBar>), /no controls is not a legal shape/);
});
