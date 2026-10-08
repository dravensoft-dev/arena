import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { ArenaDialog } from './arena-dialog/ArenaDialog.tsx';
import { ArenaConfirmDialog } from './arena-confirm-dialog/ArenaConfirmDialog.tsx';

afterEach(cleanup);

function press(el: Element, key: string, init: KeyboardEventInit = {}) {
  act(() => {
    el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  });
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

test('ArenaDialog closes on Escape -- keyboard.Escape is met', () => {

  let closed = false;
  const container = mount(
    <ArenaDialog open onClose={() => { closed = true; }} title="t"><p>b</p></ArenaDialog>,
  );
  press(container!.querySelector<HTMLElement>('[role="dialog"]')!, 'Escape');
  assert.equal(closed, true, 'Escape did not reach the dialog\'s own dismissal channel');
});

test('ArenaDialog closes on a backdrop click too -- the mouse path Escape joins rather than replaces', () => {

  let closed = false;
  const container = mount(
    <ArenaDialog open onClose={() => { closed = true; }} title="t"><p>b</p></ArenaDialog>,
  );
  click(container!.firstElementChild!);
  assert.equal(closed, true, 'the backdrop click must still dismiss');
});

test('ArenaDialog moves focus to the first focusable inside the panel on open -- focus.onOpen is met', () => {

  const invoker = document.createElement('button');
  document.body.appendChild(invoker);
  invoker.focus();
  assert.equal(document.activeElement, invoker, 'precondition: the invoker holds focus');

  const container = mount(
    <ArenaDialog open onClose={() => {}} title="t"><button type="button">Inside</button></ArenaDialog>,
  );
  assert.notEqual(document.activeElement, invoker, 'focus stayed on the invoker, outside the modal');
  assert.equal(
    document.activeElement,
    container.querySelector<HTMLElement>('button')!,
    'the dialog\'s first focusable descendant did not receive focus',
  );
  invoker.remove();
});

function DialogHarness() {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button type="button" data-role="invoker" onClick={() => setOpen(true)}>Open</button>
      <ArenaDialog open={open} onClose={() => setOpen(false)} title="t">
        <button type="button" data-role="inside">Inside</button>
      </ArenaDialog>
    </div>
  );
}

test('ArenaDialog restores focus to the invoker on close -- focus.onClose is met', () => {

  const container = mount(<DialogHarness />);
  const invoker = container.querySelector<HTMLElement>('[data-role="invoker"]');
  invoker!.focus();
  assert.equal(document.activeElement, invoker, 'precondition: the invoker holds focus');
  assert.equal(container.querySelector<HTMLElement>('[role="dialog"]')!, null, 'precondition: the dialog starts closed');

  click(invoker!);
  assert.notEqual(container.querySelector<HTMLElement>('[role="dialog"]')!, null, 'precondition: the click opened the dialog');

  const inside = container.querySelector<HTMLElement>('[data-role="inside"]');
  assert.equal(document.activeElement, inside, 'precondition: opening put focus inside the dialog');

  click(container!.querySelector<HTMLElement>('[role="dialog"]')!.parentElement!);
  assert.equal(container.querySelector<HTMLElement>('[role="dialog"]')!, null, 'precondition: the dialog really closed');

  assert.equal(document.activeElement, invoker, 'focus was not restored to the invoker that opened the dialog');
});

test('ArenaDialog wraps Shift+Tab from the first focusable to the last -- focus.trap is met at the boundary', () => {
  const container = mount(
    <ArenaDialog open onClose={() => {}} title="Delete project"
      footer={<><button type="button">Cancel</button><button type="button">Delete</button></>}
    ><p>Body</p></ArenaDialog>,
  );
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  const buttons = panel!.querySelectorAll<HTMLElement>('button');
  assert.equal(buttons.length, 2, 'precondition: the panel has exactly the two footer buttons');
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  first!.focus();
  assert.equal(document.activeElement, first, 'precondition: the first focusable holds focus');
  press(first!, 'Tab', { shiftKey: true });
  assert.equal(document.activeElement, last, 'Shift+Tab at the first boundary did not wrap to the last');
});

test('ArenaDialog wraps Tab from the last focusable to the first -- the other boundary', () => {
  const container = mount(
    <ArenaDialog open onClose={() => {}} title="Delete project"
      footer={<><button type="button">Cancel</button><button type="button">Delete</button></>}
    ><p>Body</p></ArenaDialog>,
  );
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  const buttons = panel!.querySelectorAll<HTMLElement>('button');
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  last!.focus();
  assert.equal(document.activeElement, last, 'precondition: the last focusable holds focus');
  press(last!, 'Tab');
  assert.equal(document.activeElement, first, 'Tab at the last boundary did not wrap to the first');
});

test('ArenaConfirmDialog closes on Escape -- keyboard.Escape is met', () => {

  let cancelled = false;
  const container = mount(
    <ArenaConfirmDialog open onCancel={() => { cancelled = true; }} onConfirm={() => {}} title="t" confirmLabel="Delete" />,
  );
  press(container!.querySelector<HTMLElement>('[role="alertdialog"], [role="dialog"]')!, 'Escape');
  assert.equal(cancelled, true, 'Escape did not reach the dialog\'s own dismissal channel');
});

