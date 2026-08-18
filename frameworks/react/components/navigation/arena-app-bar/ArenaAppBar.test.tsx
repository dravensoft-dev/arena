/* The page width is computed and stays inline, so it is read through the style attribute; the
 * sticky branch is a variant and is read off the class list. What each utility MEANS is asserted
 * once beside the manifest. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaAppBar } from './ArenaAppBar.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('the bar is the banner landmark, which the element names rather than a role attribute', () => {
  const html = render(<ArenaAppBar brand={<span id="mark" />} />);
  assert.match(html, /^<header/);
  assert.doesNotMatch(html, /role=/,
    'a redundant role on a header is a second statement of the same fact');
});

test('the band stops at the page width while the bar spans, and the width is a role', () => {
  const html = render(<ArenaAppBar brand={<span />} />);
  assert.match(html, /style="max-width:var\(--container-max\)"/,
    'the width has to arrive as a role, or a style plugin cannot re-answer how wide a page is');
  assert.doesNotMatch(html.slice(0, html.indexOf('<div')), /max-width/,
    'the bar itself must span, or the fill and the hairline stop short of the viewport');
});

test('the three slots are drawn only when given', () => {
  const bare = render(<ArenaAppBar />);
  for (const absent of ['id="mark"', 'id="nav"', 'id="cta"']) {
    assert.doesNotMatch(bare, new RegExp(absent));
  }
  const full = render(
    <ArenaAppBar brand={<span id="mark" />} nav={<nav id="nav" aria-label="Sections" />}
      actions={<button id="cta" type="button">Basket</button>} />,
  );
  for (const text of ['id="mark"', 'id="nav"', 'id="cta"']) assert.match(full, new RegExp(text));
});

test('the bar draws no anchor and no navigation landmark of its own', () => {
  const html = render(<ArenaAppBar brand={<span />} nav={<span />} actions={<span />} />);
  assert.doesNotMatch(html, /<a[\s>]/, 'a router link belongs in the brand slot, never in the bar');
  assert.doesNotMatch(html, /<nav[\s>]/,
    'a page with a side nav has two navigation landmarks, and naming them apart is the consumer\'s');
});

test('sticky is on by default and is the only thing the variant moves', () => {
  assert.equal(render(<ArenaAppBar brand={<span />} />),
    render(<ArenaAppBar brand={<span />} sticky />));
  assert.notEqual(render(<ArenaAppBar brand={<span />} sticky={false} />),
    render(<ArenaAppBar brand={<span />} sticky />));
});

test('ArenaAppBar drops a consumer style object and a consumer attribute', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = render(<ArenaAppBar style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = render(<ArenaAppBar data-stray="x" />);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});
