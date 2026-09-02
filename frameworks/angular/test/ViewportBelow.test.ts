/* The other half of the breakpoint question: arenaContainerWidth answers "how wide is this box",
 * which is what a component needs, and this answers "which side of the threshold is the
 * viewport on", which is what a consumer's own page layout needs and could not get from CSS,
 * since a media query condition holds no var(). The query is `not all and (min-width: N)`
 * rather than a max-width one short of N, so it is the exact complement of the `md:` variant
 * with no epsilon to get wrong. One probe per name because arenaViewportBelow takes its name at
 * construction, in an injection context, where an input signal has nothing in it yet.
 * The thresholds are installed as inline properties on the documentElement, bridged from the
 * generated CSS rather than typed in here, and that is also the only shape a server DOM answers
 * getComputedStyle with, so withholding them is the shape of a server render. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ChangeDetectionStrategy, Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { REPO } from './Compliance';
import { arenaReadBreakpoint, forgetArenaBreakpoints, arenaViewportBelow } from '../ContainerSize';

const spacing = readFileSync(join(REPO, 'contracts', 'design-generated', 'spacing.generated.css'), 'utf8');
const installed: string[] = [];

before(() => {
  forgetArenaBreakpoints();
  for (const [, name, value] of spacing.matchAll(/(--bp-[a-z]+)\s*:\s*([^;]+);/g)) {
    document.documentElement.style.setProperty(name, value.trim());
    installed.push(name);
  }
});

after(() => {
  for (const name of installed) document.documentElement.style.removeProperty(name);
  forgetArenaBreakpoints();
});

interface Resizable { happyDOM: { setViewport(size: { width: number }): void } }

@Component({
  selector: 'arena-probe-sm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span [attr.data-below]="below()"></span>',
})
class SmallProbe { readonly below = arenaViewportBelow('sm'); }

@Component({
  selector: 'arena-probe-md',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span [attr.data-below]="below()"></span>',
})
class MediumProbe { readonly below = arenaViewportBelow('md'); }

@Component({
  selector: 'arena-probe-lg',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span [attr.data-below]="below()"></span>',
})
class LargeProbe { readonly below = arenaViewportBelow('lg'); }

@Component({
  selector: 'arena-probe-read',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class ReadProbe { readonly value = arenaReadBreakpoint('lg'); }

async function probe(type: Type<unknown>, width: number) {
  const fixture = TestBed.createComponent(type);
  const host = fixture.nativeElement as Element;
  const view = host.ownerDocument.defaultView as unknown as Resizable;
  view.happyDOM.setViewport({ width });
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  const read = () => host.querySelector('span')!.getAttribute('data-below');
  return {
    read,
    resize: (next: number) => {
      view.happyDOM.setViewport({ width: next });
      fixture.detectChanges();
      return read();
    },
    destroy: () => fixture.destroy(),
  };
}

interface Withheld { messages: string[]; restore: () => void }

async function withoutThresholds(run: (withheld: Withheld) => Promise<void>): Promise<void> {
  const root = document.documentElement;
  const saved = installed.map((name) => [name, root.style.getPropertyValue(name)] as const);
  const restore = () => { for (const [name, value] of saved) root.style.setProperty(name, value); };
  for (const [name] of saved) root.style.removeProperty(name);
  forgetArenaBreakpoints();

  const messages: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { messages.push(args.map(String).join(' ')); };
  try {
    await run({ messages, restore });
  } finally {
    console.warn = original;
    restore();
    forgetArenaBreakpoints();
  }
}

test('it reports which side of --bp-md the viewport is on, and follows a resize', async () => {
  const p = await probe(MediumProbe, 1280);
  try {
    assert.equal(p.read(), 'false', 'a desktop viewport is not below md');
    assert.equal(p.resize(390), 'true',
      'the signal must follow the resize, or a shell renders its wide branch on a phone that rotated');
    assert.equal(p.resize(1280), 'false');
  } finally { p.destroy(); }
});

test('the threshold itself is not below it, which is what the md: variant means', async () => {
  const p = await probe(MediumProbe, 768);
  try {
    assert.equal(p.read(), 'false',
      '--bp-md is the width at which the wide branch starts, so exactly 768 is the wide side');
  } finally { p.destroy(); }
});

test('each name is its own threshold', async () => {
  const cases: [Type<unknown>, string][] = [[SmallProbe, 'false'], [MediumProbe, 'true'], [LargeProbe, 'true']];
  for (const [type, expected] of cases) {
    const p = await probe(type, 600);
    try {
      assert.equal(p.read(), expected,
        '600 is above --bp-sm (480) and below both --bp-md (768) and --bp-lg (1024)');
    } finally { p.destroy(); }
  }
});

test('the unresolved-breakpoint warning is reachable only from after the first render, which a server never runs', async () => {
  await withoutThresholds(async ({ messages }) => {
    const fixture = TestBed.createComponent(ReadProbe);
    try {
      assert.deepEqual(messages, [],
        'constructing the component must be silent: an Angular server render constructs it and never reaches '
        + 'afterNextRender, and the read cannot succeed there whatever the consumer does, because a server DOM '
        + "answers getComputedStyle with the element's own inline style rather than with the cascade");
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      assert.equal(messages.length, 1,
        'in a browser the diagnosis is still worth making, once, after the first render: by then a stylesheet '
        + 'that was going to arrive has arrived, so an unresolved token really is missing or late');
    } finally { fixture.destroy(); }
  });
});

test('an absent breakpoint token is NaN, and every comparison against NaN is false, which lands on the wide layout', async () => {
  await withoutThresholds(async () => {
    const fixture = TestBed.createComponent(ReadProbe);
    try {
      const value = fixture.componentInstance.value;
      assert.ok(Number.isNaN(value), `expected NaN for an absent token, got ${value}`);
      assert.equal(1 < value, false, 'a NaN breakpoint must never select the narrow branch');
      assert.equal(9999 < value, false, 'a NaN breakpoint must never select the narrow branch');
    } finally { fixture.destroy(); }
  });
});

test('a failed read is not cached, so a stylesheet that arrives late is read again rather than pinned to NaN', async () => {
  await withoutThresholds(async ({ restore }) => {
    const first = TestBed.createComponent(ReadProbe);
    try {
      assert.ok(Number.isNaN(first.componentInstance.value), 'the first read has no token to resolve');
    } finally { first.destroy(); }

    restore();
    const expected = Number.parseFloat(document.documentElement.style.getPropertyValue('--bp-lg'));
    const second = TestBed.createComponent(ReadProbe);
    try {
      assert.equal(second.componentInstance.value, expected,
        'a failed read must not be cached: the next construction re-reads and recovers the real value');
    } finally { second.destroy(); }
  });
});
