/* What each member draws: the value attributes on the meter, the clamp, the readout as passed,
 * the standing word beside the reading and after it in aria-valuetext, the locale's words, and
 * the guard on a blank name. The host is the grid, and the track carries the derived standing. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { ARENA_DEFAULT_LOCALE, provideArenaLocale } from '../../../ArenaLocale';
import { ArenaMeter } from './ArenaMeter';

@Component({
  selector: 'meter-variants-host',
  standalone: true,
  imports: [ArenaMeter],
  template: `<arena-meter [label]="label" [value]="value" [min]="min" [max]="max" [low]="low" [high]="high"
                          [optimum]="optimum" [showLabel]="showLabel" [valueText]="valueText" />`,
})
class MeterHost {
  label = 'Storage used';
  value = 72;
  min: number | undefined = undefined;
  max: number | undefined = undefined;
  low: number | undefined = undefined;
  high: number | undefined = undefined;
  optimum: number | undefined = undefined;
  showLabel = true;
  valueText: string | undefined = undefined;
}

function render(patch: Partial<MeterHost> = {}) {
  const fixture = TestBed.createComponent(MeterHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const host = root.querySelector('arena-meter') as HTMLElement;
  const part = (name: string) => root.querySelector(`[data-arena-part="meter.${name}"]`) as HTMLElement | null;
  return { fixture, host, meter: root.querySelector('[role="meter"]') as HTMLElement, part };
}

test('the host is the grid, and the head draws the name and the reading with no standing when no threshold is given', () => {
  const { fixture, host, meter, part } = render({ valueText: '72 of 100 GB' });
  try {
    assert.equal(host.getAttribute('data-arena-part'), 'meter');
    assert.equal(part('label')?.textContent, 'Storage used');
    assert.equal(part('value')?.textContent, '72 of 100 GB');
    assertNoNode(part('standing'), 'with no threshold given there is no standing to draw');
    assert.equal(meter.getAttribute('data-arena-standing'), 'none', 'the track carries the derived standing, and none paints the accent');
  } finally {
    fixture.destroy();
  }
});

test('the drawing and aria-valuenow clamp, while the readout shows the number as passed', () => {
  const over = render({ value: 143 });
  try {
    assert.equal(over.meter.getAttribute('aria-valuenow'), '100');
    assert.equal(over.part('fill')?.style.width, '100%');
    assert.equal(over.part('value')?.textContent, '143');
  } finally {
    over.fixture.destroy();
  }
  const loose = render({ value: Number.NaN, min: 10, max: 20 });
  try {
    assert.equal(loose.meter.getAttribute('aria-valuenow'), '10', 'a value that is not a number reads as min');
    assert.equal(loose.part('value')?.textContent, '10');
  } finally {
    loose.fixture.destroy();
  }
  const inverted = render({ value: 5, min: 50, max: 10 });
  try {
    assert.equal(inverted.meter.getAttribute('aria-valuemax'), '50', 'max below min reads as min, so the range never inverts');
  } finally {
    inverted.fixture.destroy();
  }
});

test('thresholds draw the standing word beside the reading and say it after the reading', () => {
  const cases = [[30, 'optimum', 'Good'], [72, 'fair', 'Fair'], [91, 'poor', 'Poor']] as const;
  for (const [value, standing, word] of cases) {
    const { fixture, meter, part } = render({ value, low: 50, high: 80, optimum: 0 });
    try {
      assert.equal(meter.getAttribute('data-arena-standing'), standing);
      assert.equal(part('standing')?.textContent, word);
      assert.equal(meter.getAttribute('aria-valuetext'), `${value}, ${word}`, 'the standing is said as well as drawn, so colour is never its only carrier');
    } finally {
      fixture.destroy();
    }
  }
});

test('the standing words come from the provided locale', () => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideArenaLocale({ ...ARENA_DEFAULT_LOCALE, meterFair: 'Regular' })] });
  const { fixture, part } = render({ value: 72, low: 50, high: 80, optimum: 0 });
  try {
    assert.equal(part('standing')?.textContent, 'Regular');
  } finally {
    fixture.destroy();
    TestBed.resetTestingModule();
  }
});

test('showLabel false hides the drawn name and keeps the accessible one', () => {
  const { fixture, meter, part } = render({ showLabel: false });
  try {
    assertNoNode(part('label'), 'the drawn label is still there');
    assert.equal(meter.getAttribute('aria-label'), 'Storage used');
  } finally {
    fixture.destroy();
  }
});

test('a blank label throws, and a value that is not a number with an inverted range does not', () => {
  const blank = TestBed.createComponent(MeterHost);
  try {
    blank.componentInstance.label = '  ';
    assert.throws(() => blank.detectChanges(), /ArenaMeter: `label` is required/);
  } finally {
    blank.destroy();
  }
  const loose = render({ value: Number.POSITIVE_INFINITY, min: 9, max: 1, low: Number.NaN });
  loose.fixture.destroy();
});
