import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaDoughnutChart } from './ArenaDoughnutChart.tsx';

const LABELS = ['Web', 'API', 'Worker'];
const VALUES = [420, 310, 140];

test('ArenaDoughnutChart does not append valueSuffix to anything that is not a plotted value', () => {
  const html = renderToStaticMarkup(
    <ArenaDoughnutChart label="Traffic by region" labels={LABELS} series={[{ label: 'Traffic by region', values: VALUES }]} valueSuffix=" rps" />
  );

  assert.equal((html.match(/ rps/g) ?? []).length, 6);
});

test('ArenaDoughnutChart names itself from label', () => {
  const named = renderToStaticMarkup(
    <ArenaDoughnutChart labels={LABELS} series={[{ label: 'Traffic', values: VALUES }]} label="Traffic" />
  );
  assert.match(named, /aria-label="Traffic — doughnut chart"/);
  assert.match(named, /<caption>Traffic — doughnut chart<\/caption>/);
});
