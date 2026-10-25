import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaCheckboxGroup } from './ArenaCheckboxGroup.tsx';
import { ArenaCheckbox } from '../arena-checkbox/ArenaCheckbox.tsx';

afterEach(() => cleanup());

test('a disabled group disables every box and reflects aria-disabled', () => {
  const host = mount(
    <ArenaCheckboxGroup ariaLabel="Notify me about" disabled>
      <ArenaCheckbox value="deploys" label="Deploys" />
      <ArenaCheckbox value="incidents" label="Incidents" />
    </ArenaCheckboxGroup>,
  );
  assert.equal(host.querySelector('[role="group"]')?.getAttribute('aria-disabled'), 'true');
  for (const input of host.querySelectorAll('input[type="checkbox"]')) assert.equal((input as HTMLInputElement).disabled, true);
});

test('an enabled group leaves each box its own disabled', () => {
  const host = mount(
    <ArenaCheckboxGroup ariaLabel="Notify me about">
      <ArenaCheckbox value="deploys" label="Deploys" />
      <ArenaCheckbox value="incidents" label="Incidents" disabled />
    </ArenaCheckboxGroup>,
  );
  assert.equal(host.querySelector('[role="group"]')?.getAttribute('aria-disabled'), null);
  const [deploys, incidents] = [...host.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
  assert.equal(deploys?.disabled, false);
  assert.equal(incidents?.disabled, true);
});
