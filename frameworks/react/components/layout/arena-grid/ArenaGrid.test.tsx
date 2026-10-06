/* The tracks, the ceiling and the gap are families an adopter writes as a class, so the root
 * carries the option classes it is given and the slot class that reads the channel, and no
 * style attribute. The slot string is read from the generated manifest, never spelt here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaGrid } from './ArenaGrid.tsx';
import classes from './ArenaGrid.classes.generated.ts';
import tailwind from './ArenaGrid.manifest.generated.ts';

const rootClass = (html: string) => /<div[^>]*\bclass="([^"]*)"/.exec(html)?.[1] ?? '';

test('a grid given a minimum and a gap option carries both on its root, beside its own class', () => {
  const given = rootClass(renderToStaticMarkup(<ArenaGrid className="arena-grid-min-lg arena-grid-gap-section" />)).split(/\s+/);
  for (const name of ['arena-grid-min-lg', 'arena-grid-gap-section', ...classes.slots.root.split(/\s+/)]) {
    assert.ok(given.includes(name), `the root lacks ${name}`);
  }
});

test('the root slot reads the minimum, the ceiling and the gap through their channels', () => {
  const slot = tailwind.slots.root;
  assert.ok(slot.includes('var(--arena-grid-min-width,var(--arena-grid-min,var(--grid-min)))'));
  assert.ok(slot.includes('var(--arena-grid-max-width,var(--arena-grid-max,none))'));
  assert.ok(slot.includes('var(--arena-grid-gap-size,var(--arena-grid-gap,var(--rhythm-component)))'));
});

test('no render of the grid carries a style attribute', () => {
  assert.doesNotMatch(renderToStaticMarkup(<ArenaGrid />), /\bstyle=/);
  assert.doesNotMatch(renderToStaticMarkup(<ArenaGrid className="arena-grid-max-md" />), /\bstyle=/);
});

test('every child is one cell exactly as written -- nothing is wrapped and nothing is measured', () => {
  const html = renderToStaticMarkup(
    <ArenaGrid><span>One</span><span>Two</span><span>Three</span></ArenaGrid>);
  assert.equal(html.match(/<span>/g)?.length, 3);
  assert.equal(html.match(/<div/g)?.length, 1,
    'the grid must render exactly one box, its own -- a wrapper per cell would break every selector a consumer writes');
});

test('ArenaGrid draws no grid ROLE and no cells -- it is layout, and the grid pattern is a data structure', () => {
  const html = renderToStaticMarkup(<ArenaGrid><span>One</span></ArenaGrid>);
  assert.doesNotMatch(html, /role="grid"/, 'a role="grid" here would announce a table where there are only boxes');
  assert.doesNotMatch(html, /role="gridcell"/);
  assert.doesNotMatch(html, /tabindex/i, 'layout costs no tab stop');
});

test('ArenaGrid drops a consumer style object and a consumer attribute -- no R4 escape reaches the root', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const styled = renderToStaticMarkup(<ArenaGrid style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(styled, /#ff00ff/, 'a consumer style reached the rendered root');
  const spread = renderToStaticMarkup(<ArenaGrid data-stray="x" />);
  assert.doesNotMatch(spread, /data-stray/, 'a consumer attribute reached the rendered root');
});