test('ArenaConfirmDialog still does NOT close on a scrim click -- the inertness is deliberate and stays', () => {

  let cancelled = false;
  const container = mount(
    <ArenaConfirmDialog open onCancel={() => { cancelled = true; }} onConfirm={() => {}} title="t" confirmLabel="Delete" />,
  );
  click(container!.firstElementChild!);
  assert.equal(cancelled, false, 'the scrim click is deliberately inert -- ArenaConfirmDialog does not close on click-outside');
});

test('ArenaConfirmDialog moves focus to the first focusable inside the panel on open -- focus.onOpen is met', () => {

  const invoker = document.createElement('button');
  document.body.appendChild(invoker);
  invoker.focus();
  assert.equal(document.activeElement, invoker, 'precondition: the invoker holds focus');

  const container = mount(<ArenaConfirmDialog open onCancel={() => {}} onConfirm={() => {}} title="t" confirmLabel="Delete" />);
  assert.notEqual(document.activeElement, invoker, 'focus stayed on the invoker, outside the modal');
  assert.equal(
    document.activeElement,
    container.querySelector<HTMLElement>('button')!,
    'the dialog\'s first focusable descendant did not receive focus',
  );
  invoker.remove();
});

test('ArenaConfirmDialog DOES focus the confirmation input when requireText is set -- the one branch its exception does not cover', () => {

  const invoker = document.createElement('button');
  document.body.appendChild(invoker);
  invoker.focus();

  const container = mount(
    <ArenaConfirmDialog open onCancel={() => {}} onConfirm={() => {}} title="t" confirmLabel="Delete" requireText="DELETE" />,
  );
  const input = container.querySelector<HTMLInputElement>('input');
  assert.notEqual(input, null, 'precondition: requireText renders the confirmation input');
  assert.equal(document.activeElement, input, 'the confirmation input did not take focus on open');
  invoker.remove();
});

test('ArenaConfirmDialog wraps Shift+Tab from the first focusable to the last -- focus.trap is met at the boundary', () => {
  const container = mount(
    <ArenaConfirmDialog open onCancel={() => {}} onConfirm={() => {}} title="Delete project" confirmLabel="Delete" />,
  );
  const panel = container.querySelector<HTMLElement>('[role="alertdialog"]');
  const buttons = panel!.querySelectorAll<HTMLElement>('button');
  assert.equal(buttons.length, 2, 'precondition: the panel has exactly the Cancel and Delete buttons');
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  first!.focus();
  assert.equal(document.activeElement, first, 'precondition: the first focusable holds focus');
  press(first!, 'Tab', { shiftKey: true });
  assert.equal(document.activeElement, last, 'Shift+Tab at the first boundary did not wrap to the last');
});

test('ArenaConfirmDialog wraps Tab from the last focusable to the first -- the other boundary', () => {

  const container = mount(
    <ArenaConfirmDialog open onCancel={() => {}} onConfirm={() => {}} title="Delete project"
      confirmLabel="Delete" requireText="DELETE" />,
  );
  const panel = container.querySelector<HTMLElement>('[role="alertdialog"]');
  const first = panel!.querySelector<HTMLInputElement>('input');
  assert.notEqual(first, null, 'precondition: requireText renders the confirmation input');
  const cancel = [...panel!.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === 'Cancel');
  const confirm = [...panel!.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === 'Delete');
  assert.equal((confirm as HTMLButtonElement).disabled, true, 'precondition: the confirm button is locked, so it is not focusable');
  act(() => { cancel!.focus(); });
  assert.equal(document.activeElement, cancel, 'precondition: the last focusable holds focus');
  press(cancel!, 'Tab');
  assert.equal(document.activeElement, first, 'Tab at the last boundary did not wrap to the first');
});

function ConfirmDialogHarness() {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button type="button" data-role="invoker" onClick={() => setOpen(true)}>Open</button>
      <ArenaConfirmDialog
        open={open}
        onCancel={() => setOpen(false)}
        onConfirm={() => {}}
        title="t"
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}

test('ArenaConfirmDialog restores focus to the invoker on close -- focus.onClose is met', () => {

  const container = mount(<ConfirmDialogHarness />);
  const invoker = container.querySelector<HTMLElement>('[data-role="invoker"]');
  invoker!.focus();
  assert.equal(document.activeElement, invoker, 'precondition: the invoker holds focus');

  click(invoker!);
  const dialog = container.querySelector<HTMLElement>('[role="alertdialog"]');
  assert.notEqual(dialog, null, 'precondition: the click opened the dialog');

  const cancel = [...dialog!.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === 'Cancel');
  assert.notEqual(cancel, undefined, 'precondition: the Cancel button is present');
  assert.equal(document.activeElement, cancel, 'precondition: opening put focus inside the dialog');

  click(cancel!);
  assert.equal(container.querySelector<HTMLElement>('[role="alertdialog"]')!, null, 'precondition: Cancel really closed the dialog');

  assert.equal(document.activeElement, invoker, 'focus was not restored to the invoker that opened the dialog');
});
