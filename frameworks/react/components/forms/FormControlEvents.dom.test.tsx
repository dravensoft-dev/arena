/* What this suite holds is blur: ArenaInput hands the consumer the value, not the DOM event,
 * and validate runs on it. The change payloads of the form controls are held in
 * test/NativeEventsReach.dom.test.tsx, which dispatches the native event and reads what arrives. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { ArenaInput } from './arena-input/ArenaInput.tsx';

afterEach(cleanup);

test('ArenaInput blur hands the consumer the value, and validate runs on it', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaInput label="Email" value="nope" validate={(v) => (v.includes('@') ? '' : 'Bad email')}
      onBlur={(v) => seen.push(v)} />,
  );
  const field = root.querySelector<HTMLInputElement>('input');
  act(() => { field!.focus(); });
  act(() => { field!.blur(); });
  assert.equal(seen.length, 1, 'the blur handler did not fire');
  assert.equal(typeof seen[0], 'string', 'the payload is not a string -- a DOM event is travelling');
  assert.deepEqual(seen, ['nope'], 'blur did not carry the value');
  assert.match(root.textContent, /Bad email/, 'validate did not run on blur');
});
