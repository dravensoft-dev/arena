import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaRadioGroup } from './ArenaRadioGroup.tsx';
import { ArenaRadio } from '../arena-radio/ArenaRadio.tsx';

afterEach(() => cleanup());

test('a disabled group disables every radio and reflects aria-disabled', () => {
  const host = mount(
    <ArenaRadioGroup ariaLabel="Plan" disabled>
      <ArenaRadio value="basic" label="Basic" />
      <ArenaRadio value="pro" label="Pro" />
    </ArenaRadioGroup>,
  );
  assert.equal(host.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled'), 'true');
  for (const input of host.querySelectorAll('input[type="radio"]')) assert.equal((input as HTMLInputElement).disabled, true);
});

test('an enabled group leaves each radio its own disabled', () => {
  const host = mount(
    <ArenaRadioGroup ariaLabel="Plan">
      <ArenaRadio value="basic" label="Basic" />
      <ArenaRadio value="pro" label="Pro" disabled />
    </ArenaRadioGroup>,
  );
  assert.equal(host.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled'), null);
  const [basic, pro] = [...host.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
  assert.equal(basic?.disabled, false);
  assert.equal(pro?.disabled, true);
});
