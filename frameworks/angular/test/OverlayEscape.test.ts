/* Every overlay Arena draws takes Escape once: a key whose default something inside already prevented
 * closes nothing, a fresh one closes the overlay, and two dialogs nested in place close one at a time. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';
import { ArenaConfirmDialog } from '../components/feedback/arena-confirm-dialog/ArenaConfirmDialog';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar';

const root = document.documentElement;
before(() => { root.style.setProperty('--bp-md', '768px'); });
after(() => { root.style.removeProperty('--bp-md'); });

const OVERLAYS = [
  { name: 'ArenaDialog', type: ArenaDialog, inputs: { title: 'Promote build' }, output: 'close', target: 'button, [role="dialog"]' },
  { name: 'ArenaConfirmDialog', type: ArenaConfirmDialog, inputs: { title: 'Delete project' }, output: 'cancel', target: 'button, [role="alertdialog"]' },
  { name: 'ArenaOnboarding', type: ArenaOnboarding, inputs: { steps: [{ title: 'Welcome' }] }, output: 'skip', target: 'button, [role="dialog"]' },
  { name: 'ArenaCommandPalette', type: ArenaCommandPalette, inputs: { commands: [{ id: 'a', label: 'Alpha' }] }, output: 'close', target: 'input' },
  { name: 'ArenaSheet', type: ArenaSheet, inputs: { title: 'Filters' }, output: 'close', target: 'button' },
] as const;

function escapeOn(target: Element, handled: boolean): void {
  const stop = (event: Event) => event.preventDefault();
  if (handled) document.addEventListener('keydown', stop, true);
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  document.removeEventListener('keydown', stop, true);
}

for (const { name, type, inputs, output, target: selector } of OVERLAYS) {
  for (const [row, handled, expected] of [['an Escape something inside already handled', true, 0], ['a fresh Escape', false, 1]] as const) {
    test(`${name}: ${row} closes it ${expected} time(s)`, () => {
      const fixture = TestBed.createComponent(type as never);
      fixture.componentRef.setInput('open', true);
      for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
      fixture.detectChanges();
      let closed = 0;
      (fixture.componentInstance as unknown as Record<string, { subscribe(next: () => void): void }>)[output]!.subscribe(() => { closed += 1; });
      const target = (fixture.nativeElement as Element).querySelector(selector)!;
      (target as HTMLElement).focus();
      escapeOn(target, handled);
      assert.equal(closed, expected, `${name} on ${row}: ${output} fired ${closed} time(s)`);
    });
  }
}

@Component({
  selector: 'app-calendar-in-dialog',
  imports: [ArenaDialog, ArenaCalendar],
  template: `<arena-dialog open title="Pick a slot" (close)="closed = closed + 1"><arena-calendar anchorDate="2026-11-23" /></arena-dialog>`,
})
class CalendarInDialog {
  closed = 0;
}

test('ArenaCalendar inside ArenaDialog: Escape on its grid outside a cell leaves the dialog open', () => {
  const fixture = TestBed.createComponent(CalendarInDialog);
  fixture.detectChanges();
  const grid = (fixture.nativeElement as Element).querySelector('[role="dialog"] [role="grid"]')!;
  escapeOn(grid, false);
  assert.equal(fixture.componentInstance.closed, 0, 'the calendar handled this Escape, so the dialog around it must stay open');
});
