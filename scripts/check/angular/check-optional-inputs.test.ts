/* Covers check-optional-inputs.ts. The cases that matter are the three a looser reader gets
 * wrong: a required input, which has no default to resolve; an input declared with no value at
 * all, whose write type already admits undefined; and a transform that is not booleanAttribute,
 * which is most of them and is still a resolution. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalInputProblems, TAKES_NO_ABSENCE } from './check-optional-inputs.ts';

const reader = (files: Record<string, string>) => (path: string) => files[path] ?? '';

test('a defaulted input that resolves an absence passes', () => {
  const files = {
    'A.ts': "readonly tone = input<Tone, Tone | undefined>('neutral', { transform: (v) => v ?? 'neutral' });",
  };
  const { problems, found } = optionalInputProblems(Object.keys(files), reader(files), new Map());
  assert.deepEqual(problems, []);
  assert.equal(found, 1);
});

test('a defaulted input with no transform fails, and is told the shape to add', () => {
  const files = { 'ArenaToast.ts': "readonly tone = input<ArenaToastTone>('neutral');" };
  const { problems } = optionalInputProblems(Object.keys(files), reader(files), new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaToast\.tone has a default and no transform/);
  assert.match(problems[0] ?? '', /value \?\? 'neutral'/);
});

test('booleanAttribute is a resolution like any other, so a boolean input passes here', () => {
  const files = { 'A.ts': 'readonly disabled = input(false, { transform: booleanAttribute });' };
  assert.deepEqual(optionalInputProblems(Object.keys(files), reader(files), new Map()).problems, []);
});

test('a required input has no default to resolve, and an undefaulted one already admits undefined', () => {
  const files = {
    'A.ts': 'readonly id = input.required<string>();\n  readonly icon = input<string>();',
  };
  const { problems, found } = optionalInputProblems(Object.keys(files), reader(files), new Map());
  assert.equal(found, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /An empty result set is a failure/);
});

test('an exemption for an input that resolves anyway fails as a wrong record', () => {
  const files = { 'A.ts': "readonly tone = input('x', { transform: (v) => v ?? 'x' });" };
  const exempt = new Map([['A.tone', 'a bound absence means something else here.']]);
  const { problems } = optionalInputProblems(Object.keys(files), reader(files), exempt);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /is also named in TAKES_NO_ABSENCE/);
});

test('an exemption for an input that is gone fails as stale', () => {
  const files = { 'A.ts': 'readonly label = input.required<string>();' };
  const exempt = new Map([['A.tone', 'a bound absence means something else here.']]);
  const { problems } = optionalInputProblems(Object.keys(files), reader(files), exempt);
  assert.ok(problems.some((p) => /TAKES_NO_ABSENCE names A.tone/.test(p)));
});

test('TAKES_NO_ABSENCE is empty, and that emptiness is the claim', () => {
  assert.equal(TAKES_NO_ABSENCE.size, 0);
});
