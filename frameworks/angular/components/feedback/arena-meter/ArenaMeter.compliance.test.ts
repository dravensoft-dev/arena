/* arena-meter binds meter on its track, the element carrying the role, so assertPattern is pointed
 * there rather than at the host, which is the grid holding the head beside it. The three value
 * states are behavioural because each is a value the component computes; the assertions above
 * the call earn them. Nothing is live and nothing takes focus. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS, TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { ArenaMeter } from './ArenaMeter';

const source = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'feedback/arena-meter/ArenaMeter.manifest.json'), 'utf8')) as { slots: { fill: string } };

const BINDING = join(ANGULAR_COMPONENTS, 'feedback/arena-meter/ArenaMeter.behaviour.json');

@Component({
  selector: 'meter-compliance-host',
  standalone: true,
  imports: [ArenaMeter],
  template: `<arena-meter label="Storage used" [value]="72" [low]="50" [high]="80" [optimum]="0" valueText="72 of 100 GB" />`,
})
class MeterHost {}

test('arena-meter meets the meter pattern on its track', () => {
  const fixture = TestBed.createComponent(MeterHost);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const meter = root.querySelector('[role="meter"]') as HTMLElement;
    assert.ok(meter, 'sanity: nothing rendered the meter element');
    assert.equal(meter.getAttribute('aria-valuenow'), '72');
    assert.equal(meter.getAttribute('aria-valuemin'), '0');
    assert.equal(meter.getAttribute('aria-valuemax'), '100');
    assert.equal(meter.getAttribute('aria-valuetext'), '72 of 100 GB, Fair');
    assertPattern({
      root,
      bindingPath: BINDING,
      subjects: { default: meter },
      behavioural: { 'states.valuenow': true, 'states.valuemin': true, 'states.valuemax': true },
    });
  } finally {
    fixture.destroy();
  }
});

test('nothing in a meter is live, focusable or moving', () => {
  const fixture = TestBed.createComponent(MeterHost);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    assertNoNode(root.querySelector('[aria-live]'), 'a static measurement announces nothing when it renders');
    assertNoNode(root.querySelector('[tabindex]'), 'a meter is read and never operated, so a tab stop on it is dead');
    const fill = root.querySelector('[data-arena-part="meter.fill"]') as HTMLElement;
    assert.equal(fill.style.width, '72%');
    const motion = source.slots.fill.split(/\s+/).filter((token) => /^(transition|animate-|duration-)/.test(token));
    assert.deepEqual(motion, [], 'a measurement is read at rest, so its fill is static and carries no transition or animation');
  } finally {
    fixture.destroy();
  }
});
