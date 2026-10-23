/* A generated name is the group, so it has to be the same name on the server, after hydration and after a
 * rerender: a name that changes renames every radio, and a server name the client does not draw is a
 * hydration mismatch. */
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { ArenaSegmentedControl } from './ArenaSegmentedControl.tsx';

const group = (name?: string) => (
  <ArenaSegmentedControl ariaLabel="Time range" name={name} options={[{ value: 'd', label: 'Day' }, { value: 'w', label: 'Week' }]} />
);
const names = (box: Element) => [...box.querySelectorAll('input')].map((input) => input.getAttribute('name'));

test('a blank name gives every radio one non-empty name, and a rerender keeps it', async () => {
  const box = document.body.appendChild(document.createElement('div'));
  const root = createRoot(box);
  try {
    await act(async () => root.render(group('')));
    const first = names(box);
    assert.equal(new Set(first).size, 1);
    assert.notEqual(first[0], '');
    await act(async () => root.render(group('')));
    assert.deepEqual(names(box), first);
  } finally {
    await act(async () => root.unmount());
    box.remove();
  }
});

test('a generated name survives hydration: no mismatch is logged and the server name stays', async () => {
  const box = document.body.appendChild(document.createElement('div'));
  box.innerHTML = renderToString(group());
  const server = names(box);
  const logged: string[] = [];
  const error = console.error;
  console.error = (...args: unknown[]) => { logged.push(args.map(String).join(' ')); };
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(box, group()); });
  } finally {
    console.error = error;
  }
  try {
    assert.deepEqual(logged.filter((line) => /did not match/.test(line)), []);
    assert.deepEqual(names(box), server);
  } finally {
    if (root) await act(async () => root!.unmount());
    box.remove();
  }
});
