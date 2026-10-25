import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { chartSparklineHeight } from '../../../Tokens.generated.js';
import { ArenaSparkline } from './ArenaSparkline.tsx';

const LABELS = ['Mon', 'Tue', 'Wed'];
const VALUES = [120, 180, 150];
const SERIES = [{ label: 'p95', values: VALUES }];

function captureWarnings(body: () => void): string[] {
  const captured: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  try { body(); } finally { console.warn = original; }
  return captured;
}

const tall = (html: string) => {
  const [, property, px] = /style="(\w+):(\d+)px"/.exec(html) ?? [];
  assert.equal(property, 'height', 'the frame\'s only inline property is its height');
  return Number(px);
};

const ys = (html: string) => [...html.matchAll(/<polyline points="([^"]*)"/g)]
  .flatMap((m) => (m[1] as string).split(' ').map((pair) => Number(pair.split(',')[1])));

test('ArenaSparkline is the sparkline height token tall by default, and the height member overrides it', () => {
  assert.equal(chartSparklineHeight, 20, 'the token is the compact row\'s line box');
  assert.equal(tall(renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} />)), chartSparklineHeight);
  assert.equal(tall(renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} height={32} />)), 32);
});

test('ArenaSparkline spans its box with the data\'s own range, so the lowest value sits on the floor and the highest on the ceiling', () => {
  const points = ys(renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} />));
  assert.deepEqual(points, [16, 4, 10], 'with a zero-based scale 120 to 180 would sit in a strip at the top of the box');
});

test('ArenaSparkline appends valueSuffix to every number of the accessible table', () => {
  const html = renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} valueSuffix=" ms" />);
  for (const v of VALUES) assert.match(html, new RegExp(`<td>${v} ms</td>`), `the ${v} row carries the suffix`);
});

test('ArenaSparkline draws one end dot at the point radius, and no marker for the minimum or the maximum', () => {
  const html = renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} />);
  const circles = [...html.matchAll(/<circle [^>]*>/g)].map((m) => m[0]);
  assert.equal(circles.length, 1, 'one dot says where now is');
  assert.match(circles[0] as string, /r="4"/);
  assert.match(circles[0] as string, /cy="10"/, 'the dot is on the last point');
});

test('ArenaSparkline draws no axis, no tick, no label and no legend', () => {
  const html = renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} />);
  assert.doesNotMatch(html, /<text/, 'no text is drawn in the plot');
  assert.doesNotMatch(html, /<line/, 'no axis and no gridline at rest');
  assert.doesNotMatch(html, /legend/);
});

test('ArenaSparkline draws the area fill only when area is set, down to the floor of the box', () => {
  const withArea = renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} area />);
  const without = renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} />);
  assert.match(withArea, /color-mix\(in oklab, /, 'the 18% tint did not render');
  assert.match(withArea, /<path d="[^"]*L[^"]*,16 [^"]*Z"/, 'the fill closes on the floor, which is the lowest value');
  assert.doesNotMatch(without, /color-mix\(in oklab, /, 'the tint rendered without area being set');
});

test('ArenaSparkline is a static figure by default: no tab stop, no keyboard region, no overlay', () => {
  const html = renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} />);
  assert.doesNotMatch(html, /tabindex/);
  assert.doesNotMatch(html, /role="group"/);
  assert.doesNotMatch(html, /<rect/);
  const live = renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} interactive />);
  assert.match(live, /tabindex="0" role="group" aria-label="p95 — sparkline"/);
});

test('ArenaSparkline takes the tone as its colour and the first identity slot otherwise', () => {
  assert.match(renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={[{ ...SERIES[0]!, tone: 'danger' }]} />), /stroke="var\(--danger\)"/);
  assert.match(renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={SERIES} />), /stroke="var\(--color-cat-1\)"/);
});

test('ArenaSparkline draws the first series and warns about a second, rather than drawing two lines with no legend', () => {
  forgetArenaWarnings();
  let html = '';
  const warnings = captureWarnings(() => {
    html = renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} series={[...SERIES, { label: 'p50', values: [1, 2, 3] }]} />);
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] as string, /ArenaSparkline: reads one series and was given 2\. A sparkline has no legend/);
  assert.equal([...html.matchAll(/<polyline/g)].length, 1);
  assert.doesNotMatch(html, /p50/, 'the ignored series reaches neither the plot nor the table');
  forgetArenaWarnings();
});

test('ArenaSparkline drops a label with no value at its index, and writes an empty header for a value with no label', () => {
  const surplus = renderToStaticMarkup(<ArenaSparkline label="p95" labels={['Alpha', 'Beta', 'SURPLUS']} series={[{ label: 'p95', values: [10, 20] }]} />);
  assert.doesNotMatch(surplus, /SURPLUS/);
  const short = renderToStaticMarkup(<ArenaSparkline label="p95" labels={['Only']} series={[{ label: 'p95', values: [10, 20] }]} />);
  assert.doesNotMatch(short, /undefined/);
  assert.match(short, /<td>20<\/td>/, 'the unlabelled point is still plotted and still in the table');
});

test('ArenaSparkline throws when label, labels or series is absent, which required-ness demands of every layer', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaSparkline labels={LABELS} series={SERIES} />), /ArenaSparkline: `label` is required/);
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaSparkline label="p95" series={SERIES} />), /ArenaSparkline: `labels` is required/);
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaSparkline label="p95" labels={LABELS} />), /ArenaSparkline: `series` is required/);
});

test('ArenaSparkline drops a consumer style object and a consumer attribute, each independently', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaSparkline label="p95" labels={LABELS} series={SERIES} style={{ color: '#ff00ff' }} data-stray="x" />
  );
  assert.doesNotMatch(html, /#ff00ff/);
  assert.doesNotMatch(html, /data-stray/);
});
