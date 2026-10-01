/* A chart measures an element of its own template and never its host, so a class a consumer puts
 * on <arena-bar-chart> that pads it sits outside the measured width and cannot push the plot past
 * the host. The doughnut's host was the flex row its plot and legend share, so its template gains
 * one wrapper that takes that layout over and the host keeps no box of its own. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { laidOut, SilentObserver } from './LaidOut';
import { ArenaBarChart } from '../components/charts/arena-bar-chart/ArenaBarChart';
import { ArenaDoughnutChart } from '../components/charts/arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaHorizontalBarChart } from '../components/charts/arena-horizontal-bar-chart/ArenaHorizontalBarChart';
import { ArenaLineChart } from '../components/charts/arena-line-chart/ArenaLineChart';
import { ArenaPyramidChart } from '../components/charts/arena-pyramid-chart/ArenaPyramidChart';
import { ArenaRadarChart } from '../components/charts/arena-radar-chart/ArenaRadarChart';
import { ArenaScatterChart } from '../components/charts/arena-scatter-chart/ArenaScatterChart';

const LABELS = ['Mon', 'Tue', 'Wed'];
const ONE = [{ label: 'Deploys', values: [3, 5, 4] }];
const TWO = [{ label: 'Left', values: [3, 5, 4] }, { label: 'Right', values: [4, 2, 6] }];
const POINTS = [{ label: 'Runs', x: [1, 2, 3], y: [3, 4, 2] }];

@Component({ selector: 'chart-box-bar', standalone: true, imports: [ArenaBarChart], template: '<arena-bar-chart label="Deploys" [labels]="labels" [series]="series" />' })
class BarHost { labels = LABELS; series = ONE; }

@Component({ selector: 'chart-box-doughnut', standalone: true, imports: [ArenaDoughnutChart], template: '<arena-doughnut-chart label="Deploys" [labels]="labels" [series]="series" />' })
class DoughnutHost { labels = LABELS; series = ONE; }

@Component({ selector: 'chart-box-horizontal-bar', standalone: true, imports: [ArenaHorizontalBarChart], template: '<arena-horizontal-bar-chart label="Deploys" [labels]="labels" [series]="series" />' })
class HorizontalBarHost { labels = LABELS; series = ONE; }

@Component({ selector: 'chart-box-line', standalone: true, imports: [ArenaLineChart], template: '<arena-line-chart label="Deploys" [labels]="labels" [series]="series" />' })
class LineHost { labels = LABELS; series = ONE; }

@Component({ selector: 'chart-box-pyramid', standalone: true, imports: [ArenaPyramidChart], template: '<arena-pyramid-chart label="Deploys" [labels]="labels" [series]="series" />' })
class PyramidHost { labels = LABELS; series = TWO; }

@Component({ selector: 'chart-box-radar', standalone: true, imports: [ArenaRadarChart], template: '<arena-radar-chart label="Deploys" [labels]="labels" [series]="series" />' })
class RadarHost { labels = LABELS; series = ONE; }

@Component({ selector: 'chart-box-scatter', standalone: true, imports: [ArenaScatterChart], template: '<arena-scatter-chart label="Runs" xLabel="Hour" yLabel="Count" [series]="series" />' })
class ScatterHost { series = POINTS; }

const CHARTS: Array<[string, Type<unknown>]> = [
  ['arena-bar-chart', BarHost], ['arena-doughnut-chart', DoughnutHost],
  ['arena-horizontal-bar-chart', HorizontalBarHost], ['arena-line-chart', LineHost],
  ['arena-pyramid-chart', PyramidHost], ['arena-radar-chart', RadarHost], ['arena-scatter-chart', ScatterHost],
];

for (const [selector, host] of CHARTS) {
  test(`${selector} measures an element of its own template, never its host`, () => {
    laidOut(600, () => {
      const fixture = TestBed.createComponent(host);
      try {
        fixture.autoDetectChanges();
        TestBed.tick();
        const chart = (fixture.nativeElement as Element).querySelector(selector)!;
        const observed = SilentObserver.made.flatMap((one) => one.observed);
        assert.equal(observed.length, 1, `${selector} observed ${observed.length} elements`);
        assert.notEqual(observed[0], chart, `${selector} measures its host, so a consumer class that pads it moves the plot`);
        assert.ok(chart.contains(observed[0]!), `${selector} measures an element outside itself`);
      } finally {
        fixture.destroy();
      }
    });
  });
}

test('the doughnut host keeps no box of its own, so a consumer class on it styles nothing the plot reads', () => {
  const fixture = TestBed.createComponent(DoughnutHost);
  try {
    fixture.detectChanges();
    const chart = (fixture.nativeElement as Element).querySelector('arena-doughnut-chart') as HTMLElement;
    assert.equal(chart.style.display, 'contents');
  } finally {
    fixture.destroy();
  }
});
