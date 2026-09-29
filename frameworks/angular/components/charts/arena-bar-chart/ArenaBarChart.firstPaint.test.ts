import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { laidOut } from '../../../test/LaidOut';
import { arenaPlotWidth } from '../../../DataVisuals';
import { ArenaBarChart } from './ArenaBarChart';

const LABELS = Array.from({ length: 11 }, (_, i) => `W${i + 1}`);

@Component({
  standalone: true,
  imports: [ArenaBarChart],
  template: `<arena-bar-chart label="Deploys" [labels]="labels" [series]="series" [minPointSpacing]="40" />`,
})
class ChartHost {
  labels = LABELS;
  series = [{ label: 'Deploys', values: LABELS.map((_, i) => i + 1) }];
}

test('the first plot is laid out for the measured width, not the 600 px a server assumes', () => {
  const width = laidOut(390, () => {
    const fixture = TestBed.createComponent(ChartHost);
    try {
      fixture.autoDetectChanges();
      TestBed.tick();
      return (fixture.nativeElement as Element).querySelector('svg[role="img"]')!.getAttribute('width');
    } finally {
      fixture.destroy();
    }
  });
  assert.equal(Number(width), arenaPlotWidth(390, LABELS.length, 40),
    'the plot was laid out for 600 px and fit, so a phone painted it squeezed before it scrolled');
});
