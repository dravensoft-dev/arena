import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaHorizontalBarChart } from './ArenaHorizontalBarChart.tsx';
import { chartPadCategory } from '../../../Tokens.generated.js';

function rectAttributes(box: Record<string, number>): string {
  return Object.entries(box).map(([name, value]) => `${name}="${value}"`).join(' ');
}

const LONG_NAME = 'Quarterly revenue from the northern area';

test('ArenaHorizontalBarChart clips a long category name at its gutter and keeps the full name in a title', () => {
  assert.equal(LONG_NAME.length, 40, 'the case draws a category of exactly 40 characters');
  const html = renderToStaticMarkup(
    <ArenaHorizontalBarChart label="Revenue" labels={[LONG_NAME, 'Short']} series={[{ label: 'Revenue', values: [30, 12] }]} />,
  );

  const clipped = /<g clip-path="url\(#([^)]+)\)">/.exec(html);
  assert.notEqual(clipped, null, 'the category labels sit in a group clipped by a clip path');
  const id = clipped?.[1] as string;

  const found = new RegExp(`<clipPath id="${id}"><rect ([^>]*)></rect></clipPath>`).exec(html);
  assert.notEqual(found, null, `a clipPath with id ${id} holds the gutter rectangle`);
  const height = /height="(\d+)"/.exec(found?.[1] ?? '')?.[1];
  assert.equal(found?.[1], rectAttributes({ x: 0, y: 0, width: chartPadCategory, height: Number(height) }),
    'the rectangle runs from the start edge to the plot, the gutter wide');

  const group = /<g clip-path="[^"]*">(.*?)<\/g>/.exec(html)?.[1] ?? '';
  const titles = [...group.matchAll(/<title>([^<]*)<\/title>/g)].map((match) => match[1]);
  assert.deepEqual(titles, [LONG_NAME, 'Short'], 'each label carries its full name as a title');
});

test('ArenaHorizontalBarChart gives each instance its own gutter clip id', () => {
  const draw = () => (
    <ArenaHorizontalBarChart label="Revenue" labels={['A']} series={[{ label: 'Revenue', values: [1] }]} />
  );
  const html = renderToStaticMarkup(<div>{draw()}{draw()}</div>);
  const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
});
