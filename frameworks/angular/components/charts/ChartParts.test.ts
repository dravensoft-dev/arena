/* A chart's legend and tooltip are drawn from its manifest: each part carries its manifest part
 * name and a class, and the inline style holds only what the render computes. The legend item's
 * gap and the tooltip's padding and background come from the manifest, never from inline style. */

import { useTestEnvironment } from '../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaBarChart } from './arena-bar-chart/ArenaBarChart';
import { ArenaDoughnutChart } from './arena-doughnut-chart/ArenaDoughnutChart';
import { ArenaHorizontalBarChart } from './arena-horizontal-bar-chart/ArenaHorizontalBarChart';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart';
import { ArenaPyramidChart } from './arena-pyramid-chart/ArenaPyramidChart';
import { ArenaRadarChart } from './arena-radar-chart/ArenaRadarChart';
import { ArenaScatterChart } from './arena-scatter-chart/ArenaScatterChart';

const LABELS = ['Mon', 'Tue', 'Wed'];
const SERIES = [{ label: 'Left', values: [3, 5, 4] }, { label: 'Right', values: [4, 2, 6] }];
const POINTS = [{ label: 'Runs', x: [1, 2, 3], y: [3, 4, 2] }, { label: 'Fails', x: [1, 2, 3], y: [1, 2, 1] }];

@Component({ standalone: true, imports: [ArenaBarChart], template: '<arena-bar-chart label="Deploys" [labels]="labels" [series]="series" />' })
class BarHost { labels = LABELS; series = SERIES; }

@Component({ standalone: true, imports: [ArenaDoughnutChart], template: '<arena-doughnut-chart label="Deploys" [labels]="labels" [series]="series" />' })
class DoughnutHost { labels = LABELS; series = [SERIES[0]]; }

@Component({ standalone: true, imports: [ArenaHorizontalBarChart], template: '<arena-horizontal-bar-chart label="Deploys" [labels]="labels" [series]="series" />' })
class HorizontalBarHost { labels = LABELS; series = SERIES; }

@Component({ standalone: true, imports: [ArenaLineChart], template: '<arena-line-chart label="Deploys" [labels]="labels" [series]="series" />' })
class LineHost { labels = LABELS; series = SERIES; }

@Component({ standalone: true, imports: [ArenaPyramidChart], template: '<arena-pyramid-chart label="Deploys" [labels]="labels" [series]="series" />' })
class PyramidHost { labels = LABELS; series = SERIES; }

@Component({ standalone: true, imports: [ArenaRadarChart], template: '<arena-radar-chart label="Deploys" [labels]="labels" [series]="series" />' })
class RadarHost { labels = LABELS; series = SERIES; }

@Component({ standalone: true, imports: [ArenaScatterChart], template: '<arena-scatter-chart label="Runs" xLabel="Hour" yLabel="Count" [series]="series" />' })
class ScatterHost { series = POINTS; }

const CHARTS: Array<[string, string, Type<unknown>]> = [
  ['bar-chart', 'Arena bar', BarHost], ['horizontal-bar-chart', 'Arena horizontal bar', HorizontalBarHost],
  ['line-chart', 'Arena line', LineHost], ['pyramid-chart', 'Arena pyramid', PyramidHost],
  ['radar-chart', 'Arena radar', RadarHost], ['scatter-chart', 'Arena scatter', ScatterHost],
];

for (const [name, , host] of CHARTS) {
  test(`${name} draws its legend item and tooltip from the manifest`, () => {
    const fixture = TestBed.createComponent(host);
    try {
      fixture.autoDetectChanges();
      TestBed.tick();
      const root = fixture.nativeElement as HTMLElement;
      const item = root.querySelector<HTMLElement>(`[data-arena-part="${name}.legend-item"]`);
      assert.ok(item, `no legend item carries the part ${name}.legend-item`);
      assert.ok(item.className.includes('__legend-item'), 'the legend item carries no manifest class');
      assert.equal(item.style.gap, '', 'the legend item still sets its gap inline');

      root.querySelector('[role="group"][tabindex]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      fixture.detectChanges();
      TestBed.tick();
      const tooltip = root.querySelector<HTMLElement>(`[data-arena-part="${name}.tooltip"]`);
      assert.ok(tooltip, `no tooltip carries the part ${name}.tooltip after the cursor moved`);
      assert.ok(tooltip.className.includes('__tooltip'), 'the tooltip carries no manifest class');
      assert.equal(tooltip.style.padding, '', 'the tooltip still sets its padding inline');
      assert.equal(tooltip.style.background, '', 'the tooltip still sets its background inline');
    } finally {
      fixture.destroy();
    }
  });
}

test('doughnut-chart draws its legend row from the manifest', () => {
  const fixture = TestBed.createComponent(DoughnutHost);
  try {
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-arena-part="doughnut-chart.legend-row"]');
    assert.ok(row, 'no legend row carries the part doughnut-chart.legend-row');
    assert.ok(row.className.includes('__legend-row'), 'the legend row carries no manifest class');
    assert.equal(row.style.gap, '', 'the legend row still sets its gap inline');
  } finally {
    fixture.destroy();
  }
});
