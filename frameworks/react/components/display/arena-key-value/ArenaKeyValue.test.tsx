/* Every claim here is about the tree the list renders: which elements it opens, which value takes
 * the figure treatment, and where the total goes. What the figure treatment IS is asserted once
 * beside the manifest. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaKeyValue } from './ArenaKeyValue.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

const ROWS = [
  { term: 'Method', value: 'Standard' },
  { term: 'Subtotal', value: '42.00', numeric: true },
];

test('it renders a real definition list, so a term and its value are associated by the platform', () => {
  const html = render(<ArenaKeyValue rows={ROWS} />);
  assert.match(html, /^<dl/);
  assert.match(html, /<dt[^>]*>Method<\/dt><dd[^>]*>Standard<\/dd>/);
  assert.equal((html.match(/<dt/g) ?? []).length, ROWS.length);
});

test('a figure takes a different value class from a line of prose', () => {
  const html = render(<ArenaKeyValue rows={ROWS} />);
  const values = [...html.matchAll(/<dd class="([^"]*)"/g)].map((m) => m[1]);
  assert.equal(values.length, 2);
  assert.notEqual(values[0], values[1],
    'a money column that does not take tabular numerals is a column that jitters as it changes');
});

test('the total is drawn last, and only when it is given', () => {
  const without = render(<ArenaKeyValue rows={ROWS} />);
  assert.doesNotMatch(without, /Total/);

  const withTotal = render(<ArenaKeyValue rows={ROWS} total={{ term: 'Total', value: '46.50', numeric: true }} />);
  assert.ok(withTotal.indexOf('Total') > withTotal.indexOf('Subtotal'),
    'the row the others add up to comes after them');
  assert.equal((withTotal.match(/<dt/g) ?? []).length, ROWS.length + 1);
});

test('the total takes a different row class, because the rule and the register say it is a total', () => {
  const html = render(<ArenaKeyValue rows={ROWS} total={{ term: 'Total', value: '46.50' }} />);
  const rows = [...html.matchAll(/<div class="([^"]*)"/g)].map((m) => m[1]);
  assert.equal(new Set(rows).size, 2, 'deriving a total from its position would make the last adjustment look like one');
});

test('an empty list renders an empty dl rather than throwing', () => {
  assert.equal(render(<ArenaKeyValue rows={[]} />).match(/<dt/), null);
});

test('ArenaKeyValue drops a consumer style object and a consumer attribute', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = render(<ArenaKeyValue rows={[]} style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = render(<ArenaKeyValue rows={[]} data-stray="x" />);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});
