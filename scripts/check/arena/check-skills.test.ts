import test from 'node:test';
import assert from 'node:assert/strict';
import {
  skillProblems, firstDifference, zeroDeclarationProblems, trackingProblems,
} from './check-skills.ts';
import { skillTargets } from '../../generate/arena/generate-skills.ts';

test('every committed index matches a fresh emit', () => {
  const { problems } = skillProblems();
  assert.deepEqual(problems, []);
});

test('the gate compared a real result set rather than an empty one', () => {
  const { declared, emitted } = skillProblems();
  assert.ok(declared > 0, 'no component was declared, so a clean pass says nothing');
  assert.equal(emitted, skillTargets().length);
});

test('an untracked index is a problem, because it would reach no clone and no tag', () => {
  const problems = trackingProblems('frameworks/INDEX.md', false);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /reaches no clone and no tag/);
  assert.deepEqual(trackingProblems('frameworks/INDEX.md', true), []);
});

test('an empty declaration is a problem, never a clean run', () => {
  assert.equal(zeroDeclarationProblems(0).length, 1);
  assert.deepEqual(zeroDeclarationProblems(50), []);
});

test('firstDifference names the line, so a stale index says where', () => {
  const at = firstDifference('a\nb\nc', 'a\nX\nc');
  assert.match(at ?? '', /^line 2: committed "X", generated "b"$/);
});

test('firstDifference reports a truncated file rather than reading past its end', () => {
  assert.match(firstDifference('a\nb', 'a') ?? '', /line 2: committed "\(end of file\)", generated "b"/);
});

test('two identical documents differ nowhere', () => {
  assert.equal(firstDifference('a\nb', 'a\nb'), null);
});

test('an untracked tree fails once per index rather than only for the first', () => {
  const { problems } = skillProblems(undefined, new Set());
  assert.equal(problems.filter((p) => p.includes('reaches no clone')).length, skillTargets().length);
});
