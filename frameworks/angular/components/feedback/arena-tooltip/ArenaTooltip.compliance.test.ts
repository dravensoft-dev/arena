/* The first suite in this layer to pass root: document.body, and it has to. roles.describedby
 * resolves an IDREF, Compliance.ts's resolver only searches inside the root it is given, and the
 * bubble lives in the CDK's overlay container on document.body while the trigger stays in the
 * fixture -- so the nearest element containing both is the body itself.
 * keyboard.Escape and focus.never are each earned by a named assertion below. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertNoNode } from '../../../test/NodeAssert';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaTooltip } from './ArenaTooltip';
import { ArenaPopover } from '../arena-popover/ArenaPopover';
import { assertPattern, ANGULAR_COMPONENTS, isFocusable } from '../../../test/Compliance';
import { disposeOverlays, overlayContainers } from '../../../test/Overlays';

const BINDING = join(ANGULAR_COMPONENTS, 'feedback/arena-tooltip/ArenaTooltip.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaTooltip],
  template: `
    <arena-tooltip label="Everything shipped in the last 30 days">
      <button type="button" [attr.aria-describedby]="own">Deployments</button>
    </arena-tooltip>
  `,
})
class TooltipHost {
  own: string | null = null;
}

function render(patch: Partial<TooltipHost> = {}) {
  const fixture = TestBed.createComponent(TooltipHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const wrapper = fixture.nativeElement.querySelector('arena-tooltip') as HTMLElement;
  const trigger = wrapper.querySelector('button') as HTMLButtonElement;
  return { fixture, wrapper, trigger };
}

function reveal(fixture: { detectChanges: () => void }, wrapper: HTMLElement) {
  wrapper.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  fixture.detectChanges();
  return document.body.querySelector('[role="tooltip"]') as HTMLElement | null;
}

test('a pointer resting on the trigger reveals nothing yet -- the wait is what stops a crossed toolbar flashing', () => {
  const { fixture, wrapper } = render();
  try {
    wrapper.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    fixture.detectChanges();
    assertNoNode(document.body.querySelector('[role="tooltip"]'),
      'the bubble appeared synchronously on pointerenter, so --delay-open is not being waited');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('keyboard focus reveals immediately, into a CDK overlay outside the fixture', () => {
  const { fixture, wrapper } = render();
  try {
    const bubble = reveal(fixture, wrapper);
    assert.ok(bubble, 'focus revealed no bubble -- a delay on focus reads as an unresponsive control');
    assert.equal(bubble.textContent?.trim(), 'Everything shipped in the last 30 days');
    assert.equal(overlayContainers().length, 1, 'the bubble must render in a CDK overlay container');
    assert.ok(!fixture.nativeElement.contains(bubble),
      'the bubble is inside the fixture, so it is not in an overlay and would clip inside an overflow-hidden ancestor');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('the trigger describes itself with the bubble while revealed, and stops when it withdraws', () => {
  const { fixture, wrapper, trigger } = render();
  try {
    const bubble = reveal(fixture, wrapper);
    assert.ok(bubble);
    const id = bubble.getAttribute('id');
    assert.ok(id, 'the bubble has no id, so aria-describedby could only dangle');
    assert.equal(trigger.getAttribute('aria-describedby'), id);

    wrapper.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(trigger.getAttribute('aria-describedby'), null,
      'the reference outlived the bubble, which is a dangling IDREF');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test("the trigger's own aria-describedby survives the reveal and is restored intact", () => {
  const { fixture, wrapper, trigger } = render({ own: 'field-hint' });
  try {
    const bubble = reveal(fixture, wrapper);
    assert.ok(bubble);
    const ids = (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/);
    assert.ok(ids.includes('field-hint'), "Arena overwrote the consumer's own description");
    assert.ok(ids.includes(bubble.getAttribute('id') as string));

    wrapper.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();
    assert.equal(trigger.getAttribute('aria-describedby'), 'field-hint');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Escape dismisses, and the listener is on the document because a pointer leaves focus elsewhere', () => {
  const { fixture, wrapper } = render();
  try {
    assert.ok(reveal(fixture, wrapper));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    assertNoNode(document.body.querySelector('[role="tooltip"]'), 'Escape left the bubble on screen');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('the bubble never takes focus -- there is nothing in it to reach', () => {
  const { fixture, wrapper } = render();
  try {
    const bubble = reveal(fixture, wrapper);
    assert.ok(bubble);
    assert.equal(bubble.getAttribute('tabindex'), null);
    assert.ok(!isFocusable(bubble), 'a focusable tooltip is unreachable by definition: it withdraws on blur');
    assert.equal(bubble.querySelectorAll('[tabindex], button, a[href], input').length, 0,
      'interactive content inside a tooltip can never be reached');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('destroying the component disposes its overlay rather than leaking it into the shared document', () => {
  const { fixture, wrapper } = render();
  try {
    assert.ok(reveal(fixture, wrapper));
    fixture.destroy();
    assertNoNode(document.body.querySelector('[role="tooltip"]'),
      'the bubble outlived its component, and one document is shared by the whole run');
  } finally {
    disposeOverlays();
  }
});

test('arena-tooltip meets the tooltip pattern', () => {
  const { fixture, wrapper, trigger } = render();
  try {
    const bubble = reveal(fixture, wrapper);
    assert.ok(bubble);

    assertPattern({
      root: document.body,
      bindingPath: BINDING,
      subjects: { default: bubble, 'roles.describedby': trigger },
      behavioural: { 'keyboard.Escape': true, 'focus.never': true },
    });
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

@Component({
  standalone: true,
  imports: [ArenaPopover, ArenaTooltip],
  template: `
    <arena-popover label="Filters" [open]="open()" (openChange)="open.set($event)">
      <button trigger type="button" class="filters">Filters</button>
      <arena-tooltip label="Rebuilds the index"><button type="button" class="reindex">Reindex</button></arena-tooltip>
    </arena-popover>
  `,
})
class TooltipInPopoverHost {
  readonly open = signal(false);
}

test('a tooltip inside a popover is the topmost panel, so Escape closes it and leaves the popover', () => {
  const fixture = TestBed.createComponent(TooltipInPopoverHost);
  const dialog = () => document.body.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
  try {
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.filters') as HTMLElement).click();
    fixture.detectChanges();
    const inner = dialog()!.querySelector<HTMLElement>('.reindex')!;
    inner.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    assert.ok(document.body.querySelector('[role="tooltip"]'), 'focus did not reveal the tooltip');
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    assertNoNode(document.body.querySelector('[role="tooltip"]'), 'Escape did not close the tooltip');
    assert.ok(dialog(), 'Escape closed the popover under the tooltip as well');
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    assert.equal(dialog(), null, 'a second Escape did not reach the popover, so the tooltip stayed on the stack');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});
