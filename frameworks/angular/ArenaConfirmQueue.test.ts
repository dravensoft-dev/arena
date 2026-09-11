import { useTestEnvironment } from './test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaConfirmQueue } from './ArenaConfirmQueue';

afterEach(() => TestBed.resetTestingModule());

test('requests open one at a time, first in, first out', async () => {
  const queue = TestBed.inject(ArenaConfirmQueue);
  const first = queue.ask({ title: 'Delete A' });
  const second = queue.ask({ title: 'Delete B' });
  assert.equal(queue.current()?.title, 'Delete A');
  queue.settle(queue.current()!.id, true);
  assert.equal(await first, true);
  assert.equal(queue.current()?.title, 'Delete B');
  queue.settle(queue.current()!.id, false);
  assert.equal(await second, false);
  assert.equal(queue.current(), null);
});

test('settle resolves the entry it names and ignores an id that is not the head', async () => {
  const queue = TestBed.inject(ArenaConfirmQueue);
  const first = queue.ask({ title: 'A' });
  queue.ask({ title: 'B' });
  const headId = queue.current()!.id;
  queue.settle(headId + 1, true);
  assert.equal(queue.current()?.id, headId);
  queue.settle(headId, true);
  assert.equal(await first, true);
});

test('destroying the injector resolves every pending request false', async () => {
  const queue = TestBed.inject(ArenaConfirmQueue);
  const pending = [queue.ask({ title: 'A' }), queue.ask({ title: 'B' })];
  TestBed.resetTestingModule();
  assert.deepEqual(await Promise.all(pending), [false, false]);
});

test('a blank title is refused at once', () => {
  const queue = TestBed.inject(ArenaConfirmQueue);
  assert.throws(() => queue.ask({ title: '   ' }), /title/);
});
