import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaBarChart } from './ArenaBarChart.tsx';
import { arenaPointSeriesColor, arenaSeriesColors } from '../ChartSeries.ts';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';

const LABELS = ['Mon', 'Tue', 'Wed'];
const VALUES = [12, 30, 7];

test('ArenaBarChart appends valueSuffix to the axis ticks and to the accessible table', () => {
  const html = renderToStaticMarkup(
    <ArenaBarChart labels={LABELS} series={[{ label: 'Deploys', values: VALUES }]} label="Deploys" valueSuffix=" ms" />
  );

  const ticks = [...html.matchAll(/dz-text-2xs\)">([^<]*)</g)].map((m) => m[1] as string);
  assert.ok(ticks.length >= 2, `no axis ticks were drawn: ${JSON.stringify(ticks)}`);
  assert.ok(ticks.every((tick) => tick.endsWith(' ms')),
    `a tick was written without the suffix: ${JSON.stringify(ticks)}`);

  for (const v of VALUES) assert.match(html, new RegExp(`<td>${v} ms</td>`), `the ${v} row carries the suffix`);
});

test('ArenaBarChart with no valueSuffix draws bare numbers, so the suffix is genuinely optional', () => {
  const html = renderToStaticMarkup(<ArenaBarChart label="Deployments per week" labels={LABELS} series={[{ label: 'Deployments per week', values: VALUES }]} />);
  for (const v of VALUES) assert.match(html, new RegExp(`<td>${v}</td>`));
  assert.doesNotMatch(html, /undefined/, 'an absent suffix must not render the string "undefined"');
});

test('ArenaBarChart throws when labels is absent, which required-ness demands of every layer', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaBarChart label="Deployments per week" series={[{ label: 'Deployments per week', values: VALUES }]} />),
    /ArenaBarChart: `labels` is required/,
  );
});

test('ArenaBarChart throws when series is absent, which required-ness demands of every layer', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaBarChart label="Deployments per week" labels={LABELS} />),
    /ArenaBarChart: `series` is required/,
  );
});

test('ArenaBarChart drops a consumer style object and a consumer attribute, each independently', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaBarChart label="Deployments per week" labels={LABELS} series={[{ label: 'Deployments per week', values: VALUES }]} style={{ color: '#ff00ff' }} data-stray="x" />
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});

test('ArenaBarChart drops a label with no value at its index, rather than drawing it over empty plot', () => {
  const html = renderToStaticMarkup(
    <ArenaBarChart label="Deployments per week" labels={['Alpha', 'Beta', 'SURPLUS']} series={[{ label: 'Deployments per week', values: [10, 20] }]} />
  );
  assert.doesNotMatch(html, /SURPLUS/, 'a label with no value at its index reached the category axis');

  assert.match(html, />Alpha</);
  assert.match(html, />Beta</);
});

test('ArenaBarChart draws an empty label for a bar with no label, rather than throwing or printing undefined', () => {
  const html = renderToStaticMarkup(<ArenaBarChart label="Deployments per week" labels={['Only']} series={[{ label: 'Deployments per week', values: [10, 20] }]} />);
  assert.doesNotMatch(html, /undefined/, 'a bar with no label rendered the string "undefined"');
  assert.match(html, />Only</, 'the one supplied label still renders');
  assert.match(html, /<td>20<\/td>/, 'the unlabelled bar is still plotted and still in the table');
});

const STACKED = [
  { label: 'Web', values: [10, 5, -4] },
  { label: 'API', values: [20, -8, -6] },
  { label: 'Jobs', values: [30, 2, 1] },
];

function bars(html: string): string[] {
  return [...html.matchAll(/ d="(M[^"]*)"/g)].map((m) => m[1] as string);
}

function xOf(path: string): string {
  return (/^M([\d.]+),/.exec(path)?.[1]) ?? '';
}

function rounded(path: string): boolean {
  const m = /L[\d.-]+,([\d.-]+) Q[\d.-]+,([\d.-]+)/.exec(path);
  return m ? m[1] !== m[2] : false;
}

test('stacked series share one band per category, where grouped ones split it between them', () => {
  const stacked = bars(renderToStaticMarkup(
    <ArenaBarChart label="Load" labels={LABELS} series={STACKED} stack />,
  ));
  const grouped = bars(renderToStaticMarkup(
    <ArenaBarChart label="Load" labels={LABELS} series={STACKED} />,
  ));
  assert.equal(new Set(stacked.map(xOf)).size, 3, 'three categories, so three x positions and no more');
  assert.equal(new Set(grouped.map(xOf)).size, 9, 'grouped bars each get their own sub-band');
});

test('a stack rounds one end per direction and leaves every joint inside the bar square', () => {

  const paths = bars(renderToStaticMarkup(
    <ArenaBarChart label="Load" labels={LABELS} series={STACKED} stack />,
  ));
  assert.equal(paths.filter(rounded).length, 5,
    'one rounded end for the all-positive category and two for each mixed one, where the run ends');
  assert.equal(paths.filter((p) => !rounded(p)).length, 4, 'every other segment is a joint and reads as one');
});

function topTick(html: string): number {
  return Math.max(...[...html.matchAll(/dz-text-2xs\)">(-?[\d.]+)</g)].map((m) => Number(m[1])));
}

test('a stacked axis is sized by the totals, so the tallest bar fits inside the plot', () => {

  const stacked = topTick(renderToStaticMarkup(<ArenaBarChart label="Load" labels={LABELS} series={STACKED} stack />));
  const grouped = topTick(renderToStaticMarkup(<ArenaBarChart label="Load" labels={LABELS} series={STACKED} />));
  assert.ok(stacked >= 60, `the tallest category totals 60 and the axis reached only ${stacked}`);
  assert.ok(grouped < 60, `grouped bars never need that much room, and this one asked for ${grouped}`);
});

test('a stacked axis holds the downward total too, so a mixed category is not clipped', () => {

  const html = renderToStaticMarkup(<ArenaBarChart label="Load" labels={LABELS} series={STACKED} stack />);
  const floor = Math.min(...[...html.matchAll(/dz-text-2xs\)">(-?[\d.]+)</g)].map((m) => Number(m[1])));
  assert.ok(floor <= -10, `the deepest category sums to -10 downward and the axis reached only ${floor}`);
});

test('a stack still names every series in the accessible table, which the segments cannot', () => {
  const html = renderToStaticMarkup(<ArenaBarChart label="Load" labels={LABELS} series={STACKED} stack />);
  for (const one of STACKED) assert.match(html, new RegExp(`<th>${one.label}</th>`), `${one.label} lost its column`);
  assert.match(html, /<td>-8<\/td>/, 'a negative segment is still its own number in the table');
});

test('the tone and colorId warning names the chart that drew it, so a second chart is heard too', () => {
  forgetArenaWarnings();
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };
  try {
    renderToStaticMarkup(<ArenaBarChart label="Deploys" labels={LABELS} series={[{ label: 'Deploys', values: VALUES, tone: 'danger', colorId: 3 }]} />);
    arenaSeriesColors({ label: 'Trend', values: VALUES, tone: 'danger', colorId: 3 }, 1, 1, 'ArenaSparkline');
    arenaPointSeriesColor({ label: 'Cloud', x: [], y: [], tone: 'danger', colorId: 3 }, 1, 'ArenaScatterChart');
  } finally { console.warn = original; }
  forgetArenaWarnings();
  assert.deepEqual(warnings.map((line) => /^\[arena\] (\w+):/.exec(line)?.[1]), ['ArenaBarChart', 'ArenaSparkline', 'ArenaScatterChart']);
});
