import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from './test/Harness.tsx';
import { useArenaConfirm, type ArenaConfirmQueue } from './UseArenaConfirm.ts';

afterEach(() => cleanup());

let held: ArenaConfirmQueue | null = null;
function Probe() {
  held = useArenaConfirm();
  return <p>{held.current?.title ?? 'none'}</p>;
}

test('requests open one at a time, first in, first out, and settle resolves the head', async () => {
  const host = mount(<Probe />);
  let first!: Promise<boolean>;
  let second!: Promise<boolean>;
  act(() => { first = held!.ask({ title: 'Delete A' }); second = held!.ask({ title: 'Delete B' }); });
  assert.equal(host.textContent, 'Delete A');
  act(() => held!.settle(held!.current!.id, true));
  assert.equal(await first, true);
  assert.equal(host.textContent, 'Delete B');
  act(() => held!.settle(held!.current!.id, false));
  assert.equal(await second, false);
  assert.equal(host.textContent, 'none');
});

test('unmounting resolves every pending request false', async () => {
  mount(<Probe />);
  let pending: Promise<boolean>[] = [];
  act(() => { pending = [held!.ask({ title: 'A' }), held!.ask({ title: 'B' })]; });
  cleanup();
  assert.deepEqual(await Promise.all(pending), [false, false]);
});

test('a blank title is refused at once', () => {
  mount(<Probe />);
  assert.throws(() => held!.ask({ title: '' }), /title/);
});
