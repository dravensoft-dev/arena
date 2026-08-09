/* `width` takes a CSS width, and a consumer reaching for a named size gets a compile that sets an
 * invalid declaration the browser drops in silence. The check skips any value carrying a
 * parenthesis, which is every CSS function: happy-dom's CSSOM rejects calc(var(--sp-1) * 160) as
 * readily as it rejects md, and a warning that fires on the idiom Arena teaches would be worse
 * than the silence it replaces. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ArenaDialog } from './ArenaDialog.tsx';

afterEach(() => { cleanup(); forgetArenaWarnings(); });

function warnings(width?: string): string[] {
  const said: string[] = [];
  const saved = globalThis.console.warn;
  globalThis.console.warn = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  try {
    mount(<ArenaDialog open title="Delete project" width={width}>body</ArenaDialog>);
  } finally {
    globalThis.console.warn = saved;
  }
  return said;
}

test('a named size the browser refuses is reported, quoting what was passed', () => {
  const said = warnings('md');
  assert.equal(said.length, 1, 'the silent case stayed silent');
  assert.match(said[0] ?? '', /"md" is not one/);
  assert.match(said[0] ?? '', /calc\(var\(--sp-1\) \* 160\)/);
});

test('a real length says nothing', () => {
  assert.deepEqual(warnings('40rem'), []);
});

test('the spacing scale arithmetic says nothing, which is the case that made this hard', () => {
  assert.deepEqual(warnings('calc(var(--sp-1) * 160)'), []);
  assert.deepEqual(warnings('min(90vw, 40rem)'), []);
});

test('an absent width says nothing, because the default is the manifest\'s', () => {
  assert.deepEqual(warnings(undefined), []);
});
