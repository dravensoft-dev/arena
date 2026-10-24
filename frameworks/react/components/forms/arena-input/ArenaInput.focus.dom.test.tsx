/* The input's imperative handle, and the reason it is not a member: none of the nine
 * contract forms is imperative, and returning focus after each completed transaction is the
 * gesture a point of sale is built on. autoFocus fires once at mount and the caller needs it
 * again every time, so the declarative alternative answers a different question.
 * IMPERATIVE_HANDLES in scripts/lib/arena/api-surface.ts is what lets check:api read a public
 * method here at all, and it names each one with its reason. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaInput, type ArenaInputHandle } from './ArenaInput.tsx';

afterEach(cleanup);

test('the ref reaches the real input, which is what the component exposes instead of a member', () => {
  const handle = React.createRef<ArenaInputHandle>();
  const root = mount(<ArenaInput ref={handle} label="Search" value="ACME-1042" onValueChange={() => {}} />);
  const control = root.querySelector('input')!;

  assert.notEqual(control.ownerDocument.activeElement, control, 'nothing focuses it on its own');

  act(() => { handle.current!.focus(); });
  assert.equal(control.ownerDocument.activeElement, control,
    'chaining data entry means returning focus after each completion, and no declarative prop does that');

  act(() => { handle.current!.select(); });
  assert.equal(control.selectionStart, 0);
  assert.equal(control.selectionEnd, 'ACME-1042'.length);
});
