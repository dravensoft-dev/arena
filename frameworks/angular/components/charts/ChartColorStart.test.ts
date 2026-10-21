import { useTestEnvironment } from '../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import type { Type } from '@angular/core';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart';
import { ArenaHorizontalBarChart } from './arena-horizontal-bar-chart/ArenaHorizontalBarChart';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart';
import { ArenaRadarChart } from './arena-radar-chart/ArenaRadarChart';
import { ArenaPyramidChart } from './arena-pyramid-chart/ArenaPyramidChart';
import { ArenaScatterChart } from './arena-scatter-chart/ArenaScatterChart';

const NUMBERS = (count: number) => Array.from({ length: count }, (_, i) => i + 1);

function render<T extends object>(component: Type<T>, inputs: Record<string, unknown>): string {
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  try {
    return (fixture.nativeElement as Element).outerHTML;
  } finally {
    fixture.destroy();
  }
}

function marks(html: string, attribute: 'fill' | 'stroke'): number[] {
  return [...html.matchAll(new RegExp(`${attribute}="var\\(--color-cat-(\\d)\\)"`, 'g'))].map((m) => Number(m[1]));
}

function swatches(html: string): number[] {
  return [...html.matchAll(/data-arena-color-id="(\d)"/g)].map((m) => Number(m[1]));
}

const ONE_CATEGORY = ['A'];
const four = () => NUMBERS(4).map((n) => ({ label: `S${n}`, values: [n * 10] }));

test('colorStart: a bar chart of four series starts at slot 6 and wraps to 1, on the bars and the swatches', () => {
  const html = render(ArenaBarChart, { label: 'Sales', labels: ONE_CATEGORY, series: four(), colorStart: 6 });
  assert.deepEqual(marks(html, 'fill'), [6, 7, 8, 1]);
  assert.deepEqual(swatches(html), [6, 7, 8, 1]);
});

test('colorStart: an explicit colorId and colorIds keep their slots under colorStart', () => {
  const two = render(ArenaBarChart, {
    label: 'Sales', labels: ONE_CATEGORY, colorStart: 3,
    series: [{ label: 'A', values: [1], colorId: 9 }, { label: 'B', values: [2] }],
  });
  assert.deepEqual(marks(two, 'fill'), [8, 4]);
  assert.deepEqual(swatches(two), [8, 4]);
  const ids = render(ArenaBarChart, {
    label: 'Sales', labels: ['A', 'B', 'C'], colorStart: 3,
    series: [{ label: 'A', values: [1, 2, 3], colorIds: [2] }],
  });
  assert.deepEqual(marks(ids, 'fill'), [2, 4, 5]);
});

test('colorStart: a stacked bar rotates its segments as the grouped bars do', () => {
  const html = render(ArenaBarChart, {
    label: 'Sales', labels: ONE_CATEGORY, stack: true, colorStart: 8,
    series: NUMBERS(2).map((n) => ({ label: `S${n}`, values: [n] })),
  });
  assert.deepEqual(marks(html, 'fill'), [8, 1]);
  assert.deepEqual(swatches(html), [8, 1]);
});

test('colorStart: a line chart of nine series without colorStart gives the ninth slot 1', () => {
  const series = NUMBERS(9).map((n) => ({ label: `S${n}`, values: [n, n + 1, n + 2] }));
  const html = render(ArenaLineChart, { label: 'Load', labels: ['a', 'b', 'c'], series });
  assert.deepEqual(marks(html, 'stroke'), [1, 2, 3, 4, 5, 6, 7, 8, 1]);
  assert.deepEqual(swatches(html), [1, 2, 3, 4, 5, 6, 7, 8, 1]);
});

test('colorStart: a horizontal bar chart starts at slot 7 and wraps, on the bars and the swatches', () => {
  const html = render(ArenaHorizontalBarChart, { label: 'Sales', labels: ONE_CATEGORY, series: four(), colorStart: 7 });
  assert.deepEqual(marks(html, 'fill'), [7, 8, 1, 2]);
  assert.deepEqual(swatches(html), [7, 8, 1, 2]);
});

test('colorStart: a radar chart starts at slot 7 and wraps, on the polygons and the swatches', () => {
  const series = NUMBERS(3).map((n) => ({ label: `S${n}`, values: [n, n + 1, n + 2] }));
  const html = render(ArenaRadarChart, { label: 'Skills', labels: ['a', 'b', 'c'], series, colorStart: 7 });
  assert.deepEqual(marks(html, 'stroke'), [7, 8, 1]);
  assert.deepEqual(swatches(html), [7, 8, 1]);
});

test('colorStart: a pyramid chart starts at slot 7 and wraps, on both sides and the swatches', () => {
  const html = render(ArenaPyramidChart, { label: 'Age', labels: ONE_CATEGORY, series: four().slice(0, 2), colorStart: 7 });
  assert.deepEqual(marks(html, 'fill'), [7, 8]);
  assert.deepEqual(swatches(html), [7, 8]);
});

test('colorStart: a scatter chart starts at slot 7 and wraps, on the marks and the swatches', () => {
  const series = NUMBERS(3).map((n) => ({ label: `S${n}`, x: [n], y: [n] }));
  const html = render(ArenaScatterChart, { label: 'Load', xLabel: 'Requests', yLabel: 'Latency', series, colorStart: 7 });
  assert.deepEqual(marks(html, 'fill'), [7, 8, 1]);
  assert.deepEqual(swatches(html), [7, 8, 1]);
});
