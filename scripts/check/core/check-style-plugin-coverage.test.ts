import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPLETE, collect, movedRoles, phantomParts, unpaintedParts, unreachedRoles, zeroCoverageProblems,
} from './check-style-plugin-coverage.ts';

test('a role complete does not move is a role nothing can reach', () => {
  const problems = unreachedRoles(['r-surface', 'bw-surface'], ['r-surface']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /bw-surface/);
});

test('a role complete answers with the value default already gives has not moved', () => {
  assert.deepEqual(movedRoles({ 'r-surface': '4px', 'bw-surface': '1px' }, { 'r-surface': '4px', 'bw-surface': '2px' }),
    ['bw-surface']);
});

test('a part complete does not paint is a hook nothing can reach', () => {
  const problems = unpaintedParts(['card.body', 'hero.title'], ['card.body']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /hero\.title/);
});

test('a rule naming a hook no manifest emits paints nothing and still counted as coverage', () => {
  const problems = phantomParts(['table.td'], ['table.td', 'table.td-mono']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /table\.td-mono/);
});

test('the witness is asked both ways, so neither half can be true on its own', () => {
  assert.deepEqual(phantomParts(['card.body'], ['card.body']), [],
    'a plugin painting exactly what the manifests emit has nothing to report');
  assert.deepEqual(unpaintedParts(['card.body'], ['card.body']), []);
});

test('a zero walk is a failure and not a clean pass', () => {
  assert.equal(zeroCoverageProblems(0).length, 1);
  assert.deepEqual(zeroCoverageProblems(69), []);
});

test('the tree holds: every declared role moves and every emitted part is painted', () => {
  const { problems, roles, parts } = collect();
  assert.deepEqual(problems, []);
  assert.ok(roles > 0 && parts > 0, `${COMPLETE} was read and answered nothing, so a green run proves nothing`);
});
