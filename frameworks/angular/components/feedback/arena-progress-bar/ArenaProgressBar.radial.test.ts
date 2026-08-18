import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaProgressBar } from './ArenaProgressBar';
import { assertNoNode } from '../../../test/NodeAssert';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(ArenaProgressBar);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

test('a radial meter draws a ring whose arc is the percentage, and the figure sits inside it', () => {
  const host = render({ shape: 'radial', label: 'Lesson 4', progressPercentage: 64 });
  const meter = host.querySelector('[role="progressbar"]') as Element;
  assert.equal(meter.getAttribute('aria-valuenow'), '64');
  assert.ok(host.querySelector('.arena-progress-bar__ring'));
  const fill = host.querySelector('.arena-progress-bar__ring-fill') as SVGCircleElement;
  assert.equal(fill.getAttribute('pathLength'), '100');
  assert.equal(fill.style.getPropertyValue('stroke-dashoffset'), '36');
  assertNoNode(host.querySelector('.arena-progress-bar__track'), 'a ring drew the bar as well');
  assertNoNode(host.querySelector('.arena-progress-bar__head'),
    'a ring drew the bar head, so the figure is not inside the ring');
});

test('a radial meter keeps the accessible name and the announcement the bar carries', () => {
  const host = render({ shape: 'radial', label: 'Lesson 4', progressPercentage: 64, showPercentage: false });
  const meter = host.querySelector('[role="progressbar"]') as HTMLElement;
  assert.equal(meter.getAttribute('aria-label'), 'Lesson 4');
  assert.ok(host.querySelector('.arena-progress-bar__announcement'),
    'the live region is what a screen reader hears, and hiding the figure is a decision about what is drawn');
});

test('an indeterminate ring turns a fixed arc and reports no value', () => {
  const host = render({ shape: 'radial', indeterminate: true, label: 'Connecting', progressPercentage: 64 });
  const meter = host.querySelector('[role="progressbar"]') as HTMLElement;
  assert.equal(meter.getAttribute('aria-valuenow'), null);
  const fill = host.querySelector('.arena-progress-bar__ring-fill') as SVGCircleElement;
  assert.match(fill.getAttribute('class') ?? '', /\barena-progress-bar__ring-indeterminate\b/,
    'the turn is the shared utility, whose reduced-motion clause slows it rather than stopping it');
  assert.equal(fill.style.getPropertyValue('stroke-dashoffset'), '75',
    'the arc a wait turns is a fixed quarter and never the percentage');
});

test('a ring draws its middle whether or not anything was projected there', () => {
  const host = render({ shape: 'radial', label: 'Lesson 4', progressPercentage: 40 });
  assert.ok(host.querySelector('.arena-progress-bar__ring-content'),
    'the middle is drawn either way, because this layer cannot see whether content arrived');
  assert.ok(host.querySelector('.arena-progress-bar__value'));

  const bare = render({ shape: 'radial', label: 'Lesson 4', progressPercentage: 40, showPercentage: false });
  assertNoNode(bare.querySelector('.arena-progress-bar__value'),
    'showPercentage is what turns the figure off, never the presence of content');
});

test('the role sits on the drawing, so a projected control is a sibling of the meter', () => {
  const host = render({ shape: 'radial', label: 'Lesson 4', progressPercentage: 40 });
  const meter = host.querySelector('[role="progressbar"]') as Element;
  assert.equal(meter.tagName.toLowerCase(), 'svg',
    'a progressbar\'s children are presentational, so anything projected must sit outside it');
});

test('the default shape is the bar, and it draws no ring', () => {
  const host = render({ label: 'Deploying', progressPercentage: 50 });
  assert.ok(host.querySelector('.arena-progress-bar__track'));
  assertNoNode(host.querySelector('.arena-progress-bar__ring'));
});
