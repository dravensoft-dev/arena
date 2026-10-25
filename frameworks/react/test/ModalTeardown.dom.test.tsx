/* A modal the host removes while it is open gives focus back to the control that opened it, unless
 * focus already sits on a live control outside the panel (a toast's button), which keeps it. */

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { StrictMode, useState } from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog.tsx';
import { ArenaConfirmDialog } from '../components/feedback/arena-confirm-dialog/ArenaConfirmDialog.tsx';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding.tsx';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette.tsx';

afterEach(cleanup);

const noop = () => {};

const MODALS: ReadonlyArray<readonly [string, () => React.ReactElement]> = [
  ['ArenaDialog', () => <ArenaDialog open title="Promote build" onClose={noop}><button>inside</button></ArenaDialog>],
  ['ArenaConfirmDialog', () => <ArenaConfirmDialog open title="Delete project" onCancel={noop} onConfirm={noop}>Sure?</ArenaConfirmDialog>],
  ['ArenaOnboarding', () => <ArenaOnboarding open steps={[{ title: 'Welcome' }]} onSkip={noop} />],
  ['ArenaCommandPalette', () => <ArenaCommandPalette open commands={[{ id: 'a', label: 'Alpha' }]} onClose={noop} onRun={noop} />],
];

function withHost(modal: () => React.ReactElement, strict = false) {
  let setShown: (shown: boolean) => void = noop;
  function Host() {
    const [shown, set] = useState(true);
    setShown = set;
    return shown ? modal() : null;
  }
  const invoker = document.createElement('button');
  invoker.textContent = 'open';
  document.body.appendChild(invoker);
  invoker.focus();
  let invokerFocused = 0;
  invoker.addEventListener('focus', () => { invokerFocused += 1; });
  const container = mount(strict ? <StrictMode><Host /></StrictMode> : <Host />);
  return { invoker, container, invokerFocused: () => invokerFocused, remove: () => act(() => { setShown(false); }) };
}

for (const [name, modal] of MODALS) {
  test(`${name} removed while open returns focus to its invoker`, () => {
    const { invoker, container, remove } = withHost(modal);
    const panel = container.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]')!;
    assert.equal(panel.contains(document.activeElement), true, 'opening moves focus inside the panel');
    remove();
    assert.equal(document.activeElement, invoker, 'the host removing the modal must hand focus back to the invoker');
  });

  test(`${name} removed after focus moved to a live control outside it leaves focus there`, () => {
    const { container, remove } = withHost(modal);
    assert.notEqual(container.querySelector('[role="dialog"], [role="alertdialog"]'), null);
    const toast = document.createElement('button');
    document.body.appendChild(toast);
    toast.focus();
    remove();
    assert.equal(document.activeElement, toast, 'a live control outside the panel keeps focus');
  });

  test(`${name} mounted open in StrictMode keeps focus inside its panel`, () => {
    const { container, invokerFocused } = withHost(modal, true);
    const panel = container.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]')!;
    assert.equal(panel.contains(document.activeElement), true, 'focus left the panel after the simulated unmount');
    assert.equal(invokerFocused(), 0, 'the simulated unmount handed focus back to the invoker, which a real one alone may do');
  });
}
