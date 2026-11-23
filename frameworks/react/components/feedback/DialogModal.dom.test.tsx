/* The four true entries in each behavioural map below are verdicts this suite does not earn:
 * nothing here presses a key or reads document.activeElement. They are earned beside it, in
 * ModalScript.dom.test.tsx, which dispatches Escape and asserts focus returns to the invoker.
 * Nothing connected the two files, so deleting the suite that earns them left this one green
 * over literals. The last test reads that file, which is what makes the deletion red. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { mount, cleanup } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaDialog } from './arena-dialog/ArenaDialog.tsx';
import { ArenaConfirmDialog } from './arena-confirm-dialog/ArenaConfirmDialog.tsx';
import { ArenaOnboarding } from './arena-onboarding/ArenaOnboarding.tsx';

afterEach(cleanup);

const DIALOG_BEHAVIOURAL = {
  'focus.onOpen': true, 'focus.onClose': true, 'focus.trap': true, 'keyboard.Escape': true,
};

const CONFIRM_DIALOG_BEHAVIOURAL = {
  'focus.onOpen': true, 'focus.onClose': true, 'focus.trap': true, 'keyboard.Escape': true,
};

const ONBOARDING_BEHAVIOURAL = {
  'focus.onOpen': true, 'focus.onClose': true, 'focus.trap': true, 'keyboard.Escape': true,
};

let tempCounter = 0;
function tempBindingPath(label: string) {
  tempCounter += 1;
  return join(tmpdir(), `arena-${label}-${process.pid}-${tempCounter}.behaviour.json`);
}

test('ArenaDialog matches its dialog-modal binding, in both directions', () => {
  const container = mount(
    <ArenaDialog open onClose={() => {}} title="Delete project">
      <p>Body</p>
    </ArenaDialog>,
  );
  assertPattern({
    root: container,
    bindingPath: join(REACT_COMPONENTS, 'feedback/arena-dialog/ArenaDialog.behaviour.json'),
    subjects: { default: container.querySelector<HTMLElement>('[role="dialog"], dialog') },
    behavioural: DIALOG_BEHAVIOURAL,
  });
});

test('ArenaConfirmDialog matches its alertdialog binding, in both directions', () => {
  const container = mount(
    <ArenaConfirmDialog
      open
      onCancel={() => {}}
      onConfirm={() => {}}
      title="Delete project"
      confirmLabel="Delete"
    />,
  );
  assertPattern({
    root: container,
    bindingPath: join(REACT_COMPONENTS, 'feedback/arena-confirm-dialog/ArenaConfirmDialog.behaviour.json'),

    subjects: { default: container.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]') },
    behavioural: CONFIRM_DIALOG_BEHAVIOURAL,
  });
});

test('ArenaOnboarding matches its dialog-modal binding, in both directions', () => {
  const container = mount(
    <ArenaOnboarding open steps={[{ title: 'Welcome', body: 'Body' }]} index={0} onSkip={() => {}} />,
  );
  assertPattern({
    root: container,
    bindingPath: join(REACT_COMPONENTS, 'feedback/arena-onboarding/ArenaOnboarding.behaviour.json'),
    subjects: { default: container.querySelector<HTMLElement>('[role="dialog"]') },
    behavioural: ONBOARDING_BEHAVIOURAL,
  });
});

test('ArenaConfirmDialog points aria-describedby at its body', () => {
  const container = mount(
    <ArenaConfirmDialog open onCancel={() => {}} onConfirm={() => {}} title="Delete project">
      <p>Body</p>
    </ArenaConfirmDialog>,
  );
  const panel = container.querySelector<HTMLElement>('[role="alertdialog"]');
  assert.ok(panel, 'the panel renders');
  const id = panel.getAttribute('aria-describedby');
  assert.ok(id, 'the panel names the element that describes it');
  const described = container.ownerDocument.getElementById(id);
  assert.ok(described, 'the id resolves to an element');
  assert.ok(described.hasAttribute('data-arena-part') && described.contains(panel.querySelector('p')),
    'the described element is the body part');
  assert.match(described.textContent ?? '', /Body/);
});

test('assertPattern refuses an also pattern with no file, and says it came from also', () => {
  const p = tempBindingPath('unknown-also');
  writeFileSync(p, JSON.stringify({ pattern: 'dialog-modal', exceptions: [], also: [{ pattern: 'no-such-pattern', exceptions: [] }] }));
  try {
    const container = mount(<ArenaDialog open onClose={() => {}} title="t"><p>b</p></ArenaDialog>);
    assert.throws(() => assertPattern({ root: container, bindingPath: p, behavioural: DIALOG_BEHAVIOURAL }),
      /names pattern "no-such-pattern" in `also`/);
  } finally {
    unlinkSync(p);
  }
});

test('the require-text input substitutes a focus ring for the outline it removes', () => {
  const container = mount(
    <ArenaConfirmDialog open onCancel={() => {}} onConfirm={() => {}} title="Delete project"
      confirmLabel="Delete" requireText="DELETE" />,
  );
  const input = container.querySelector<HTMLInputElement>('input');
  assert.ok(input, 'the requireText branch must render its input');
  const drawn = input.className;
  assert.ok(drawn.includes('arena-confirm-dialog__input'),
    'the outline is still removed -- what changed is that something takes its place');
  assert.equal(input.hasAttribute('data-arena-invalid'), false,
    'the input draws the valid branch, and the ring it substitutes for the outline comes with it; '
    + 'for a TEXT input :focus-visible also matches a mouse click, so this is not about hiding a ring');

  assert.equal(document.head.querySelectorAll('style[data-arena-confirm-dialog]').length, 0,
    'the rule lives in the manifest now, so nothing injects a stylesheet for it');
  assert.equal(container.querySelectorAll<HTMLElement>('style').length, 0,
    'and nothing renders one inline either, which would ship one tag per instance');
});

function unearned(source: string, claims: ReadonlyArray<readonly [string, Record<string, boolean>]>) {
  const missing: string[] = [];
  for (const [component, behavioural] of claims) {
    if (!source.includes(`name: '${component}'`)) missing.push(`${component} (no row)`);
    for (const [requirement, met] of Object.entries(behavioural)) {
      if (!met) continue;
      if (!source.includes(`${requirement} is met`)) missing.push(`${component} ${requirement}`);
    }
  }
  return missing;
}

const CLAIMS = [
  ['ArenaDialog', DIALOG_BEHAVIOURAL],
  ['ArenaConfirmDialog', CONFIRM_DIALOG_BEHAVIOURAL],
  ['ArenaOnboarding', ONBOARDING_BEHAVIOURAL],
] as const;

test('a requirement the script file does not earn fails the reader', () => {
  const source = readFileSync(join(REACT_COMPONENTS, 'feedback/ModalScript.dom.test.tsx'), 'utf8');
  assert.deepEqual(unearned(source.replaceAll('focus.trap is met', 'focus.trap'), CLAIMS),
    ['ArenaDialog focus.trap', 'ArenaConfirmDialog focus.trap', 'ArenaOnboarding focus.trap'],
    'a requirement absent from the file must be reported for every component that claims it');
  assert.deepEqual(unearned(source.replaceAll("name: 'ArenaOnboarding'", "name: 'Other'"), CLAIMS),
    ['ArenaOnboarding (no row)'], 'a component with no row in the file must be reported');
});

test('the behavioural verdicts above are earned in ModalScript.dom.test.tsx, which is read here', () => {
  const pinning = readFileSync(join(REACT_COMPONENTS, 'feedback/ModalScript.dom.test.tsx'), 'utf8');
  assert.deepEqual(unearned(pinning, CLAIMS), [],
    'a claimed requirement or a component row is absent from ModalScript.dom.test.tsx: '
    + 'either that test went, or the claim did');
});
