/* Every chip is mounted INSIDE a calendar: ArenaCalendarState is a non-optional injection, so a
 * bare chip throws NG0201, and that is asserted here rather than designed away. The three
 * cases are picked by `interactive` and by `actionsEnabled`, never by whether (click) is
 * subscribed. `heard` counts what a CONSUMER hears through a template (click) binding, and
 * emissionsOf() counts the OUTPUT on the instance: Angular installs both a DOM listener and an
 * output subscription for a native event name, so the binding counts the sum and one is the
 * only passing number, while the sum alone cannot tell an emit from a bubble. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import type { ArenaCatSlot } from '../../../Api.generated';
import { ArenaCalendar } from '../arena-calendar/ArenaCalendar';
import { ArenaCalendarEvent } from './ArenaCalendarEvent';

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-calendar-event/ArenaCalendarEvent.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar timeZone="UTC" anchorDate="2027-03-15" view="day"
                    dayStart="09:00" dayEnd="11:00">
      <arena-calendar-event id="a" title="Standup" start="2027-03-15T09:00:00Z"
                            end="2027-03-15T10:00:00Z" [colorId]="1"
                            [disabled]="locked()" [actionsEnabled]="withActions()"
                            [interactive]="live()" (click)="heard = heard + 1">
        <button actions type="button">Delete</button>
      </arena-calendar-event>
    </arena-calendar>
  `,
})
class ChipHost {
  readonly locked = signal(false);
  readonly withActions = signal(false);
  readonly live = signal(true);
  heard = 0;
}

const open: ComponentFixture<ChipHost>[] = [];

function render(patch: { locked?: boolean; withActions?: boolean; live?: boolean } = {}): ComponentFixture<ChipHost> {
  const fixture = TestBed.createComponent(ChipHost);
  open.push(fixture);
  if (patch.locked !== undefined) fixture.componentInstance.locked.set(patch.locked);
  if (patch.withActions !== undefined) fixture.componentInstance.withActions.set(patch.withActions);
  if (patch.live !== undefined) fixture.componentInstance.live.set(patch.live);
  fixture.detectChanges();
  return fixture;
}

function emissionsOf(fixture: ComponentFixture<ChipHost>): { count: number } {
  const seen = { count: 0 };
  const chip = fixture.debugElement.query(By.directive(ArenaCalendarEvent)).componentInstance as ArenaCalendarEvent;
  chip.click.subscribe(() => { seen.count += 1; });
  return seen;
}

const closeAll = (): void => { for (const fixture of open.splice(0)) fixture.destroy(); };

function chipOf(fixture: ComponentFixture<unknown>): HTMLElement {
  const root = fixture.nativeElement as HTMLElement;
  return root.querySelector('[id^="arena-calendar-event-"]') as HTMLElement;
}

function bodyOf(chip: HTMLElement): HTMLElement {
  if (chip.tagName === 'BUTTON') return chip;
  const found = [...chip.querySelectorAll<HTMLElement>('button')]
    .find((button) => /^Standup,/.test(button.getAttribute('aria-label') ?? ''));
  assert.ok(found, 'the chip body button did not render');
  return found;
}

function kebabOf(chip: HTMLElement): HTMLElement {
  const found = chip.querySelector<HTMLElement>('arena-icon-button button');
  assert.ok(found, 'the kebab did not render');
  return found;
}

function assertKeysUnintercepted(el: HTMLElement): void {
  for (const key of ['Enter', ' ']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false,
      `the chip intercepted "${key}", which a native button already activates on`);
  }
}

test('arena-calendar-event meets all three of its declared shapes, and `interactive` picks one', () => {
  try {
    assertPatternCases({
      bindingPath: BINDING,
      cases: {
        clickable: () => {
          const fixture = render();
          const emitted = emissionsOf(fixture);
          const chip = chipOf(fixture);
          assert.equal(chip.tagName, 'BUTTON', 'with no kebab the chip root IS the button');
          assertKeysUnintercepted(chip);
          assert.equal(chip.hasAttribute('aria-disabled'), false,
            'an activatable chip must not announce itself as disabled');
          chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          fixture.detectChanges();
          assert.equal(emitted.count, 1, 'sanity: a real click must reach the output');
          assert.equal(fixture.componentInstance.heard, 1,
            'a consumer must hear it exactly once -- two would be the emit plus the native event');

          const off = render({ locked: true });
          const offEmitted = emissionsOf(off);
          const locked = chipOf(off);
          assert.equal(locked.getAttribute('aria-disabled'), 'true',
            'a disabled chip must say so through aria-disabled, keeping its place in the grid sequence');
          assert.equal(locked.hasAttribute('disabled'), false,
            'the chip reflects through aria-disabled, never the native attribute');
          locked.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          off.detectChanges();
          assert.equal(offEmitted.count, 0, 'a disabled chip still emitted click');
          assert.equal(off.componentInstance.heard, 0,
            'and nothing reached the consumer, so the native event did not escape either');

          return {
            root: chip,
            behavioural: { 'states.disabled': true, 'keyboard.Space': true, 'keyboard.Enter': true },
          };
        },

        'clickable-with-actions': () => {
          const fixture = render({ withActions: true });
          const emitted = emissionsOf(fixture);
          const chip = chipOf(fixture);
          assert.equal(chip.tagName, 'DIV',
            'a kebab cannot nest inside a button, so the root drops to a div');
          const body = bodyOf(chip);
          assertKeysUnintercepted(body);
          assert.equal(body.hasAttribute('aria-disabled'), false,
            'an activatable chip body must not announce itself as disabled');
          body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          fixture.detectChanges();
          assert.equal(emitted.count, 1, 'sanity: a click on the body reaches the output');
          assert.equal(fixture.componentInstance.heard, 1,
            'a consumer must hear it exactly once -- two would be the emit plus the native event');

          const off = render({ withActions: true, locked: true });
          const offEmitted = emissionsOf(off);
          const offBody = bodyOf(chipOf(off));
          assert.equal(offBody.getAttribute('aria-disabled'), 'true',
            'the disabled state must reach the BODY button, which is where the interactivity moved');
          offBody.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          off.detectChanges();
          assert.equal(offEmitted.count, 0, 'a disabled chip body still emitted click');
          assert.equal(off.componentInstance.heard, 0,
            'and nothing reached the consumer, so the native event did not escape either');

          return {
            root: chip,
            subjects: { default: body },
            behavioural: { 'states.disabled': true, 'keyboard.Space': true, 'keyboard.Enter': true },
          };
        },

        inert: () => {
          const fixture = render({ live: false });
          const emitted = emissionsOf(fixture);
          const chip = chipOf(fixture);
          assert.equal(chip.tagName, 'DIV',
            'a chip the consumer declared non-interactive is a div, even with (click) subscribed -- '
            + '`interactive` decides the shape, which is the whole point of it being a member');
          assertNoNode(chip.querySelector('button'), 'an inert chip rendered a button');
          chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          fixture.detectChanges();
          assert.equal(emitted.count, 0, 'a non-interactive chip must not emit click');
          assert.equal(fixture.componentInstance.heard, 0,
            'and the consumer heard nothing either: an inert chip stops the click, or the native '
            + 'event would reach them as an activation nobody made');

          const withActions = render({ live: false, withActions: true });
          const root = chipOf(withActions);
          assert.equal(root.tagName, 'DIV',
            'actionsEnabled draws a kebab but does not make the chip pressable -- the root stays a div');
          assert.equal(root.hasAttribute('role'), false,
            'and it claims no interactive role, which is what `none` asserts about this case');

          return { root };
        },
      },
    });
  } finally {
    closeAll();
  }
});

test('the panel opens onto its own controls, arrows reach the kebab, and Escape stops at it', () => {
  const fixture = render({ withActions: true });
  try {
    const chip = chipOf(fixture);
    const body = bodyOf(chip);
    const kebab = kebabOf(chip);

    assertNoNode(chip.querySelector('button[actions]'),
      'the consumer\'s controls must not be in the tree while the panel is shut -- that is what keeps '
      + 'the schedule at one tab stop');
    assert.equal(kebab.getAttribute('tabindex'), '-1', 'the kebab is reached by arrows, never by Tab');

    body.focus();
    body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    assertSameNode(document.activeElement, kebab, 'ArrowRight did not step from the body to the kebab');

    kebab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    assertSameNode(document.activeElement, body, 'ArrowLeft did not step back from the kebab to the body');

    kebab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    const action = chip.querySelector<HTMLElement>('button[actions]');
    assert.ok(action, 'the panel did not project the consumer\'s controls');
    assertSameNode(document.activeElement, action,
      'opening the panel must move focus into it -- landing on the button just pressed leaves no way in');

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    action.dispatchEvent(escape);
    fixture.detectChanges();
    assertNoNode(chip.querySelector('button[actions]'), 'Escape did not close the panel');
    assertSameNode(document.activeElement, kebab, 'Escape did not return focus to the kebab');
  } finally {
    fixture.destroy();
  }
});

test('a chip outside a calendar throws rather than rendering an unplaced one', () => {
  assert.throws(() => TestBed.createComponent(ArenaCalendarEvent), /NG0201|No provider|ArenaCalendarState/,
    'ArenaCalendarState is not optional on purpose: a chip has no geometry of its own, and a silent '
    + 'unplaced render is worse than the injector error');
});

@Component({
  standalone: true,
  imports: [ArenaCalendar, ArenaCalendarEvent],
  template: `
    <arena-calendar timeZone="UTC" anchorDate="2027-03-15" view="day" dayStart="09:00" dayEnd="11:00">
      <arena-calendar-event id="a" title="Standup" start="2027-03-15T09:00:00Z"
                            end="2027-03-15T10:00:00Z" [colorId]="colorId()" />
    </arena-calendar>
  `,
})
class IdentityHost {
  readonly colorId = signal<ArenaCatSlot | undefined>(undefined);
}

function chipIdentity(colorId: number | undefined): { id: string | null; style: string | null } {
  const fixture = TestBed.createComponent(IdentityHost);
  try {
    fixture.componentInstance.colorId.set(colorId as ArenaCatSlot | undefined);
    fixture.detectChanges();
    const chip = chipOf(fixture);
    return { id: chip.getAttribute('data-arena-color-id'), style: chip.style.background || chip.style.borderLeftColor };
  } finally {
    fixture.destroy();
  }
}

test('a chip renders its identity as an attribute, clamped as the ramp clamps, with no colour of its own', () => {
  assert.equal(chipIdentity(undefined).id, '1', 'an event without a colorId takes slot 1');
  assert.equal(chipIdentity(9).id, '8');
  assert.equal(chipIdentity(2.6).id, '3');
  assert.equal(chipIdentity(4).id, '4');
  assert.equal(chipIdentity(4).style, '', 'no inline background or border colour');
});
