/* The queue holds identity, order and the clock, and the host draws them. Every timer this suite
 * cares about is captured rather than waited on: the intervals are 4200ms and 7000ms, and a suite
 * that slept for them would be the slowest in the run and would still prove only what the clock
 * module already proves by arithmetic. */
import { useTestEnvironment } from './test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ArenaToastQueue } from './ArenaToastQueue';

type Fire = () => void;
let scheduled: Fire[] = [];
let savedTimeout: typeof setTimeout;

function captureTimers(): void {
  scheduled = [];
  savedTimeout = globalThis.setTimeout;
  (globalThis as { setTimeout: unknown }).setTimeout = ((fn: Fire) => {
    scheduled.push(fn);
    return scheduled.length as unknown as ReturnType<typeof setTimeout>;
  });
}

afterEach(() => { if (savedTimeout) globalThis.setTimeout = savedTimeout; });

function queue(): ArenaToastQueue {
  return TestBed.inject(ArenaToastQueue);
}

test('a raised notice takes an id, keeps its order, and leaves when its timer fires', () => {
  captureTimers();
  const held = queue();
  const first = held.raise({ message: 'Saved' });
  const second = held.raise({ message: 'Deployed' });
  assert.deepEqual(held.toasts().map((one) => one.message), ['Saved', 'Deployed']);
  assert.notEqual(first, second, 'two notices share an id, so dismissing one would take the other');
  assert.equal(scheduled.length, 2);

  scheduled[0]?.();
  assert.deepEqual(held.toasts().map((one) => one.message), ['Deployed']);
  held.clear();
});

test('a danger notice is given no timer at all, which is the rule that ignores a persist of false', () => {
  captureTimers();
  const held = queue();
  held.raise({ message: 'Deploy failed', tone: 'danger', persist: false });
  assert.equal(scheduled.length, 0, 'a danger notice was put on a clock');
  assert.equal(held.toasts().length, 1);
  held.clear();
});

test('dismissing by hand drops the notice and cancels nothing else', () => {
  captureTimers();
  const held = queue();
  const first = held.raise({ message: 'Saved' });
  held.raise({ message: 'Deployed' });
  held.dismiss(first);
  assert.deepEqual(held.toasts().map((one) => one.message), ['Deployed']);
  held.clear();
});

test('clear empties the queue', () => {
  captureTimers();
  const held = queue();
  held.raise({ message: 'Saved' });
  held.clear();
  assert.deepEqual(held.toasts(), []);
});
