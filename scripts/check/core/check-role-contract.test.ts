import test from 'node:test';
import assert from 'node:assert/strict';
import { declarationProblems, zeroRoleProblems, collect } from './check-role-contract.ts';

const described = { $type: 'dimension', $description: 'x' };

test('a role carrying a value is not a declaration', () => {
  const problems = declarationProblems({ 'r-surface': { ...described, $value: '{r.lg}' } });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /r-surface carries a \$value/);
});

test('a role needs a type and a description', () => {
  assert.match(declarationProblems({ 'r-surface': { $type: 'dimension' } })[0] ?? '', /no \$description/);
  assert.match(declarationProblems({ 'r-surface': { $description: 'x' } })[0] ?? '', /no \$type/);
});

test('a keyword declares its closed set', () => {
  assert.match(declarationProblems({ 'tt-label': { $type: 'keyword', $description: 'x' } })[0] ?? '',
    /closed set/);
  assert.deepEqual(declarationProblems({
    'tt-label': {
      $type: 'keyword',
      $description: 'x',
      $extensions: { 'com.dravensoft.arena': { values: ['none', 'uppercase'] } },
    },
  }), []);
});

test('a zero walk is a failure and not a clean pass', () => {
  assert.equal(zeroRoleProblems(0).length, 1);
  assert.deepEqual(zeroRoleProblems(69), []);
});

test('the real declaration holds: it asks and never answers', () => {
  assert.deepEqual(collect(), []);
});
