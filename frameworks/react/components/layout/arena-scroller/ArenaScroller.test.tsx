/* The item width is computed from a member and reaches the children as a custom property, so it
 * is read out of the style attribute rather than searched for in the markup; the behaviour is a
 * variant and is read off the class list. Neither is spelt out as a "name: value" string, which
 * would itself be a bare dimension literal under frameworks/. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaScroller } from './ArenaScroller.tsx';
import { ArenaScrollerItem } from '../arena-scroller-item/ArenaScrollerItem.tsx';
import type { ArenaScrollerBehaviour } from '../../../Api.generated';

const BEHAVIOURS = ['snap', 'flow'] as const;

const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const items = <><ArenaScrollerItem>One</ArenaScrollerItem><ArenaScrollerItem>Two</ArenaScrollerItem></>;

function declarations(html: string): Record<string, string> {
  const style = /style="([^"]*)"/.exec(html)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const at = part.indexOf(':');
    if (at > 0) out[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  return out;
}

function rootClasses(html: string): string[] {
  return (/class="([^"]*)"/.exec(html)?.[1] ?? '').split(/\s+/).filter(Boolean);
}

test('the row is one tab stop carrying a group role and the name it was given', () => {
  const html = render(<ArenaScroller label="Recently landed lots">{items}</ArenaScroller>);
  assert.match(html, /role="group"/);
  assert.match(html, /aria-label="Recently landed lots"/);
  assert.match(html, /tabindex="0"/,
    'a scrollable box that is not focusable leaves everything past its edge to the pointer alone');
});

test('a row with no label is refused, and a label of nothing but spaces is refused with it', () => {
  assert.throws(
    // @ts-expect-error the contract requires it, and the guard is what this asserts
    () => render(<ArenaScroller>{items}</ArenaScroller>),
    /`label` is required/,
  );
  assert.throws(() => render(<ArenaScroller label="  ">{items}</ArenaScroller>), /`label` is required/);
});

test('a row with no children is refused, because it would be a tab stop over nothing', () => {
  assert.throws(
    // @ts-expect-error the contract requires it, and the guard is what this asserts
    () => render(<ArenaScroller label="Recently landed lots" />),
    /tab stop over nothing/,
  );
  const admin = false;
  assert.throws(
    () => render(<ArenaScroller label="Recently landed lots">{admin && <span>One</span>}</ArenaScroller>),
    /tab stop over nothing/,
  );
});

test('the item width reaches the children as a custom property, and defaults to the grid role', () => {
  const value = declarations(render(
    <ArenaScroller label="L">{items}</ArenaScroller>,
  ))['--arena-scroller-item'];
  assert.equal(value, 'var(--grid-min)',
    'a rail and a wall of the same cards must not disagree about how wide a card is');
  const given = declarations(render(
    <ArenaScroller label="L" itemWidth="calc(var(--sp-1) * 62)">{items}</ArenaScroller>,
  ))['--arena-scroller-item'];
  assert.equal(given, 'calc(var(--sp-1) * 62)');
  assert.ok(!/^\d/.test(given), 'the width must arrive as a token derivation, never as a literal');
});

test('the two behaviours are two distinct classes, and snap is the default', () => {
  const seen = new Set(BEHAVIOURS.map((behaviour) => {
    const classes = rootClasses(render(
      <ArenaScroller label="L" behaviour={behaviour}>{items}</ArenaScroller>,
    ));
    return classes.filter((cls) => cls.includes('behaviour')).join(' ');
  }));
  assert.equal(seen.size, BEHAVIOURS.length, 'the two behaviours compiled to the same class');
  assert.equal(
    render(<ArenaScroller label="L">{items}</ArenaScroller>),
    render(<ArenaScroller label="L" behaviour="snap">{items}</ArenaScroller>),
  );
});

test('an unknown behaviour falls back to the default rather than rendering with none at all', () => {
  assert.equal(
    render(<ArenaScroller label="L" behaviour={'drift' as ArenaScrollerBehaviour}>{items}</ArenaScroller>),
    render(<ArenaScroller label="L" behaviour="snap">{items}</ArenaScroller>),
  );
});

test('every child is placed exactly as written, and the row wraps nothing', () => {
  const html = render(<ArenaScroller label="L"><span id="a">One</span><span id="b">Two</span></ArenaScroller>);
  assert.match(html, /<span id="a">One<\/span><span id="b">Two<\/span>/,
    'the row places what it is given; the cell that carries the width is a component the caller writes');
});

test('ArenaScroller drops a consumer style object and a consumer attribute', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = render(<ArenaScroller label="L" style={{ color: '#ff00ff' }}>{items}</ArenaScroller>);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = render(<ArenaScroller label="L" data-stray="x">{items}</ArenaScroller>);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});
