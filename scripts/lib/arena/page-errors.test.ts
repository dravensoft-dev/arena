/* Two failures a browser gate has to tell apart and one it used to state wrongly. A page that
 * did not paint in time and a page whose expression threw are different findings, and the
 * message for the first has to carry what was actually waited: a deadline printed on its own
 * says only what the number in the source is, which is how a six second run reported a wait of
 * forty seconds and sent a reader to look at the render. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { deadline } from './deadline.ts';
import { paintedProblem, silenceOf, threwProblem, type Silence } from './page-errors.ts';

const BOUND = deadline('probe:painted', 40_000, 'the page mounts every component the library ships');

const silence = (over: Partial<Silence> = {}): Silence => ({
  readyState: 'complete', elements: 412, errors: [], scripts: ['default.sink.entry.generated.js 200 46761B'], ...over,
});

test('a page that painted is no problem at all', () => {
  assert.equal(paintedProblem('base/react', BOUND, { ready: true, waitedMs: 274 }, 'so nothing was measured'), null);
});

test('an unpainted page reports the wait it actually spent, not the deadline it was given', () => {
  const problem = paintedProblem('base/react', BOUND, { ready: false, waitedMs: 3 }, 'so nothing was measured');

  assert.match(problem ?? '', /base\/react/);
  assert.match(problem ?? '', /ended after 3ms/,
    'a wait of 3ms printed as the 40000ms allowed is the message that cost a debugging session');
  assert.match(problem ?? '', /40000ms/);
  assert.match(problem ?? '', /so nothing was measured/);
});

test('what the page said travels with the finding, since 404 and slow read identically without it', () => {
  const problem = paintedProblem('base/react', BOUND, { ready: false, waitedMs: 40_000 },
    'so nothing was measured', silence({ readyState: 'loading', elements: 0, errors: ['failed to load http://127.0.0.1/x.js'], scripts: [] }));

  assert.match(problem ?? '', /was loading holding 0 element\(s\)/);
  assert.match(problem ?? '', /failed to load/);
  assert.match(problem ?? '', /script\(s\) fetched: none/);
});

test('a throw is its own finding and never a slow render', () => {
  const problem = threwProblem('base/react', 'TypeError: Cannot read properties of null', silence());

  assert.match(problem, /base\/react/);
  assert.match(problem, /Cannot read properties of null/);
  assert.doesNotMatch(problem, /never signalled/);
  assert.match(problem, /412 element\(s\)/);
});

test('silenceOf says nothing when it was handed nothing', () => {
  assert.equal(silenceOf(undefined), '');
});
