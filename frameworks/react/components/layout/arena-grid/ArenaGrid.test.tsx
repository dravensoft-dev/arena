/* The tracks and the ceiling are computed from members and stay inline, so they are read
 * through declarations(); the gap and the centring are variants and are read off the class
 * list. Neither is spelt out as a "name: value" string, which would itself be a bare
 * dimension literal under frameworks/, and check:dimensions reads this file too. Original:
 * Every assertion reads the rendered style through declarations(), never by searching the
 * markup for a "name: value" string. A test that spelt one out would itself be a bare
 * dimension literal under frameworks/, and check:dimensions reads this file too. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaGrid } from './ArenaGrid.tsx';
import type { ArenaGridGap } from '../../../Api.generated';

const GAPS = ['none', 'sm', 'md', 'lg'] as const;

function declarations(html: string): Record<string, string> {
  const style = /style="([^"]*)"/.exec(html)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const at = part.indexOf(':');
    if (at > 0) out[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  return out;
}

const styleOf = (element: React.ReactElement) => declarations(renderToStaticMarkup(element));

function decl(element: React.ReactElement, name: string): string {
  const value = styleOf(element)[name];
  assert.ok(value !== undefined, `the render declares no ${name}`);
  return value;
}

test('the track list is auto-fill over the min, clamped against the container, so an unfilled row keeps its empty tracks', () => {
  const tracks = decl(<ArenaGrid />, 'grid-template-columns');
  assert.match(tracks, /^repeat\(auto-fill, minmax\(min\(.+, 100%\), 1fr\)\)$/,
    'the count must come from the room, and the min must be clamped or it overflows');
  assert.ok(!/\d+px/.test(tracks.replace(/var\([^)]*\)/g, '')),
    'the default min must reach the track list as a token derivation, never as a literal');
});

test('a min wider than any card still yields one clamped column rather than an overflow', () => {
  const tracks = decl(<ArenaGrid min="calc(var(--sp-1) * 400)" />, 'grid-template-columns');
  assert.match(tracks, /min\(calc\(var\(--sp-1\) \* 400\), 100%\)/);
});

const gapOf = (step: ArenaGridGap) =>
  /\bdata-arena-gap="([^"]*)"/.exec(renderToStaticMarkup(<ArenaGrid gap={step} />))?.[1] ?? '';

test('the four named steps are four distinct scale values, growing in the order they are named', () => {
  const seen = GAPS.map(gapOf);
  assert.equal(new Set(seen).size, GAPS.length, `two steps resolve to the same value: ${seen.join(', ')}`);
  const step = (value: string) => GAPS.indexOf(value as ArenaGridGap);
  const steps = seen.map(step);
  assert.equal(steps[0], 0, 'the none step must be the zero of the scale');
  assert.ok(steps[1]! < steps[2]! && steps[2]! < steps[3]!,
    'the named steps must grow: a set that reads small to large and does not is worse than no set');
});

test('the default gap is md, matching the contract', () => {
  assert.equal(renderToStaticMarkup(<ArenaGrid />), renderToStaticMarkup(<ArenaGrid gap="md" />));
});

test('an unknown gap falls back to the default rather than rendering with none at all', () => {
  assert.equal(gapOf('huge' as ArenaGridGap), gapOf('md'));
});

test('maxWidth caps and centres, and its absence leaves the grid filling its container', () => {
  const bare = renderToStaticMarkup(<ArenaGrid />);
  assert.match(bare, /\barena-grid__root\b/, 'a grid with no ceiling must fill what contains it');
  assert.ok(!('max-width' in styleOf(<ArenaGrid />)), 'and must declare no ceiling of its own');
  assert.doesNotMatch(bare, /data-arena-part="grid"[^>]*\bdata-arena-centred=""/, 'and must not centre itself against nothing');

  const capped = <ArenaGrid maxWidth="var(--container-max)" />;
  assert.equal(decl(capped, 'max-width'), 'var(--container-max)', 'the ceiling is the consumer\'s string');
  assert.match(renderToStaticMarkup(capped), /data-arena-part="grid"[^>]*\bdata-arena-centred=""/,
    'a capped grid centres, or the ceiling reads as a left margin');
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
