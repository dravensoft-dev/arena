import test from 'node:test';
import assert from 'node:assert/strict';
import { describeBinding, zeroPatternProblems } from './check-behaviour.ts';
import type { BehaviourBinding } from '../../lib/arena/behaviour-contracts.ts';

const flatAlert: BehaviourBinding = { pattern: 'alert', exceptions: [] };
const flatStatus: BehaviourBinding = { pattern: 'status', exceptions: [] };
const casedAlert: BehaviourBinding = {
  cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'alert', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'status', exceptions: [] },
  ],
};
const casedOther: BehaviourBinding = {
  cases: [
    { name: 'danger', when: 'tone is "danger"', pattern: 'status', exceptions: [] },
    { name: 'advisory', when: 'any other tone', pattern: 'alert', exceptions: [] },
  ],
};

test('describeBinding renders a flat/flat disagreement as a bare pattern name on each side', () => {
  assert.equal(describeBinding(flatAlert), 'alert');
  assert.equal(describeBinding(flatStatus), 'status');
});

test('describeBinding renders a cased/cased disagreement as "name:pattern" pairs joined by " + " on each side', () => {
  assert.equal(describeBinding(casedAlert), 'danger:alert + advisory:status');
  assert.equal(describeBinding(casedOther), 'danger:status + advisory:alert');
});

test('zero patterns is one named failure, not a cascade', () => {
  const problems = zeroPatternProblems(0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /0 pattern/);
  assert.match(problems[0] ?? '', /behaviour/);
});

test('a populated catalogue has no zero problem', () => {
  assert.deepEqual(zeroPatternProblems(21), []);
});
