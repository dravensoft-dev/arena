import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaLineChart } from './ArenaLineChart.tsx';

const LABELS = ['Mon', 'Tue', 'Wed'];
const VALUES = [120, 138, 131];

test('ArenaLineChart appends valueSuffix to the axis ticks and to the accessible table', () => {
  const html = renderToStaticMarkup(
    <ArenaLineChart labels={LABELS} series={[{ label: 'p95', values: VALUES }]} label="p95" valueSuffix=" ms" />
  );

  const ticks = [...html.matchAll(/dz-text-2xs\)">([^<]*)</g)].map((m) => m[1] as string);
  assert.ok(ticks.length >= 2, `no axis ticks were drawn: ${JSON.stringify(ticks)}`);
  assert.ok(ticks.every((tick) => tick.endsWith(' ms')),
    `a tick was written without the suffix: ${JSON.stringify(ticks)}`);
  for (const v of VALUES) assert.match(html, new RegExp(`<td>${v} ms</td>`), `the ${v} row carries the suffix`);
});

test('ArenaLineChart with no valueSuffix draws bare numbers', () => {
  const html = renderToStaticMarkup(<ArenaLineChart label="p95 latency" labels={LABELS} series={[{ label: 'p95 latency', values: VALUES }]} />);
  for (const v of VALUES) assert.match(html, new RegExp(`<td>${v}</td>`));
  assert.doesNotMatch(html, /undefined/, 'an absent suffix must not render the string "undefined"');
});

test('ArenaLineChart throws when labels is absent, which required-ness demands of every layer', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaLineChart label="p95 latency" series={[{ label: 'p95 latency', values: VALUES }]} />), /ArenaLineChart: `labels` is required/);
});

test('ArenaLineChart throws when series is absent, which required-ness demands of every layer', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaLineChart label="p95 latency" labels={LABELS} />), /ArenaLineChart: `series` is required/);
});

test('ArenaLineChart draws the area fill only when area is set', () => {
  const withArea = renderToStaticMarkup(<ArenaLineChart label="p95 latency" labels={LABELS} series={[{ label: 'p95 latency', values: VALUES }]} area />);
  const without = renderToStaticMarkup(<ArenaLineChart label="p95 latency" labels={LABELS} series={[{ label: 'p95 latency', values: VALUES }]} />);
  assert.match(withArea, /color-mix\(in oklab, /, 'the 18% tint did not render');
  assert.doesNotMatch(without, /color-mix\(in oklab, /, 'the tint rendered without area being set');
});

test('ArenaLineChart drops a consumer style object and a consumer attribute, each independently', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaLineChart label="p95 latency" labels={LABELS} series={[{ label: 'p95 latency', values: VALUES }]} style={{ color: '#ff00ff' }} data-stray="x" />
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});

test('ArenaLineChart drops a label with no value at its index, rather than drawing it over empty plot', () => {
  const html = renderToStaticMarkup(
    <ArenaLineChart label="p95 latency" labels={['Alpha', 'Beta', 'SURPLUS']} series={[{ label: 'p95 latency', values: [10, 20] }]} />
  );
  assert.doesNotMatch(html, /SURPLUS/, 'a label with no value at its index reached the point axis');
  assert.match(html, />Alpha</);
  assert.match(html, />Beta</);
});

test('ArenaLineChart draws an empty label for a point with no label, rather than throwing or printing undefined', () => {
  const html = renderToStaticMarkup(<ArenaLineChart label="p95 latency" labels={['Only']} series={[{ label: 'p95 latency', values: [10, 20] }]} />);
  assert.doesNotMatch(html, /undefined/, 'a point with no label rendered the string "undefined"');
  assert.match(html, />Only</, 'the one supplied label still renders');
  assert.match(html, /<td>20<\/td>/, 'the unlabelled point is still plotted and still in the table');
});
