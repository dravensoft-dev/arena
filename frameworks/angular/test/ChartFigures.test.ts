/* A chart's legend can carry two different things, and the specification sets them in two
 * different faces: a series NAME is body-set, and a FIGURE is mono like every other number in
 * the system. The two lived one shared style constant apart, and the size key of a scatter
 * reached for the name's, so its samples rendered in the reading face, a hair smaller, and the
 * bubbles beside them moved to follow. Nothing caught it, because no gate reads a font family.
 * happy-dom has no layout, so what is pinned here is the declaration rather than the render:
 * these are inline style objects, so the attribute is on the element and is the whole decision.
 * Own text nodes only, because a legend entry wraps its swatch and its figure in one span and a
 * wrapper is not where the face is declared. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaScatterChart } from '../components/charts/arena-scatter-chart/ArenaScatterChart';
import { ArenaBarChart } from '../components/charts/arena-bar-chart/ArenaBarChart';
import { ArenaLineChart } from '../components/charts/arena-line-chart/ArenaLineChart';
import { ArenaDoughnutChart } from '../components/charts/arena-doughnut-chart/ArenaDoughnutChart';
import type { ArenaPointSeries, ArenaSeries } from '../Api.generated';

const MONO = 'var(--font-mono)';

@Component({
  standalone: true,
  imports: [ArenaScatterChart],
  template: `<arena-scatter-chart label="Latency against load" xLabel="Load" yLabel="Latency"
    [series]="series" sizeLegend />`,
})
class ScatterHost {
  readonly series: readonly ArenaPointSeries[] = [{
    label: 'eu-west', x: [1, 2, 3], y: [10, 20, 30], r: [90, 305, 520],
  }];
}

@Component({
  standalone: true,
  imports: [ArenaDoughnutChart],
  template: `<arena-doughnut-chart label="Nodes by state" [labels]="labels" [series]="series" />`,
})
class DoughnutHost {
  readonly labels = ['Healthy', 'Degraded'];
  readonly series: readonly ArenaSeries[] = [{ label: 'Nodes', values: [12, 2] }];
}

@Component({
  standalone: true,
  imports: [ArenaBarChart, ArenaLineChart, ArenaScatterChart],
  template: `<arena-bar-chart label="Units by product" [labels]="labels" [series]="series" />
    <arena-line-chart label="Units by month" [labels]="labels" [series]="series" />
    <arena-scatter-chart label="Latency against load" xLabel="Load" yLabel="Latency" [series]="points" />`,
})
class AxisHost {
  readonly labels = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];
  readonly series: readonly ArenaSeries[] = [{ label: 'Units', values: [3, 8, 5, 12, 7] }];
  readonly points: readonly ArenaPointSeries[] = [{ label: 'eu-west', x: [1, 2, 3, 4, 5], y: [10, 20, 30, 25, 40] }];
}

function figures(root: HTMLElement) {
  return [...root.querySelectorAll('span')].filter((el) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join('').trim();
    return own !== '' && /^[\d.,%\s–-]+$/.test(own);
  });
}

test("a scatter's size key sets its samples in mono, not in the series name's face", () => {
  const fixture = TestBed.createComponent(ScatterHost);
  fixture.detectChanges();
  const found = figures(fixture.nativeElement as HTMLElement);
  assert.ok(found.length > 0, 'no figure rendered in the size key -- the guard would check nothing');
  for (const el of found) {
    assert.equal(
      (el as HTMLElement).style.fontFamily, MONO,
      `the size key renders "${el.textContent?.trim()}" in ${(el as HTMLElement).style.fontFamily || 'no declared family'}. `
      + 'A figure is mono everywhere in the system, and the body face is both a different face and a '
      + 'different width, so reaching for the series label style moves every sample bubble beside it.',
    );
  }
  fixture.destroy();
});

test("a doughnut's legend sets its counts in mono", () => {
  const fixture = TestBed.createComponent(DoughnutHost);
  fixture.detectChanges();
  const found = figures(fixture.nativeElement as HTMLElement);
  assert.ok(found.length > 0, 'no figure rendered in the legend -- the guard would check nothing');
  for (const el of found) {
    assert.equal((el as HTMLElement).style.fontFamily, MONO,
      `the legend renders the count "${el.textContent?.trim()}" in ${(el as HTMLElement).style.fontFamily || 'no declared family'}`);
  }
  fixture.destroy();
});

test('every label on a bottom axis is centred on the mark it names, in all three that draw one', () => {
  const fixture = TestBed.createComponent(AxisHost);
  fixture.detectChanges();
  const plots = [...(fixture.nativeElement as HTMLElement).querySelectorAll('svg')];
  assert.equal(plots.length, 3, 'the host draws one plot per chart');
  for (const plot of plots) {
    const texts = [...plot.querySelectorAll('text')];
    const floor = Math.max(...texts.map((at) => Number(at.getAttribute('y') ?? Number.NaN)));
    const bottom = texts.filter((at) => Number(at.getAttribute('y')) === floor);
    assert.ok(bottom.length > 1, 'a bottom axis with one label is not an axis');
    assert.deepEqual([...new Set(bottom.map((at) => at.getAttribute('text-anchor')))], ['middle'],
      'a label clamped to start or end sits beside the mark it names rather than over it, and the '
      + 'reader takes it for the neighbour: the overhang at either end is the price, and it is the '
      + 'one the horizontal bar and the pyramid already pay on the same edge');
  }
});
