/* `minPointSpacing` is the member that lets a chart refuse to compress. The width it computes is
 * pure arithmetic and is asserted directly; what a suite cannot see is the scroll position, since
 * happy-dom lays nothing out, so scrollWidth is zero and the anchor-to-the-right effect has
 * nothing to measure. That half is on the by-hand list in the prompt. */

import { useTestEnvironment } from '../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { arenaPlotWidth, ARENA_PAD } from '../../DataVisuals';
import { ArenaLineChart } from './arena-line-chart/ArenaLineChart';

test('with no minPointSpacing the plot is exactly the width it was given', () => {
  assert.equal(arenaPlotWidth(390, 30, undefined), 390);
  assert.equal(arenaPlotWidth(390, 30, 0), 390, 'and zero is not a spacing, it is an absence');
});

test('above the floor the plot still fits, because the rule is a MINIMUM and not a step', () => {
  assert.equal(arenaPlotWidth(1200, 5, 35), 1200);
});

test('below the floor the plot outgrows its box by exactly what the gaps need', () => {
  assert.equal(arenaPlotWidth(390, 30, 35), ARENA_PAD.l + ARENA_PAD.r + 35 * 29);
});

test('one point cannot be too close to anything, so nothing overflows', () => {
  assert.equal(arenaPlotWidth(390, 1, 35), 390);
  assert.equal(arenaPlotWidth(390, 0, 35), 390);
});

@Component({
  standalone: true,
  imports: [ArenaLineChart],
  template: `<arena-line-chart [labels]="labels" [series]="series" label="Revenue"
                               [minPointSpacing]="spacing" />`,
})
class RailHost {
  labels = Array.from({ length: 30 }, (_, i) => `d${i}`);
  values = Array.from({ length: 30 }, (_, i) => i + 1);

  get series() { return [{ label: 'Revenue', values: this.values }]; }
  spacing: number | undefined = undefined;
}

function rail(spacing: number | undefined): Element | null {
  const fixture = TestBed.createComponent(RailHost);
  try {
    fixture.componentInstance.spacing = spacing;
    fixture.detectChanges();
    return (fixture.nativeElement as Element).querySelector('div[role="group"]');
  } finally { fixture.destroy(); }
}

test('the plot is a keyboard region whether it overflows or not', () => {

  for (const spacing of [undefined, 35]) {
    const box = rail(spacing);
    assert.equal(box?.getAttribute('tabindex'), '0', `spacing ${spacing}: the data cursor needs somewhere to live`);
    assert.equal(box?.getAttribute('role'), 'group', `spacing ${spacing}`);
    assert.match(box?.getAttribute('aria-label') ?? '', /Revenue/,
      'the region takes the chart\'s own name, so it is not announced as an unnamed group');
  }
});
