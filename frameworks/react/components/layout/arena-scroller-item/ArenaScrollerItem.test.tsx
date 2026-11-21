/* The cell draws nothing, so what there is to assert is that it renders a real box, that it
 * renders exactly one, and that nothing of the consumer's reaches it. What the box MEANS, the
 * width and the snap point, is asserted once beside the manifest. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaScrollerItem } from './ArenaScrollerItem.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('the cell is one real element, which is the whole reason it exists', () => {
  const html = render(<ArenaScrollerItem><span id="a">One</span></ArenaScrollerItem>);
  assert.match(html, /^<div class="[^"]+"[^>]*><span id="a">One<\/span><\/div>$/,
    'a cell that rendered no box, or two, would be back to the hazard it was built to close');
});

test('the cell draws no role and no tab stop of its own', () => {
  const html = render(<ArenaScrollerItem><span>One</span></ArenaScrollerItem>);
  assert.doesNotMatch(html, /role=/);
  assert.doesNotMatch(html, /tabindex/i);
  assert.doesNotMatch(html, /aria-/);
});

test('an empty cell is a legal shape, because a container that merely nests guards nothing', () => {
  assert.doesNotThrow(() => render(<ArenaScrollerItem />));
});
