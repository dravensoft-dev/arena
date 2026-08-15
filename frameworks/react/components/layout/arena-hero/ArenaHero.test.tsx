/* The track list is computed from a role and stays inline, so it is read through the style
 * attribute rather than searched for as a "name: value" string, which would itself be a bare
 * dimension literal under frameworks/. The layouts and the alignments are variants and are read
 * off the class list. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaHero } from './ArenaHero.tsx';
import type { ArenaHeroAlign, ArenaHeroLayout } from '../../../Api.generated';

const LAYOUTS = ['stacked', 'split', 'bleed'] as const;
const ALIGNS = ['start', 'center'] as const;

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

function declarations(html: string): Record<string, string> {
  const style = /style="([^"]*)"/.exec(html)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const at = part.indexOf(':');
    if (at > 0) out[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  return out;
}

const classesOf = (html: string) => (/class="([^"]*)"/.exec(html)?.[1] ?? '').split(/\s+/).filter(Boolean);

test('a hero with no title is refused, and a title of nothing but spaces is refused with it', () => {
  // @ts-expect-error the contract requires it, and the guard is what this asserts
  assert.throws(() => render(<ArenaHero />), /`title` is required/);
  assert.throws(() => render(<ArenaHero title="   " />), /`title` is required/);
});

test('the title opens the page, at the top rung of the ladder', () => {
  assert.match(render(<ArenaHero title="Coffee that tells you where it grew" />),
    /<h1[^>]*>Coffee that tells you where it grew<\/h1>/);
});

test('the split threshold is derived from a role, never from a literal', () => {
  const tracks = declarations(render(<ArenaHero title="T" />))['grid-template-columns'];
  assert.match(tracks ?? '', /^repeat\(auto-fit, minmax\(min\(.+, 100%\), 1fr\)\)$/,
    'the column count must come from the room, and the minimum must be clamped or it overflows');
  assert.match(tracks ?? '', /var\(--grid-min\)/,
    'a style plugin that widens the grid minimum must widen when a hero splits');
});

test('only the split layout lays a track list, because the other two are one column', () => {
  for (const layout of LAYOUTS) {
    const tracks = declarations(render(<ArenaHero title="T" layout={layout} />))['grid-template-columns'];
    if (layout === 'split') assert.ok(tracks, 'split lays no tracks');
    else assert.equal(tracks, undefined, `${layout} lays a track list it does not use`);
  }
});

test('the three layouts and the two alignments are distinct, and split with start is the default', () => {
  const roots = new Set(LAYOUTS.map((layout) => classesOf(render(<ArenaHero title="T" layout={layout} />)).join(' ')));
  assert.equal(roots.size, LAYOUTS.length, 'two layouts compiled to the same root');

  const words = new Set(ALIGNS.map((align) => render(<ArenaHero title="T" align={align} />)));
  assert.equal(words.size, ALIGNS.length, 'the two alignments compiled to the same words block');

  assert.equal(render(<ArenaHero title="T" />), render(<ArenaHero title="T" layout="split" align="start" />));
});

test('an unknown layout or alignment falls back to the default rather than rendering with none', () => {
  assert.equal(
    render(<ArenaHero title="T" layout={'poster' as ArenaHeroLayout} />),
    render(<ArenaHero title="T" layout="split" />),
  );
  assert.equal(
    render(<ArenaHero title="T" align={'end' as ArenaHeroAlign} />),
    render(<ArenaHero title="T" align="start" />),
  );
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
