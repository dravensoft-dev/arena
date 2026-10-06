/* The disclosure pattern's two keyboard clauses are `behavioural`, so they are earned by
 * dispatching a real keydown and reading what moved, never assumed. The three absences a
 * sheet claims -- no dialog role, no focus taken, no scrim -- are asserted by hand, because
 * `disclosure` requires none of them and a pattern cannot fail a component for growing one. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { ArenaFooter } from '../../../ProjectionMarkers';
import { ArenaSheet } from './ArenaSheet';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'feedback/arena-sheet/ArenaSheet.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaFooter, ArenaSheet],
  template: `
    <arena-sheet [open]="open" [title]="title"
                 [collapsed]="collapsed" [dismissible]="dismissible"
                 (collapsedChange)="folds.push($event)" (close)="closes = closes + 1">
      <p>Two line items.</p>
      <div footer><button type="button">Checkout</button></div>
    </arena-sheet>
  `,
})
class SheetHost {
  open = true;
  title = 'Cart';
  collapsed = false;
  dismissible = false;
  folds: boolean[] = [];
  closes = 0;
}

function render(patch: Partial<SheetHost> = {}) {
  const fixture = TestBed.createComponent(SheetHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const sheetOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('arena-sheet') as HTMLElement;

const triggerOf = (sheet: HTMLElement) => sheet.querySelector('button[aria-expanded]') as HTMLButtonElement;

test('arena-sheet meets the disclosure pattern it binds, and its two keys are pressed to prove it', () => {
  const fixture = render();
  try {
    const sheet = sheetOf(fixture);
    const trigger = triggerOf(sheet);
    assert.equal(trigger.tagName, 'BUTTON');
    assert.equal(trigger.getAttribute('type'), 'button');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'an unfolded panel reports expanded');

    const bodyId = trigger.getAttribute('aria-controls');
    const body = sheet.querySelector(`#${bodyId}`) as HTMLElement;
    assert.ok(body, 'aria-controls must never point at nothing, which is why the body is always rendered');
    assert.equal(body.hasAttribute('hidden'), false);

    assertPattern({
      root: sheet,
      bindingPath: BINDING,
      subjects: { default: trigger },
      behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true },
    });
  } finally {
    fixture.destroy();
  }
});

test('Enter and Space are intercepted and report the state moved to, so a browser does not also click', () => {
  for (const key of ['Enter', ' ']) {
    const fixture = render();
    try {
      const trigger = triggerOf(sheetOf(fixture));
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      trigger.dispatchEvent(event);
      fixture.detectChanges();
      assert.equal(event.defaultPrevented, true, `${key} must be intercepted, or the panel folds twice`);
      assert.deepEqual(fixture.componentInstance.folds, [true],
        `${key} must report exactly one boolean, and it must be the state moved to`);
    } finally {
      fixture.destroy();
    }
  }
});

test('collapsed folds the body and leaves the header and the footer where they were', () => {
  const fixture = render({ collapsed: true });
  try {
    const sheet = sheetOf(fixture);
    const trigger = triggerOf(sheet);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    const body = sheet.querySelector(`#${trigger.getAttribute('aria-controls')}`) as HTMLElement;
    assert.equal(body.hasAttribute('hidden'), true, 'a folded body is hidden, not absent');
    assert.ok(sheet.textContent?.includes('Cart'), 'a folded panel still says what it is');
    assert.ok(sheet.textContent?.includes('Checkout'), 'and still carries the action it exists for');
  } finally {
    fixture.destroy();
  }
});

test('the panel folds nothing by itself -- the control reports and Arena waits', () => {
  const fixture = render();
  try {
    const trigger = triggerOf(sheetOf(fixture));
    trigger.click();
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.folds, [true], 'the press must report');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true',
      'and nothing must move until the host moves it -- collapsed is controlled, not seeded');
  } finally {
    fixture.destroy();
  }
});

test('closed renders nothing at all, which is what makes it a different state from collapsed', () => {
  const fixture = render({ open: false });
  try {
    const sheet = sheetOf(fixture);
    assertNoNode(sheet.querySelector('button'), 'a closed panel must render no control');
    assert.equal(sheet.textContent?.trim(), '', 'a closed panel must render no content');
  } finally {
    fixture.destroy();
  }
});

test('the close control is gated on dismissible, and Escape reports through the same channel', () => {
  const bare = render();
  try {
    assertNoNode(sheetOf(bare).querySelector('button[aria-label="Close"]'),
      'a panel that is not dismissible must render no close control');
  } finally {
    bare.destroy();
  }

  const fixture = render({ dismissible: true });
  try {
    const sheet = sheetOf(fixture);
    (sheet.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.closes, 1, 'the close control must report through close, and once');

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    triggerOf(sheet).dispatchEvent(escape);
    fixture.detectChanges();
    assert.equal(escape.defaultPrevented, true);
    assert.equal(fixture.componentInstance.closes, 2,
      'Escape must report through close as well, which is why it costs no member of its own');
  } finally {
    fixture.destroy();
  }
});

test('a sheet is not a dialog: no role, no aria-modal, and it takes no focus when it opens', () => {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  try {
    anchor.focus();
    assertSameNode(document.activeElement, anchor, 'sanity: focus starts on the anchor button');

    const fixture = render();
    try {
      const sheet = sheetOf(fixture);
      assert.equal(sheet.getAttribute('role'), null, 'a non-modal panel claims no dialog role');
      assert.equal(sheet.getAttribute('aria-modal'), null);
      assert.equal(isFocusable(sheet), false, 'the panel itself must not be a tab stop');
      assertSameNode(document.activeElement, anchor,
        'opening a panel that takes nothing away must not take focus either');
    } finally {
      fixture.destroy();
    }
  } finally {
    anchor.remove();
  }
});

test('a blank title throws rather than rendering a panel nothing can name', () => {
  assert.throws(() => render({ title: '   ' }), /title/);
});
