import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaDoughnutChart } from './ArenaDoughnutChart.tsx';

const LABELS = ['Web', 'API', 'Worker'];
const VALUES = [420, 310, 140];

test('ArenaDoughnutChart appends valueSuffix to the legend value and to the accessible table', () => {
  const html = renderToStaticMarkup(
    <ArenaDoughnutChart label="Traffic by region" labels={LABELS} series={[{ label: 'Traffic by region', values: VALUES }]} valueSuffix=" rps" />
  );
  for (const v of VALUES) {
    assert.match(html, new RegExp(`<td>${v} rps</td>`), `the ${v} table row carries the suffix`);

    assert.equal((html.match(new RegExp(`${v} rps`, 'g')) ?? []).length, 2, `${v} should appear in both the legend and the table`);
  }
});

test('ArenaDoughnutChart does not append valueSuffix to anything that is not a plotted value', () => {
  const html = renderToStaticMarkup(
    <ArenaDoughnutChart label="Traffic by region" labels={LABELS} series={[{ label: 'Traffic by region', values: VALUES }]} valueSuffix=" rps" />
  );

  assert.equal((html.match(/ rps/g) ?? []).length, 6);
});

test('ArenaDoughnutChart with no valueSuffix draws bare numbers, so the suffix is genuinely optional', () => {
  const html = renderToStaticMarkup(<ArenaDoughnutChart label="Traffic by region" labels={LABELS} series={[{ label: 'Traffic by region', values: VALUES }]} />);
  for (const v of VALUES) assert.match(html, new RegExp(`<td>${v}</td>`));
  assert.doesNotMatch(html, /undefined/, 'an absent suffix must not render the string "undefined"');
});

test('ArenaDoughnutChart names itself from label', () => {
  const named = renderToStaticMarkup(
    <ArenaDoughnutChart labels={LABELS} series={[{ label: 'Traffic', values: VALUES }]} label="Traffic" />
  );
  assert.match(named, /aria-label="Traffic — doughnut chart"/);
  assert.match(named, /<caption>Traffic — doughnut chart<\/caption>/);
});

test('ArenaDoughnutChart throws when labels is absent, which required-ness demands of every layer', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaDoughnutChart label="Traffic by region" series={[{ label: 'Traffic by region', values: VALUES }]} />), /ArenaDoughnutChart: `labels` is required/);
});

test('ArenaDoughnutChart throws when series is absent, which required-ness demands of every layer', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaDoughnutChart label="Traffic by region" labels={LABELS} />), /ArenaDoughnutChart: `series` is required/);
});

test('ArenaDoughnutChart drops a consumer style object and a consumer attribute, each independently', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaDoughnutChart label="Traffic by region" labels={LABELS} series={[{ label: 'Traffic by region', values: VALUES }]} style={{ color: '#ff00ff' }} data-stray="x" />
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- the {...rest} escape is back');
});

test('ArenaDoughnutChart drops a label with no value at its index, rather than drawing a colourless swatch beside "undefined"', () => {
  const html = renderToStaticMarkup(
    <ArenaDoughnutChart label="Traffic by region" labels={['Alpha', 'Beta', 'SURPLUS']} series={[{ label: 'Traffic by region', values: [10, 20] }]} valueSuffix=" rps" />
  );
  assert.doesNotMatch(html, /SURPLUS/, 'a label with no value at its index reached the legend');
  assert.doesNotMatch(html, /undefined/, 'the surplus legend row printed "undefined" as its value');
  assert.match(html, />Alpha</);
  assert.match(html, />Beta</);
});

test('ArenaDoughnutChart draws an empty label for a slice with no label, rather than throwing or printing undefined', () => {
  const html = renderToStaticMarkup(<ArenaDoughnutChart label="Traffic by region" labels={['Only']} series={[{ label: 'Traffic by region', values: [10, 20] }]} />);
  assert.doesNotMatch(html, /undefined/, 'a slice with no label rendered the string "undefined"');
  assert.match(html, />Only</, 'the one supplied label still renders');
  assert.match(html, /<td>20<\/td>/, 'the unlabelled slice is still plotted and still in the table');
});
