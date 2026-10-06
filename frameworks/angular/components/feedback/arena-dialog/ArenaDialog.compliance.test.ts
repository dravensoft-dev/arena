/* Every verdict in the `behavioural` map is earned by a named assertion above it, in
 * the order the dialog lives: focus.onOpen, focus.trap both ways, keyboard.Escape,
 * then focus.onClose last because it dismantles the panel the others need. The four
 * are undecidable from one element, so a wrong verdict here would pin a false claim.
 * The dialog is driven through a wrapper host because `content` and `footer` are
 * projected — a bare fixture has nothing focusable inside the panel to trap. The
 * invoker is appended to the shared document and removed in the finally: one
 * document is shared by the whole run and outlives the file that wrote it. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { ArenaFooter } from '../../../ProjectionMarkers';
import { ArenaDialog } from './ArenaDialog';

const BINDING = join(ANGULAR_COMPONENTS, 'feedback/arena-dialog/ArenaDialog.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaDialog, ArenaFooter],
  template: `
    <arena-dialog [open]="open()" [title]="title" eyebrow="Deployment" (close)="closed = closed + 1">
      <p>The current production build stays available for rollback for seven days.</p>
      <div footer>
        <button type="button">Cancel</button>
        <button type="button">Promote</button>
      </div>
    </arena-dialog>
  `,
})
class DialogHost {
  readonly open = signal(false);
  readonly title = 'Promote build 482 to production?';
  closed = 0;
}

function press(el: Element, key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

test('arena-dialog meets the dialog-modal pattern it binds', () => {
  const invoker = document.createElement('button');
  invoker.textContent = 'Promote build';
  document.body.appendChild(invoker);
  invoker.focus();
  assertSameNode(document.activeElement, invoker, 'sanity: the invoker must hold focus before the dialog opens');

  const fixture = TestBed.createComponent(DialogHost);
  try {
    fixture.detectChanges();
    const scrim = fixture.nativeElement.querySelector('arena-dialog') as HTMLElement;
    assertNoNode(scrim.querySelector('[role="dialog"]'), 'a closed dialog must render no panel');

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    const panel = scrim.querySelector('[role="dialog"]') as HTMLElement;
    assert.ok(panel, 'an open dialog must render its panel');

    const focusables = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled])'));
    assert.equal(focusables.length, 2, 'the fixture must project cancel and promote, and nothing else focusable');
    const [cancel, promote] = focusables;

    assertSameNode(document.activeElement, cancel,
      'focus.onOpen: opening did not move focus to the first focusable control inside the panel');

    promote.focus();
    const forward = press(promote, 'Tab');
    assert.equal(forward.defaultPrevented, true, 'focus.trap: Tab off the last control was not intercepted');
    assertSameNode(document.activeElement, cancel, 'focus.trap: Tab off the last control did not wrap to the first');

    const backward = press(cancel, 'Tab', true);
    assert.equal(backward.defaultPrevented, true, 'focus.trap: Shift+Tab off the first control was not intercepted');
    assertSameNode(document.activeElement, promote, 'focus.trap: Shift+Tab off the first control did not wrap to the last');

    const escape = press(document.activeElement as Element, 'Escape');
    assert.equal(escape.defaultPrevented, true, 'keyboard.Escape: Escape was not intercepted');
    assert.equal(fixture.componentInstance.closed, 1,
      'keyboard.Escape: Escape did not report through the dialog\'s own close output');

    assertPattern({
      root: scrim,
      bindingPath: BINDING,
      subjects: { default: panel },
      behavioural: {
        'focus.onOpen': true,
        'focus.trap': true,
        'keyboard.Escape': true,
        'focus.onClose': true,
      },
    });

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    assertNoNode(scrim.querySelector('[role="dialog"]'), 'closing did not remove the panel');
    assertSameNode(document.activeElement, invoker, 'focus.onClose: closing did not restore focus to the invoker');
  } finally {
    fixture.destroy();
    invoker.remove();
  }
});

test('the scrim dismisses and the panel does not -- a click inside the panel is stopped before it reaches the host', () => {
  const fixture = TestBed.createComponent(DialogHost);
  try {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const scrim = fixture.nativeElement.querySelector('arena-dialog') as HTMLElement;
    const panel = scrim.querySelector('[role="dialog"]') as HTMLElement;

    panel.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(fixture.componentInstance.closed, 0, 'a click inside the panel must not be read as a dismissal');

    scrim.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(fixture.componentInstance.closed, 1, 'a click on the scrim must dismiss');
  } finally {
    fixture.destroy();
  }
});

test('a closed dialog reports nothing, so its full-viewport host cannot dismiss what is behind it', () => {
  const fixture = TestBed.createComponent(DialogHost);
  try {
    fixture.detectChanges();
    const scrim = fixture.nativeElement.querySelector('arena-dialog') as HTMLElement;
    assert.equal(scrim.hasAttribute('data-arena-open'), false, 'a closed dialog must take the hidden branch of the open group');

    scrim.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    press(scrim, 'Escape');
    assert.equal(fixture.componentInstance.closed, 0, 'a closed dialog must report no dismissal');
  } finally {
    fixture.destroy();
  }
});
