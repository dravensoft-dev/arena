/* The queue holds identity, order and the clock, and the host draws them. Every timer this suite
 * cares about is captured rather than waited on: the intervals are 4200ms and 7000ms, and a suite
 * that slept for them would be the slowest in the run and would still prove only what the clock
 * module already proves by arithmetic. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from './test/Harness.tsx';
import { useArenaToasts, type ArenaToastQueue } from './UseArenaToasts.ts';

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

afterEach(() => { if (savedTimeout) globalThis.setTimeout = savedTimeout; cleanup(); });

let held: ArenaToastQueue | null = null;

function Probe() {
  held = useArenaToasts();
  return <ul>{held.toasts.map((one) => <li key={one.id}>{one.message}</li>)}</ul>;
}

function messages(host: Element): string[] {
  return [...host.querySelectorAll('li')].map((one) => one.textContent ?? '');
}

test('a raised notice takes an id, keeps its order, and leaves when its timer fires', () => {
  captureTimers();
  const host = mount(<Probe />);
  act(() => { held?.raise({ message: 'Saved' }); });
  act(() => { held?.raise({ message: 'Deployed' }); });
  assert.deepEqual(messages(host), ['Saved', 'Deployed']);
  assert.equal(scheduled.length, 2);

  act(() => { scheduled[0]?.(); });
  assert.deepEqual(messages(host), ['Deployed']);
});

test('a danger notice is given no timer at all, which is the rule that ignores a persist of false', () => {
  captureTimers();
  const host = mount(<Probe />);
  act(() => { held?.raise({ message: 'Deploy failed', tone: 'danger', persist: false }); });
  assert.equal(scheduled.length, 0, 'a danger notice was put on a clock');
  assert.deepEqual(messages(host), ['Deploy failed']);
});

test('dismissing by hand drops that notice and leaves the rest', () => {
  captureTimers();
  const host = mount(<Probe />);
  let first = 0;
  act(() => { first = held?.raise({ message: 'Saved' }) ?? 0; });
  act(() => { held?.raise({ message: 'Deployed' }); });
  act(() => { held?.dismiss(first); });
  assert.deepEqual(messages(host), ['Deployed']);
});

test('clear empties the queue', () => {
  captureTimers();
  const host = mount(<Probe />);
  act(() => { held?.raise({ message: 'Saved' }); });
  act(() => { held?.clear(); });
  assert.deepEqual(messages(host), []);
});
