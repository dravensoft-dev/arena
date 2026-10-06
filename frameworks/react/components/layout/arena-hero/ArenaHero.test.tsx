import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaHero } from './ArenaHero.tsx';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('a hero with no title is refused, and a title of nothing but spaces is refused with it', () => {
  // @ts-expect-error the contract requires it, and the guard is what this asserts
  assert.throws(() => render(<ArenaHero />), /`title` is required/);
  assert.throws(() => render(<ArenaHero title="   " />), /`title` is required/);
});

test('the title opens the page, at the top rung of the ladder', () => {
  assert.match(render(<ArenaHero title="Coffee that tells you where it grew" />),
    /<h1[^>]*>Coffee that tells you where it grew<\/h1>/);
});

test('the hero writes no inline track list, and a layout class reaches its root', () => {
  assert.doesNotMatch(render(<ArenaHero title="T" />), /\bstyle="/);
  for (const layout of ['arena-layout-split', 'arena-layout-stacked', 'arena-layout-bleed'] as const) {
    const html = render(<ArenaHero title="T" className={layout} />);
    assert.match(html, new RegExp(`\\bclass="[^"]*\\b${layout}\\b[^"]*"[^>]*data-arena-part="hero"`));
    assert.doesNotMatch(html, /\bstyle="/);
  }
});

test('an alignment class reaches the root, and a class the hero does not answer is dropped', () => {
  assert.match(render(<ArenaHero title="T" className="arena-align-center" />),
    /\bclass="[^"]*\barena-align-center\b[^"]*"[^>]*data-arena-part="hero"/);
  // @ts-expect-error a placement is not a family a hero answers
  assert.doesNotMatch(render(<ArenaHero title="T" className="arena-placement-end" />), /arena-placement-end/);
});

test('the eyebrow, the lede, the actions and the figure are drawn only when given', () => {
  const bare = render(<ArenaHero title="T" />);
  for (const absent of ['Single origin', 'traceable', 'id="cta"', 'id="pic"']) {
    assert.doesNotMatch(bare, new RegExp(absent));
  }
  const full = render(
    <ArenaHero title="T" eyebrow="Single origin" lede="Every lot is traceable."
      actions={<button id="cta" type="button">Shop</button>} figure={<img id="pic" alt="" />} />,
  );
  for (const text of ['Single origin', 'traceable', 'id="cta"', 'id="pic"']) {
    assert.match(full, new RegExp(text));
  }
});

test('the hero claims no banner landmark, because banner is the site header and this is content', () => {
  const html = render(<ArenaHero title="T" />);
  assert.match(html, /^<section/);
  assert.doesNotMatch(html, /role=/);
  assert.doesNotMatch(html, /aria-label/);
});

test('ArenaHero drops a consumer style object and a consumer attribute', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = render(<ArenaHero title="T" style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = render(<ArenaHero title="T" data-stray="x" />);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});
