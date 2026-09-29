/* arenaContainerWidth observes ONE element, and which one is the whole question: a component whose
 * host is `display: contents` has no box, so observing the host reports 0 for ever and every
 * width-derived branch silently takes its narrow arm. ArenaCalendar was measured that way, and its
 * chips dropped the time label on every screen while the grid drew correctly, because the
 * fixture seeded the view the width would otherwise have chosen. happy-dom has no layout, so
 * what is pinned here is the TARGET rather than the number: the element handed to the observer. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { ChangeDetectionStrategy, Component, ElementRef, Type, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { arenaContainerWidth } from '../ContainerSize';
import { assertSameNode } from './NodeAssert';
import { laidOut } from './LaidOut';

const observed: Element[] = [];

class RecordingResizeObserver {
  observe(element: Element): void { observed.push(element); }
  disconnect(): void { }
}

@Component({
  selector: 'probe-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: '<section #frame data-role="frame"></section>',
})
class Probe {
  readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  readonly width = arenaContainerWidth(() => this.frame().nativeElement);
}

@Component({
  selector: 'probe-default',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<section></section>',
})
class ProbeDefault {
  readonly width = arenaContainerWidth();
}

function mount<T>(type: Type<T>) {
  observed.length = 0;
  const previous = globalThis.ResizeObserver;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = RecordingResizeObserver;
  try {
    const fixture = TestBed.createComponent(type);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  } finally {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = previous;
  }
}

test('a function target is observed, so a boxless host measures the element that has the box', () => {
  const fixture = mount(Probe);
  try {
    assert.equal(observed.length, 1, 'arenaContainerWidth observed something other than one element');
    assert.equal((observed[0] as HTMLElement).getAttribute('data-role'), 'frame',
      'the observer was pointed at the display:contents host, whose contentRect is 0 for ever');
  } finally {
    fixture.destroy();
  }
});

test('with no target it still observes the host, which is what every other caller relies on', () => {
  const fixture = mount(ProbeDefault);
  try {
    assert.equal(observed.length, 1);
    assertSameNode(observed[0], fixture.nativeElement,
      'the default target stopped being the host, which is what the other six callers pass nothing for');
  } finally {
    fixture.destroy();
  }
});

@Component({
  selector: 'probe-drawn',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span [attr.data-width]="width()"></span>',
})
class ProbeDrawn {
  readonly width = arenaContainerWidth();
}

function drawnWidth(width: number): string | null {
  return laidOut(width, () => {
    const fixture = TestBed.createComponent(ProbeDrawn);
    try {
      fixture.autoDetectChanges();
      TestBed.tick();
      return (fixture.nativeElement as Element).querySelector('span')!.getAttribute('data-width');
    } finally {
      fixture.destroy();
    }
  });
}

test('the width is drawn by the tick that first renders the box, before any observer reports', () => {
  assert.equal(drawnWidth(390), '390',
    'the width waited for an observer and a later tick, so a phone paints the wide branch first');
});

test('a box with no width stays null, so a component in a hidden parent keeps its wide branch', () => {
  assert.equal(drawnWidth(0), null);
});
