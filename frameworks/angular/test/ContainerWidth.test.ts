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
import { laidOut, SilentObserver } from './LaidOut';

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

test('an observer reporting 0 after a measurement keeps the last width, so a tab hidden and shown again never flashes its phone shape', () => {
  laidOut(900, () => {
    const fixture = TestBed.createComponent(ProbeDrawn);
    try {
      fixture.autoDetectChanges();
      TestBed.tick();
      const observer = SilentObserver.made.at(-1)!;
      const report = (width: number) => {
        observer.callback([{ target: observer.observed[0], borderBoxSize: [{ inlineSize: width, blockSize: 0 }], contentRect: { width } } as unknown as ResizeObserverEntry], observer as unknown as ResizeObserver);
        TestBed.tick();
      };
      const drawn = () => (fixture.nativeElement as Element).querySelector('span')!.getAttribute('data-width');
      assert.equal(drawn(), '900');
      report(0);
      assert.equal(drawn(), '900', 'a box that was hidden reported 0 and the component took its narrow branch');
      report(390);
      assert.equal(drawn(), '390', 'a real width still reaches the component');
    } finally {
      fixture.destroy();
    }
  });
});

const HAIRLINE = '1px';
const WIDE_INSET = '16px';
const COMPACT_INSET = '12px';
const EDGE_INSET = '4px';
const HALF = '50%';

@Component({
  selector: 'probe-look',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style]': 'look' },
  template: '<span [attr.data-width]="width()"></span>',
})
class ProbeLook {
  look: Record<string, string> = {};
  readonly width = arenaContainerWidth();
}

function measuredAt(look: Record<string, string>, box: number, drawn = box): string | null {
  return laidOut(box, () => {
    const fixture = TestBed.createComponent(ProbeLook);
    try {
      fixture.componentInstance.look = look;
      fixture.autoDetectChanges();
      TestBed.tick();
      return (fixture.nativeElement as Element).querySelector('span')!.getAttribute('data-width');
    } finally {
      fixture.destroy();
    }
  }, drawn);
}

test('a box with a border reports its outer width, so a table whose wide root carries one reads the same number in both branches', () => {
  assert.equal(measuredAt({ 'box-sizing': 'border-box', 'border-style': 'solid', 'border-width': HAIRLINE }, 768), '768');
});

test('two boxes whose inline padding differs report the same width, so a bar whose compact root pads less does not flip back', () => {
  const wide = measuredAt({ 'box-sizing': 'border-box', 'padding-left': WIDE_INSET, 'padding-right': COMPACT_INSET }, 480);
  const compact = measuredAt({ 'box-sizing': 'border-box', 'padding-left': COMPACT_INSET, 'padding-right': COMPACT_INSET }, 480);
  assert.deepEqual([wide, compact], ['480', '480']);
});

test('a box drawn at a scale reports its layout width', () => {
  assert.equal(measuredAt({ 'box-sizing': 'border-box' }, 768, 752.64), '768');
});

test('a content-box box reports its padding and border too, so the number is the outer width whatever the box model', () => {
  assert.equal(measuredAt({
    'padding-left': EDGE_INSET, 'padding-right': EDGE_INSET, 'border-style': 'solid', 'border-width': HAIRLINE,
  }, 758), '768');
});

test('a fractional width reaches the component unrounded', () => {
  assert.equal(measuredAt({ 'box-sizing': 'border-box' }, 767.5), '767.5');
});

test('a box with display none at its first attach stays null', () => {
  assert.equal(measuredAt({ display: 'none' }, 768), null);
});

test('a hidden box whose width is a percentage stays null, since its computed width is not a length', () => {
  assert.equal(measuredAt({ display: 'none', 'width': HALF }, 768), null, 'the percentage was read as pixels');
});

test('an observer entry reports its border box, not its content rect, and one with no borderBoxSize is read from its target', () => {
  laidOut(900, () => {
    const fixture = TestBed.createComponent(ProbeDrawn);
    try {
      fixture.autoDetectChanges();
      TestBed.tick();
      const observer = SilentObserver.made.at(-1)!;
      const drawn = () => (fixture.nativeElement as Element).querySelector('span')!.getAttribute('data-width');
      const box = 480;
      const width = box - 4;
      observer.callback([{ target: observer.observed[0], borderBoxSize: [{ inlineSize: box, blockSize: 0 }], contentRect: { width } } as unknown as ResizeObserverEntry], observer as unknown as ResizeObserver);
      TestBed.tick();
      assert.equal(drawn(), '480', 'the observer reported the content rect');
      laidOut(600, () => {
        const width = 596;
        observer.callback([{ target: observer.observed[0], contentRect: { width } } as unknown as ResizeObserverEntry], observer as unknown as ResizeObserver);
        TestBed.tick();
      });
      assert.equal(drawn(), '600', 'an entry without borderBoxSize reported nothing, or its content rect');
    } finally {
      fixture.destroy();
    }
  });
});

test('the observer watches the border box, so a padding or a border that changes alone is delivered', () => {
  laidOut(480, () => {
    const fixture = TestBed.createComponent(ProbeDrawn);
    try {
      fixture.autoDetectChanges();
      TestBed.tick();
      assert.deepEqual(SilentObserver.made.flatMap((one) => one.options), [{ box: 'border-box' }],
        'an observer on the content box never fires when only the padding or the border of the box changes');
    } finally {
      fixture.destroy();
    }
  });
});
