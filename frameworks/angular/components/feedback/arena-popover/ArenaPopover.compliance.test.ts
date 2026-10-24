/* dialog-nonmodal requires the role and a name, and nothing else; root is document.body because
 * the panel lives in the CDK's pane while the trigger stays in the fixture. Everything else here is
 * Arena's own decision, earned by pressing a key or a pointer and reading what moved: the trigger's
 * popup state, focus on open, Escape and Tab-out returning focus to the trigger, and an outside
 * press. Every case runs the controlled shape a host writes. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { disposeOverlays } from '../../../test/Overlays';
import { ArenaButton } from '../../forms/arena-button/ArenaButton';
import { ArenaPopover } from './ArenaPopover';

const BINDING = join(ANGULAR_COMPONENTS, 'feedback/arena-popover/ArenaPopover.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaPopover, ArenaButton],
  template: `
    <arena-popover label="Filters" [open]="open()" (openChange)="asked.push($event); open.set($event)">
      <arena-button trigger>Filters</arena-button>
      <input aria-label="Branch" /><button type="button" class="apply" (click)="open.set(false)">Apply</button>
    </arena-popover>
    <button type="button" class="elsewhere">Elsewhere</button>
  `,
})
class PopoverHost {
  readonly open = signal(false);
  readonly asked: boolean[] = [];
}

@Component({
  standalone: true,
  imports: [ArenaPopover, ArenaButton],
  template: `
    <arena-popover label="Size" [open]="open()" (openChange)="open.set($event)">
      <arena-button trigger>Size</arena-button>
      <input type="radio" name="size" aria-label="Small" /><input type="radio" name="size" aria-label="Large" checked />
      <button type="button">Apply</button>
    </arena-popover>
  `,
})
class RadioHost {
  readonly open = signal(false);
}

@Component({
  standalone: true,
  imports: [ArenaPopover, ArenaButton],
  template: `
    <arena-popover label="Size" [open]="open()" (openChange)="open.set($event)">
      <arena-button trigger>Size</arena-button>
      <button type="button">Apply</button>
      <input type="radio" name="size" aria-label="Small" /><input type="radio" name="size" aria-label="Large" />
    </arena-popover>
  `,
})
class TrailingRadioHost {
  readonly open = signal(false);
}

@Component({
  standalone: true,
  imports: [ArenaPopover, ArenaButton],
  template: `
    <arena-popover label="Notes" [open]="open()" (openChange)="open.set($event)">
      <arena-button trigger>Notes</arena-button>
      <p>Nothing to press.</p>
    </arena-popover>
  `,
})
class BareHost {
  readonly open = signal(false);
}

function render() {
  const fixture = TestBed.createComponent(PopoverHost);
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('arena-popover') as HTMLElement;
  const trigger = host.querySelector('button') as HTMLButtonElement;
  return { fixture, host, trigger };
}

const panel = () => document.body.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');

function key(target: EventTarget, name: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function open(fixture: { detectChanges: () => void }, trigger: HTMLElement) {
  trigger.click();
  fixture.detectChanges();
  return panel();
}

test('arena-popover meets the dialog-nonmodal pattern it binds, open', () => {
  const { fixture, trigger } = render();
  try {
    const shown = open(fixture, trigger);
    assert.ok(shown, 'pressing the trigger did not open the panel');
    assert.equal(shown.getAttribute('aria-modal'), null, 'a non-modal panel claimed to be modal');
    assertPattern({ root: document.body, bindingPath: BINDING, subjects: { default: shown } });
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('the trigger says it opens a dialog, and names the panel only while the panel is there', () => {
  const { fixture, trigger } = render();
  try {
    assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(trigger.getAttribute('aria-controls'), null, 'a closed trigger named a panel that is not there');
    const shown = open(fixture, trigger)!;
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(trigger.getAttribute('aria-controls'), shown.id);
    assert.ok(!fixture.nativeElement.contains(shown), 'the panel is inside the fixture, where an overflow: hidden ancestor clips it');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('a popover whose first control is a radio group opens on its checked option', () => {
  const fixture = TestBed.createComponent(RadioHost);
  fixture.detectChanges();
  const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  try {
    const shown = open(fixture, trigger)!;
    assertSameNode(document.activeElement, shown.querySelector('input[aria-label="Large"]'), 'opening skipped the checked option of the group');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Tab-out reads a radio through its group\'s stop: Shift+Tab inside stays, Tab past the last group closes', () => {
  const fixture = TestBed.createComponent(TrailingRadioHost);
  fixture.detectChanges();
  const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  try {
    const shown = open(fixture, trigger)!;
    const large = shown.querySelector<HTMLElement>('input[aria-label="Large"]')!;
    large.focus();
    assert.equal(key(large, 'Tab', true).defaultPrevented, false, 'Shift+Tab from a radio of a middle stop left the panel');
    fixture.detectChanges();
    assert.ok(panel(), 'Shift+Tab from a radio that is not the first stop closed the panel');
    assert.equal(key(large, 'Tab').defaultPrevented, true, 'Tab from a radio of the last group did not leave the panel');
    fixture.detectChanges();
    assertNoNode(panel(), 'Tab from the last group left the panel open');
    assertSameNode(document.activeElement, trigger);
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('opening moves focus into the pane, and Escape asks to close and returns focus to the trigger', () => {
  const { fixture, trigger } = render();
  try {
    const shown = open(fixture, trigger)!;
    assertSameNode(document.activeElement, shown.querySelector('input'), 'opening left focus on the trigger, and the pane is last in the document');
    key(document.activeElement as Element, 'Escape');
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.asked, [true, false]);
    assertNoNode(panel(), 'Escape did not close the panel');
    assertSameNode(document.activeElement, trigger, 'Escape dropped focus');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('a press outside asks to close, and a press inside the pane does not', () => {
  const { fixture, trigger } = render();
  try {
    const shown = open(fixture, trigger)!;
    shown.querySelector('input')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    assert.deepEqual(fixture.componentInstance.asked, [true], 'a press inside the pane closed it');
    let pulled = 0;
    trigger.addEventListener('focus', () => { pulled += 1; });
    fixture.nativeElement.querySelector('.elsewhere').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.asked, [true, false]);
    assertNoNode(panel());
    assert.equal(pulled, 0, 'an outside press moved focus to the trigger');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Tab from the last control closes the panel onto its trigger, and Apply closes it through open', () => {
  const { fixture, trigger } = render();
  try {
    const shown = open(fixture, trigger)!;
    const apply = shown.querySelector<HTMLElement>('.apply')!;
    apply.focus();
    assert.equal(key(apply, 'Tab').defaultPrevented, true);
    fixture.detectChanges();
    assertNoNode(panel(), 'Tab out did not close the panel');
    assertSameNode(document.activeElement, trigger);
    open(fixture, trigger)!.querySelector<HTMLElement>('.apply')!.click();
    fixture.detectChanges();
    assertNoNode(panel(), 'content inside the panel could not close it');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('Shift+Tab from the first control closes the panel onto its trigger', () => {
  const { fixture, trigger } = render();
  try {
    const first = open(fixture, trigger)!.querySelector<HTMLElement>('input')!;
    first.focus();
    assert.equal(key(first, 'Tab', true).defaultPrevented, true);
    fixture.detectChanges();
    assertNoNode(panel(), 'Shift+Tab out did not close the panel');
    assertSameNode(document.activeElement, trigger);
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});

test('opening focuses the pane itself when it holds no control', () => {
  const fixture = TestBed.createComponent(BareHost);
  fixture.detectChanges();
  try {
    const trigger = fixture.nativeElement.querySelector('arena-popover button') as HTMLButtonElement;
    const shown = open(fixture, trigger)!;
    assertSameNode(document.activeElement, shown, 'a pane with nothing to press did not take focus');
  } finally {
    fixture.destroy();
    disposeOverlays();
  }
});
