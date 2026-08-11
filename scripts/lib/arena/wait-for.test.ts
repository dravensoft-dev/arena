/* The clock and the sleep are injected, so no case here spends real time and none of them can
 * become a measurement of the machine running it, which is the failure the subject exists to
 * remove and would be a poor thing for its own suite to reproduce. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { deadline } from './deadline.ts';
import { waitFor } from './wait-for.ts';

const BOUND = deadline('probe:ready', 1_000, 'a cold cache is the slowest this ever is');

function fakeClock() {
  let at = 0;
  return { now: () => at, sleep: async (ms: number) => { at += ms; } };
}

test('a condition already true costs nothing and is reported as seen', async () => {
  const waited = await waitFor(() => true, BOUND, fakeClock());
  assert.deepEqual(waited, { seen: true, ms: 0 });
});

test('a condition that becomes true is seen, and the cost is what it took', async () => {
  const clock = fakeClock();
  let looks = 0;
  const waited = await waitFor(() => (looks += 1) > 3, BOUND, clock);
  assert.equal(waited.seen, true);
  assert.equal(waited.ms, 150, 'three polls of 50ms, and the cost travels on the seen shape too');
});

test('an expiry reports what was not seen and why the bound is that size, never an absence', async () => {
  const waited = await waitFor(() => false, BOUND, fakeClock());
  assert.equal(waited.seen, false);
  assert.ok(waited.ms >= BOUND.ms);
  if (waited.seen) return;
  assert.match(waited.why, /probe:ready/);
  assert.match(waited.why, /not seen within 1000ms/);
  assert.match(waited.why, /a cold cache is the slowest this ever is/);
});

test('a look that costs more than the bound gets exactly one, and the cost is what says so', async () => {
  let at = 0;
  const clock = { now: () => at, sleep: async (ms: number) => { at += ms; } };
  let looks = 0;
  const waited = await waitFor(() => { looks += 1; at += 6_000; return false; }, BOUND, clock);
  assert.equal(looks, 1,
    'the bound is spent by the same clock the look spends, so a host where asking the question '
    + 'costs more than the whole margin buys no second look. That is the answer on such a host '
    + 'rather than a fault, and the case that reads the Windows process table is one');
  assert.equal(waited.seen, false);
  if (waited.seen) return;
  assert.ok(waited.ms >= 6_000,
    'the cost travels, so a margin that went on looking rather than on waiting is visible in the '
    + 'report instead of arriving as a subject that was not there');
});

test('the condition may be asynchronous, since a browser answers over a socket', async () => {
  const waited = await waitFor(async () => true, BOUND, fakeClock());
  assert.equal(waited.seen, true);
});

test('a condition that throws is an expiry naming the throw, not a silent false', async () => {
  const waited = await waitFor(() => { throw new Error('the socket closed'); }, BOUND, fakeClock());
  assert.equal(waited.seen, false);
  if (waited.seen) return;
  assert.match(waited.why, /the socket closed/);
});
