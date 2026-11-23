/* The modal script every dialog-modal component answers: Escape dismisses, the scrim dismisses
 * or does not, focus enters on open and returns on close, Tab wraps at both ends. One row per
 * component, one test per requirement; DialogModal.dom.test.tsx reads this file for the
 * requirement strings and the component names in the titles and rows below. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { ArenaDialog } from './arena-dialog/ArenaDialog.tsx';
import { ArenaConfirmDialog } from './arena-confirm-dialog/ArenaConfirmDialog.tsx';
import { ArenaOnboarding } from './arena-onboarding/ArenaOnboarding.tsx';

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

const THREE_STEPS = [
  { title: 'Welcome', body: 'One' },
  { title: 'ArenaCommand palette', body: 'Two' },
  { title: 'All set', body: 'Three' },
];

interface ModalRow {
  name: string;
  role: string;
  scrimDismisses: boolean;
  buttons: number;
  element: (open: boolean, dismiss: () => void) => React.ReactElement;
  close: (panel: HTMLElement) => Element;
}

const ROWS: ModalRow[] = [
  {
    name: 'ArenaDialog', role: 'dialog', scrimDismisses: true, buttons: 2,
    element: (open, dismiss) => (
      <ArenaDialog open={open} onClose={dismiss} title="Delete project"
        footer={<><button type="button">Cancel</button><button type="button">Delete</button></>}
      ><p>Body</p></ArenaDialog>
    ),
    close: (panel) => panel.parentElement!,
  },
  {
    name: 'ArenaConfirmDialog', role: 'alertdialog', scrimDismisses: false, buttons: 2,
    element: (open, dismiss) => (
      <ArenaConfirmDialog open={open} onCancel={dismiss} onConfirm={() => {}} title="Delete project"
        confirmLabel="Delete" cancelLabel="Cancel" />
    ),
    close: (panel) => [...panel.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === 'Cancel')!,
  },
  {
    name: 'ArenaOnboarding', role: 'dialog', scrimDismisses: true, buttons: 3,
    element: (open, dismiss) => (
      <ArenaOnboarding open={open} steps={THREE_STEPS} index={1} onSkip={dismiss} onBack={() => {}} onNext={() => {}} />
    ),
    close: (panel) => panel.parentElement!,
  },
];

function panelOf(container: HTMLElement, row: ModalRow) {
  const panel = container.querySelector<HTMLElement>(`[role="${row.role}"]`);
  assert.notEqual(panel, null, `${row.name}: precondition: the panel is drawn`);
  return panel!;
}

test('keyboard.Escape is met by every modal: Escape on the panel reaches the dismissal channel', () => {
  assert.ok(ROWS.length > 0, 'the modal rows are not empty');
  for (const row of ROWS) {
    let dismissed = false;
    const container = mount(row.element(true, () => { dismissed = true; }));
    press(panelOf(container, row), 'Escape');
    assert.equal(dismissed, true, `${row.name}: Escape did not reach the dialog's own dismissal channel`);
    cleanup();
  }
});

test('a scrim click dismisses the modals that take click-outside and is deliberately inert on the confirm', () => {
  assert.ok(ROWS.length > 0, 'the modal rows are not empty');
  for (const row of ROWS) {
    let dismissed = false;
    const container = mount(row.element(true, () => { dismissed = true; }));
    const scrim = panelOf(container, row).parentElement;
    assert.notEqual(scrim, null, `${row.name}: precondition: the panel sits inside the scrim`);
    click(scrim!);
    assert.equal(
      dismissed,
      row.scrimDismisses,
      row.scrimDismisses
        ? `${row.name}: the scrim click must still dismiss`
        : `${row.name}: the scrim click is deliberately inert -- it does not close on click-outside`,
    );
    cleanup();
  }
});

test('focus.onOpen is met by every modal: focus moves from the invoker to the first focusable in the panel', () => {
  assert.ok(ROWS.length > 0, 'the modal rows are not empty');
  for (const row of ROWS) {
    const invoker = document.createElement('button');
    document.body.appendChild(invoker);
    try {
      invoker.focus();
      assert.equal(document.activeElement, invoker, `${row.name}: precondition: the invoker holds focus`);

      const container = mount(row.element(true, () => {}));
      assert.notEqual(document.activeElement, invoker, `${row.name}: focus stayed on the invoker, outside the modal`);
      assert.equal(
        document.activeElement,
        panelOf(container, row).querySelector<HTMLElement>('button')!,
        `${row.name}: the first focusable descendant did not receive focus`,
      );
    } finally {
      invoker.remove();
      cleanup();
    }
  }
});

test('focus.onClose is met by every modal: focus returns to the invoker that opened it', () => {
  assert.ok(ROWS.length > 0, 'the modal rows are not empty');
  for (const row of ROWS) {
    function Host() {
      const [open, setOpen] = React.useState(false);
      return (
        <div>
          <button type="button" data-role="invoker" onClick={() => setOpen(true)}>Open</button>
          {row.element(open, () => setOpen(false))}
        </div>
      );
    }
    const container = mount(<Host />);
    const invoker = container.querySelector<HTMLElement>('[data-role="invoker"]');
    invoker!.focus();
    assert.equal(document.activeElement, invoker, `${row.name}: precondition: the invoker holds focus`);
    assert.equal(container.querySelector(`[role="${row.role}"]`), null, `${row.name}: precondition: it starts closed`);

    click(invoker!);
    const panel = panelOf(container, row);
    assert.equal(
      document.activeElement,
      panel.querySelector<HTMLElement>('button'),
      `${row.name}: precondition: opening put focus inside the modal`,
    );

    click(row.close(panel));
    assert.equal(container.querySelector(`[role="${row.role}"]`), null, `${row.name}: precondition: it really closed`);
    assert.equal(document.activeElement, invoker, `${row.name}: focus was not restored to the invoker that opened it`);
    cleanup();
  }
});

test('focus.trap is met by every modal: Shift+Tab at the first wraps to the last and Tab at the last to the first', () => {
  assert.ok(ROWS.length > 0, 'the modal rows are not empty');
  for (const row of ROWS) {
    const container = mount(row.element(true, () => {}));
    const buttons = panelOf(container, row).querySelectorAll<HTMLElement>('button');
    assert.equal(buttons.length, row.buttons, `${row.name}: precondition: the panel has exactly its ${row.buttons} buttons`);
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    act(() => { first!.focus(); });
    assert.equal(document.activeElement, first, `${row.name}: precondition: the first focusable holds focus`);
    press(first!, 'Tab', { shiftKey: true });
    assert.equal(document.activeElement, last, `${row.name}: Shift+Tab at the first boundary did not wrap to the last`);

    press(last!, 'Tab');
    assert.equal(document.activeElement, first, `${row.name}: Tab at the last boundary did not wrap to the first`);
    cleanup();
  }
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

test('ArenaConfirmDialog wraps Tab from the last focusable to the first when the confirm button is locked', () => {

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
