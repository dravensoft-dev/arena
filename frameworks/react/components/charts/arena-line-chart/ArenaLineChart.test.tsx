import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaLineChart } from './ArenaLineChart.tsx';

const LABELS = ['Mon', 'Tue', 'Wed'];
const VALUES = [120, 138, 131];

test('ArenaLineChart draws the area fill only when area is set', () => {
  const withArea = renderToStaticMarkup(<ArenaLineChart label="p95 latency" labels={LABELS} series={[{ label: 'p95 latency', values: VALUES }]} area />);
  const without = renderToStaticMarkup(<ArenaLineChart label="p95 latency" labels={LABELS} series={[{ label: 'p95 latency', values: VALUES }]} />);
  assert.match(withArea, /color-mix\(in oklab, /, 'the 18% tint did not render');
  assert.doesNotMatch(without, /color-mix\(in oklab, /, 'the tint rendered without area being set');
});
