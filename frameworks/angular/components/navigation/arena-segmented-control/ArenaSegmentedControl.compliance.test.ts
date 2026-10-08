/* focus.roving, ArrowKeys and Space are the PLATFORM's here, exactly as they are for
 * arena-radio-group: the segments are native radios sharing one `name`, so the browser supplies
 * the single tab stop and the arrow cycle and happy-dom supplies none of it. What is asserted is
 * the structural precondition, plus the one thing this component exists to get right --
 * role="radiogroup", where the third-party control it replaced applied role="group". */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaSegmentOption } from '../../../Api.generated';
import { ArenaSegmentedControl } from './ArenaSegmentedControl';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-segmented-control/ArenaSegmentedControl.behaviour.json');

const RANGES: ArenaSegmentOption[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

@Component({
  standalone: true,
  imports: [ArenaSegmentedControl],
  template: `<arena-segmented-control [options]="options" [ariaLabel]="ariaLabel" [name]="name"
                                      [value]="value" [defaultValue]="defaultValue"
                                      (change)="chosen.push($event)" />`,
})
class SegmentedControlHost {
  options: readonly ArenaSegmentOption[] = RANGES;
  ariaLabel = 'Time range';
  name: string | undefined = 'range';
  value: string | undefined = '7d';
  defaultValue: string | undefined = undefined;
  chosen: string[] = [];
}

function render(patch: Partial<SegmentedControlHost> = {}) {
  const fixture = TestBed.createComponent(SegmentedControlHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const group = host.querySelector('arena-segmented-control') as HTMLElement;
  const radios = Array.from(host.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
  return { fixture, host, group, radios };
}

test('the group is role="radiogroup" and not role="group" -- the defect this replaces', () => {
  const { fixture, group } = render();
  try {
    assert.equal(group.getAttribute('role'), 'radiogroup',
      'Angular Material\'s MatButtonToggleGroup applies role="group" even in exclusive mode, which is '
      + 'why the delegated entry carried a roles.group exception. Arena renders the role itself, so '
      + 'this binding has no exceptions and must not grow one.');
    assert.equal(group.getAttribute('aria-label'), 'Time range');
  } finally {
    fixture.destroy();
  }
});

test('the host is the track itself, so the focus ring lands on the box the user sees', () => {
  const { fixture, group } = render();
  try {
    assert.match(group.getAttribute('class') ?? '', /arena-segmented-control__track/);
  } finally {
    fixture.destroy();
  }
});

test('one native radio per option, one shared name, and no authored tabindex', () => {
  const { fixture, host, radios } = render();
  try {
    assert.equal(radios.length, 3);
    const names = new Set(radios.map((r) => r.getAttribute('name')));
    assert.equal(names.size, 1, 'one shared name is what the browser roves as a single group');
    assert.equal(names.has('range'), true);
    assert.equal(host.querySelectorAll('[tabindex]').length, 0,
      'authoring a tabindex here would fight the roving stop the browser already gives');
  } finally {
    fixture.destroy();
  }
});

test('exactly one segment is checked, and it is the one matching value', () => {
  const { fixture, radios } = render();
  try {
    assert.equal(radios.filter((r) => r.checked).length, 1);
    assert.equal(radios[1].checked, true);
  } finally {
    fixture.destroy();
  }
});

test('with neither value nor defaultValue the first option is selected, not none', () => {
  const { fixture, radios } = render({ value: undefined });
  try {
    assert.equal(radios[0].checked, true,
      'a filter with nothing selected shows an unfiltered list under a control that claims otherwise');
  } finally {
    fixture.destroy();
  }
});

test('defaultValue governs an uncontrolled track, and the track then remembers its own choice', () => {
  const { fixture, radios } = render({ value: undefined, defaultValue: '30d' });
  try {
    assert.equal(radios[2].checked, true);
    radios[0].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    const after = Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    assert.equal(after[0].checked, true, 'an uncontrolled track must show the choice it just reported');
    assert.deepEqual(fixture.componentInstance.chosen, ['24h']);
  } finally {
    fixture.destroy();
  }
});

test('choosing emits once, carrying the value rather than the event', () => {
  const { fixture, radios } = render();
  try {
    radios[2].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.chosen, ['30d'],
      'change is an output named after a native DOM event -- twice would mean the native one escaped too');
  } finally {
    fixture.destroy();
  }
});

test('the selected segment is the styled one, and it changes when the value does', () => {
  const { fixture, host } = render();
  try {
    const labels = Array.from(host.querySelectorAll('label'));
    assert.equal(labels[1].getAttribute('data-arena-selected'), '');
    assert.equal(labels[0].hasAttribute('data-arena-selected'), false);
  } finally {
    fixture.destroy();
  }

  const other = render({ value: '24h' });
  try {
    const labels = Array.from(other.host.querySelectorAll('label'));
    assert.equal(labels[0].getAttribute('data-arena-selected'), '');
    assert.equal(labels[1].hasAttribute('data-arena-selected'), false);
  } finally {
    other.fixture.destroy();
  }
});

test('each label names its own option, and the group names what is being filtered', () => {
  const { fixture, host, group } = render();
  try {
    assert.deepEqual(
      Array.from(host.querySelectorAll('label')).map((l) => l.textContent?.trim()),
      ['24h', '7d', '30d'],
    );
    assert.equal(group.getAttribute('aria-label'), 'Time range',
      'the group says what is being filtered; "Filter" would satisfy the requirement and tell nobody anything');
  } finally {
    fixture.destroy();
  }
});

test('arena-segmented-control meets the radiogroup pattern, with no exception', () => {
  const { fixture, host, group, radios } = render();
  try {
    assertPattern({
      root: host,
      bindingPath: BINDING,
      subjects: { default: group, 'roles.item': radios[0], 'states.checked': radios },
      behavioural: { 'focus.roving': true, 'keyboard.ArrowKeys': true, 'keyboard.Space': true },
    });
  } finally {
    fixture.destroy();
  }
});
