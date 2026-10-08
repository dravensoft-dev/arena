/* The panel reads --arena-dialog-width through its class, so the property is the only way a width
 * arrives, and a value the browser would drop is reported once. happy-dom does not inherit custom
 * properties, so each case declares the property with a rule on the panel part itself. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ArenaDialog } from './ArenaDialog.tsx';
import manifest from './ArenaDialog.classes.generated.ts';

afterEach(() => { cleanup(); forgetArenaWarnings(); });

function captureWarnings(body: () => void): string[] {
  const said: string[] = [];
  const saved = globalThis.console.warn;
  globalThis.console.warn = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  try {
    body();
  } finally {
    globalThis.console.warn = saved;
  }
  return said;
}

test('a property that is not a width warns once, and a length or a derivation does not', () => {
  for (const [value, warns] of [['md', true], ['40rem', false], ['calc(var(--sp-1) * 160)', false]] as const) {
    forgetArenaWarnings();
    const sheet = document.head.appendChild(document.createElement('style'));
    sheet.textContent = `[data-arena-part="${manifest.parts.panel}"] { --arena-dialog-width: ${value}; }`;
    const warned = captureWarnings(() => mount(<ArenaDialog open onClose={() => {}} title="T">{null}</ArenaDialog>));
    assert.equal(warned.length, warns ? 1 : 0, value);
    if (warns) assert.match(warned[0] ?? '', /--arena-dialog-width is "md"/);
    sheet.remove();
    cleanup();
  }
});

test('an unset property says nothing, because the default is the manifest\'s', () => {
  assert.deepEqual(captureWarnings(() => mount(<ArenaDialog open onClose={() => {}} title="T">{null}</ArenaDialog>)), []);
});
