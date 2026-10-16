/* The pin input's imperative handle, and the reason it is not a member: after a wrong code the host
 * empties value and needs the first cell focused again, every time, and autoFocus fires once at
 * mount. IMPERATIVE_HANDLES in scripts/lib/arena/api-surface.ts names it with that reason. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaPinInput, type ArenaPinInputHandle } from './ArenaPinInput.tsx';

afterEach(cleanup);

test('the ref focuses the first cell, which is how a host asks for the code again', () => {
  const handle = React.createRef<ArenaPinInputHandle>();
  const root = mount(<ArenaPinInput ref={handle} label="Verification code" value="" onChange={() => {}} />);
  const first = root.querySelector<HTMLInputElement>('[data-arena-part="pin-input.cell"]')!;
  assert.notEqual(first.ownerDocument.activeElement, first, 'nothing focuses it on its own');
  act(() => { handle.current!.focus(); });
  assert.equal(first.ownerDocument.activeElement, first);
});
