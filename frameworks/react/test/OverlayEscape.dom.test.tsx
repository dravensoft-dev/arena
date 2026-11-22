/* Every overlay Arena draws takes Escape once: a key whose default a descendant already prevented
 * closes nothing, a fresh one closes the overlay, and two dialogs nested in place close one at a time. */

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useRef } from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog.tsx';
import { ArenaConfirmDialog } from '../components/feedback/arena-confirm-dialog/ArenaConfirmDialog.tsx';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding.tsx';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette.tsx';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet.tsx';
import { ArenaCalendar } from '../components/display/arena-calendar/ArenaCalendar.tsx';
import { useArenaDialogModal } from '../UseDialogModal.ts';

afterEach(cleanup);

type Closed = (name: string) => () => void;

const OVERLAYS: ReadonlyArray<readonly [string, (closed: Closed) => React.ReactElement]> = [
  ['ArenaDialog', (c) => <ArenaDialog open title="Promote build" onClose={c('close')}><button>inside</button></ArenaDialog>],
  ['ArenaConfirmDialog', (c) => <ArenaConfirmDialog open title="Delete project" onCancel={c('cancel')} onConfirm={c('confirm')}>Sure?</ArenaConfirmDialog>],
  ['ArenaOnboarding', (c) => <ArenaOnboarding open steps={[{ title: 'Welcome' }]} onSkip={c('skip')} />],
  ['ArenaCommandPalette', (c) => <ArenaCommandPalette open commands={[{ id: 'a', label: 'Alpha' }]} onClose={c('close')} onRun={c('run')} />],
  ['ArenaSheet', (c) => <ArenaSheet open title="Filters" onClose={c('close')}>body</ArenaSheet>],
];

function escapeOn(target: Element, handled: boolean): void {
  const stop = (event: Event) => event.preventDefault();
  if (handled) target.addEventListener('keydown', stop);
  act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  target.removeEventListener('keydown', stop);
}

const PANEL = '[role="dialog"], [role="alertdialog"], [data-arena-surface="floating"]';

for (const [name, overlay] of OVERLAYS) {
  for (const [row, handled, expected] of [['an Escape a descendant already handled', true, 0], ['a fresh Escape', false, 1]] as const) {
    test(`${name}: ${row} closes it ${expected} time(s)`, () => {
      const calls: string[] = [];
      const container = mount(overlay((which) => () => { calls.push(which); }));
      const panel = container.querySelector<HTMLElement>(PANEL)!;
      const target = panel.querySelector<HTMLElement>('button, input')!;
      target.focus();
      escapeOn(target, handled);
      const dismissals = calls.filter((which) => which !== 'run' && which !== 'confirm');
      assert.equal(dismissals.length, expected, `${name} on ${row}: dismissals were ${JSON.stringify(calls)}`);
    });
  }
}

test('ArenaCalendar inside ArenaDialog: Escape on its grid outside a cell leaves the dialog open', () => {
  let closed = 0;
  const container = mount(<ArenaDialog open title="Pick a slot" onClose={() => { closed += 1; }}><ArenaCalendar anchorDate="2026-11-23" /></ArenaDialog>);
  const grid = container.querySelector<HTMLElement>('[role="dialog"] [role="grid"]')!;
  escapeOn(grid, false);
  assert.equal(closed, 0, 'the calendar handled this Escape, so the dialog around it must stay open');
});

function Overlay({ name, dismissed, before, after }: { name: string; dismissed: string[]; before?: React.ReactNode; after?: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useArenaDialogModal({ open: true, panelRef, onDismiss: () => { dismissed.push(name); } });
  return (
    <div onKeyDown={onKeyDown}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={name} tabIndex={-1}>
        {before}
        <button type="button" id={`${name}-button`}>{name}</button>
        {after}
      </div>
    </div>
  );
}

for (const [row, shiftKey] of [['Tab', false], ['Shift+Tab', true]] as const) {
  test(`two overlays nested in place: ${row} from the inner panel's only stop stays inside it`, () => {
    const dismissed: string[] = [];
    const inner = <Overlay name="inner" dismissed={dismissed} />;
    mount(shiftKey
      ? <Overlay name="outer" dismissed={dismissed} before={inner} />
      : <Overlay name="outer" dismissed={dismissed} after={inner} />);
    const target = document.getElementById('inner-button')!;
    target.focus();
    act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })); });
    assert.equal(document.activeElement?.id, 'inner-button', `${row} in the inner panel must not wrap on to the outer panel`);
  });
}

test('two ArenaDialogs nested in place close one at a time', () => {
  const dismissed: string[] = [];
  mount(
    <ArenaDialog open title="outer" onClose={() => { dismissed.push('outer'); }}>
      <ArenaDialog open title="inner" onClose={() => { dismissed.push('inner'); }}><button id="inner-ok">ok</button></ArenaDialog>
      <button id="outer-ok">ok</button>
    </ArenaDialog>,
  );
  const press = (id: string) => {
    const target = document.getElementById(id)!;
    target.focus();
    act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
  };
  press('inner-ok');
  assert.deepEqual(dismissed, ['inner'], 'Escape in the inner dialog closes the inner dialog only');
  press('outer-ok');
  assert.deepEqual(dismissed, ['inner', 'outer'], 'a second Escape, in the outer dialog, closes the outer one');
});
