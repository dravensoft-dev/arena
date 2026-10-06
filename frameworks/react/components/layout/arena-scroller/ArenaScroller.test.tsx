/* The item width is a family an adopter writes as a class on the row, which reaches the items it
 * holds; the row draws no style attribute and the slot strings are read from the generated
 * manifests, never spelt here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaScroller } from './ArenaScroller.tsx';
import { ArenaScrollerItem } from '../arena-scroller-item/ArenaScrollerItem.tsx';
import classes from './ArenaScroller.classes.generated.ts';
import tailwind from './ArenaScroller.manifest.generated.ts';
import itemTailwind from '../arena-scroller-item/ArenaScrollerItem.manifest.generated.ts';
import type { ArenaScrollerBehaviour } from '../../../Api.generated';

const BEHAVIOURS = ['snap', 'flow'] as const;

const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const items = <><ArenaScrollerItem>One</ArenaScrollerItem><ArenaScrollerItem>Two</ArenaScrollerItem></>;

const rootClass = (html: string) => /<div[^>]*\bclass="([^"]*)"/.exec(html)?.[1] ?? '';

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

test('the row carries the option class it is given beside its own, and no style attribute', () => {
  const html = render(<ArenaScroller label="L" className="arena-scroller-item-lg">{items}</ArenaScroller>);
  const given = rootClass(html).split(/\s+/);
  for (const name of ['arena-scroller-item-lg', ...classes.slots.root.split(/\s+/)]) {
    assert.ok(given.includes(name), `the root lacks ${name}`);
  }
  assert.doesNotMatch(html, /\bstyle=/);
  assert.doesNotMatch(/^<div[^>]*>/.exec(html)?.[0] ?? '', /data-arena-boundary/, 'the row is transparent, so it is no boundary');
});

test('the item reads the width through the channel the row names as bound', () => {
  const [channel] = Object.keys(tailwind.bound);
  const [family] = tailwind.answers;
  assert.ok(itemTailwind.slots.root.includes(`var(${channel},var(--arena-${family},`));
});

test('the two behaviours are two distinct attributes, and snap is the default', () => {
  const seen = new Set(BEHAVIOURS.map((behaviour) => {
    const html = render(<ArenaScroller label="L" behaviour={behaviour}>{items}</ArenaScroller>);
    return /\bdata-arena-behaviour="([^"]*)"/.exec(html)?.[1];
  }));
  assert.equal(seen.size, BEHAVIOURS.length, 'the two behaviours compiled to the same attribute');
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
