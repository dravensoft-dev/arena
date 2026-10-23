/* A placeholder with no value is the choice the select starts on, so "nothing chosen yet" is what a form
 * submits and what a required select refuses. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ArenaSelect } from './ArenaSelect.tsx';

const OPTIONS = [{ value: 'eu', label: 'Europe West' }, { value: 'us', label: 'US East' }];

async function drawn(required: boolean) {
  const box = document.body.appendChild(document.createElement('div'));
  const root = createRoot(box);
  await act(async () => root.render(
    <form>
      <ArenaSelect label="Region" name="region" placeholder="Any region" options={OPTIONS} required={required} />
    </form>,
  ));
  const form = box.querySelector('form') as HTMLFormElement;
  const field = box.querySelector('select') as HTMLSelectElement;
  const done = async () => { await act(async () => root.unmount()); box.remove(); };
  return { form, field, done };
}

test('a placeholder with no value starts the select on the placeholder and submits an empty value', async () => {
  const { form, field, done } = await drawn(false);
  try {
    assert.equal(field.selectedOptions[0]?.textContent, 'Any region');
    assert.equal(field.value, '');
    assert.equal(new FormData(form).get('region'), '');
  } finally { await done(); }
});

test('a required select on its placeholder has no value to submit', async () => {
  const { field, done } = await drawn(true);
  try {
    assert.equal(field.required, true);
    assert.equal(field.value, '');
    assert.equal(field.validity.valueMissing, true);
  } finally { await done(); }
});
