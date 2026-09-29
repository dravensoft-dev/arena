import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { laidOut } from '../../../test/LaidOut.ts';
import { arenaPlotWidth } from '../../../DataVisuals.ts';
import { ArenaBarChart } from './ArenaBarChart.tsx';

afterEach(cleanup);

const LABELS = Array.from({ length: 11 }, (_, i) => `W${i + 1}`);
const VALUES = LABELS.map((_, i) => i + 1);

test('the first plot is laid out for the measured width, not the 600 px a server assumes', () => {
  const root = laidOut(390, () => mount(
    <ArenaBarChart label="Deploys" labels={LABELS} series={[{ label: 'Deploys', values: VALUES }]} minPointSpacing={40} />,
  ));
  const svg = root.querySelector('svg[role="img"]')!;
  assert.equal(Number(svg.getAttribute('width')), arenaPlotWidth(390, LABELS.length, 40),
    'the plot was laid out for 600 px and fit, so a phone painted it squeezed before it scrolled');
});
