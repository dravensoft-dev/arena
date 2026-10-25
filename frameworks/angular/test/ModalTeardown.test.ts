/* A modal the host removes while it is open gives focus back to the control that opened it, unless
 * focus already sits on a live control outside the panel (a toast's button), which keeps it. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { assertSameNode } from './NodeAssert';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';
import { ArenaConfirmDialog } from '../components/feedback/arena-confirm-dialog/ArenaConfirmDialog';
import { ArenaOnboarding } from '../components/feedback/arena-onboarding/ArenaOnboarding';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';

const MODALS = [
  { name: 'ArenaDialog', type: ArenaDialog, inputs: { title: 'Promote build' } },
  { name: 'ArenaConfirmDialog', type: ArenaConfirmDialog, inputs: { title: 'Delete project' } },
  { name: 'ArenaOnboarding', type: ArenaOnboarding, inputs: { steps: [{ title: 'Welcome' }] } },
  { name: 'ArenaCommandPalette', type: ArenaCommandPalette, inputs: { commands: [{ id: 'a', label: 'Alpha' }] } },
] as const;

function openModal(type: (typeof MODALS)[number]['type'], inputs: Record<string, unknown>) {
  const invoker = document.createElement('button');
  invoker.textContent = 'open';
  document.body.appendChild(invoker);
  invoker.focus();
  const fixture = TestBed.createComponent(type as never);
  fixture.componentRef.setInput('open', true);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const panel = (fixture.nativeElement as Element).querySelector('[role="dialog"], [role="alertdialog"]');
  return { invoker, fixture, panel };
}

for (const { name, type, inputs } of MODALS) {
  test(`${name} removed while open returns focus to its invoker`, () => {
    const { invoker, fixture, panel } = openModal(type, inputs);
    try {
      assert.ok(panel, 'an open modal renders its panel');
      assert.equal(panel.contains(document.activeElement), true, 'opening moves focus inside the panel');
      fixture.destroy();
      assertSameNode(document.activeElement, invoker, 'the host removing the modal must hand focus back to the invoker');
    } finally {
      invoker.remove();
    }
  });

  test(`${name} removed after focus moved to a live control outside it leaves focus there`, () => {
    const { invoker, fixture } = openModal(type, inputs);
    const toast = document.createElement('button');
    document.body.appendChild(toast);
    try {
      toast.focus();
      fixture.destroy();
      assertSameNode(document.activeElement, toast, 'a live control outside the panel keeps focus');
    } finally {
      invoker.remove();
      toast.remove();
    }
  });
}
