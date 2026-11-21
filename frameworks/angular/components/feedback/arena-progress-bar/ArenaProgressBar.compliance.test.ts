/* `live.politeness` is the requirement this file exists for: the role carries no implicit
 * politeness, MatProgressBar set no aria-live at all, and both delegated cases declared that
 * as an exception. A primitive clears it by rendering the attribute, which is what the
 * exception-free binding claims and what the first test measures in both modes.
 * The three states.* requirements are BEHAVIOURAL rather than decidable, because each is
 * conditional on which mode the bar is in and one element cannot say which. VALUE_VERDICTS is
 * earned by the second test, which renders both and asserts what each carries. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { ArenaProgressBar, arenaClampPercentage } from './ArenaProgressBar';

const BINDING = join(ANGULAR_COMPONENTS, 'feedback/arena-progress-bar/ArenaProgressBar.behaviour.json');

const VALUE_VERDICTS = {
  'states.valuenow': true,
  'states.valuemin': true,
  'states.valuemax': true,
};

function renderBar(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(ArenaProgressBar);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture;
}

function track(fixture: { nativeElement: Element }): HTMLElement {
  return fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
}

test('the live region is explicit, which is the exception both delegated cases carried and neither needs now', () => {
  for (const indeterminate of [false, true]) {
    const fixture = renderBar({ label: 'Uploading', indeterminate });
    try {
      assert.equal(track(fixture).getAttribute('aria-live'), 'polite',
        `role="progressbar" carries no implicit politeness, so ${indeterminate ? 'an indeterminate' : 'a determinate'} bar must say so`);
    } finally {
      fixture.destroy();
    }
  }
});

test('a determinate bar reports its value; an indeterminate one omits it, which is how ARIA expresses indeterminacy', () => {
  const determinate = renderBar({ progressPercentage: 42, label: 'Uploading' });
  try {
    const el = track(determinate);
    assert.equal(el.getAttribute('aria-valuenow'), '42');
    assert.equal(el.getAttribute('aria-valuemin'), '0');
    assert.equal(el.getAttribute('aria-valuemax'), '100');
  } finally {
    determinate.destroy();
  }

  const indeterminate = renderBar({ indeterminate: true, label: 'Uploading' });
  try {
    const el = track(indeterminate);
    assert.equal(el.getAttribute('aria-valuenow'), null,
      'aria-valuenow must be ABSENT rather than zero -- zero is a determinate claim of no progress');
    assert.equal(el.getAttribute('aria-valuemin'), '0', 'the bounds stay, because they are still true');
    assert.equal(el.getAttribute('aria-valuemax'), '100');
    assertNoNode(indeterminate.nativeElement.querySelector('[style*="width"]'),
      'an indeterminate bar renders no fill: the sweep is the indeterminate class, not a width');
  } finally {
    indeterminate.destroy();
  }
});

test('the value is clamped and rounded, so a caller cannot report 143% or -8%', () => {
  assert.equal(arenaClampPercentage(-8), 0);
  assert.equal(arenaClampPercentage(143), 100);
  assert.equal(arenaClampPercentage(41.6), 42);
  assert.equal(arenaClampPercentage(0), 0);

  const fixture = renderBar({ progressPercentage: 143, label: 'Uploading' });
  try {
    assert.equal(track(fixture).getAttribute('aria-valuenow'), '100');
  } finally {
    fixture.destroy();
  }
});

test('the accessible name comes from label alone', () => {
  const labelled = renderBar({ progressPercentage: 10, label: 'Uploading build 482' });
  try {
    assert.equal(track(labelled).getAttribute('aria-label'), 'Uploading build 482');
  } finally {
    labelled.destroy();
  }
});
test('the head always carries the label, and never shows a percentage for a bar that has none', () => {
  const head = (fixture: ReturnType<typeof renderBar>) =>
    (fixture.nativeElement as Element).firstElementChild?.textContent ?? '';

  const bare = renderBar({ progressPercentage: 10, showPercentage: false, label: 'Uploading' });
  try {
    const text = head(bare);
    assert.ok(text.includes('Uploading'), 'label is required, so the head always has something to say');
    assert.ok(!text.includes('%'),
      'showPercentage false means no VISIBLE percentage, whatever the value is -- the live region keeps its own');
  } finally {
    bare.destroy();
  }

  const indeterminate = renderBar({ indeterminate: true, showPercentage: true, label: 'Working' });
  try {
    const text = (indeterminate.nativeElement as Element).textContent ?? '';
    assert.ok(text.includes('Working'), 'the label still shows');
    assert.ok(!text.includes('%'), 'an indeterminate bar has no percentage to show, whatever showPercentage says');
  } finally {
    indeterminate.destroy();
  }
});

test('arena-progress-bar meets both of its declared cases', () => {
  const fixtures: ReturnType<typeof renderBar>[] = [];
  try {
    assertPatternCases({
      bindingPath: BINDING,
      cases: {
        determinate: () => {
          const fixture = renderBar({ progressPercentage: 42, label: 'Uploading' });
          fixtures.push(fixture);
          return {
            root: fixture.nativeElement as Element,
            subjects: { default: track(fixture) },
            behavioural: VALUE_VERDICTS,
          };
        },
        indeterminate: () => {
          const fixture = renderBar({ indeterminate: true, label: 'Uploading' });
          fixtures.push(fixture);
          return {
            root: fixture.nativeElement as Element,
            subjects: { default: track(fixture) },
            behavioural: VALUE_VERDICTS,
          };
        },
      },
    });
  } finally {
    for (const fixture of fixtures) fixture.destroy();
  }
});

test('the value the live region announces is INSIDE the live region, not in a sibling outside it', () => {
  const fixture = renderBar({ progressPercentage: 42, label: 'Uploading' });
  try {
    const region = track(fixture);
    assert.equal(region.getAttribute('aria-live'), 'polite', 'precondition: the track is the live region');
    assert.match(
      region.textContent ?? '',
      /42%/,
      'the region announces changes to its CONTENT, and reporting progress by mutating aria-valuenow alone '
      + 'leaves a polite region whose content never changes',
    );
  } finally {
    fixture.destroy();
  }
});

test('an indeterminate bar announces no value, so the region carries no percentage text either', () => {
  const fixture = renderBar({ indeterminate: true, label: 'Uploading' });
  try {
    assert.equal((track(fixture).textContent ?? '').trim(), '', 'an indeterminate bar has no value to announce');
  } finally {
    fixture.destroy();
  }
});
