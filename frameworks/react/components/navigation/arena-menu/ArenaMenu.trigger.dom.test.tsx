/* A presentational element passed as the trigger is the one misuse nothing reported. The throw
 * above it catches a fragment and a bare string, which is a different mistake: an element that
 * is perfectly valid and simply takes no focus passes that guard, gets its ARIA repaired through
 * the DOM path, and keeps a dead click. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import { ArenaMenu } from './ArenaMenu.tsx';
import type { ArenaMenuItem } from '../../../Api.generated';

const ITEMS: readonly ArenaMenuItem[] = [{ label: 'Rename' }];

afterEach(() => { cleanup(); forgetArenaWarnings(); });

function warnings(trigger: React.ReactNode): string[] {
  const said: string[] = [];
  const saved = globalThis.console.warn;
  globalThis.console.warn = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  try {
    mount(<ArenaMenu trigger={trigger} items={ITEMS} />);
  } finally {
    globalThis.console.warn = saved;
  }
  return said;
}

test('a trigger that takes no focus is reported, naming the element it rendered', () => {
  const said = warnings(<span>More</span>);
  assert.equal(said.length, 1, 'the silent case stayed silent');
  assert.match(said[0] ?? '', /<span>/);
  assert.match(said[0] ?? '', /keyboard cannot reach it/);
});

test('a real button says nothing', () => {
  assert.deepEqual(warnings(<button type="button">More</button>), []);
});

test("a consumer's own element carrying a role and a tabindex says nothing either", () => {
  assert.deepEqual(warnings(<span role="button" tabIndex={0}>More</span>), []);
});
