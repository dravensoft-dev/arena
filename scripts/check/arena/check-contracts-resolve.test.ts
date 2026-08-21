import test from 'node:test';
import assert from 'node:assert/strict';
import {
  carriedDesign, collect, cycleProblems, referencesIn, tokensOf, unresolvedProblems, zeroWalkProblems,
} from './check-contracts-resolve.ts';
import { EXCLUDED } from '../core/check-dtcg.ts';

const held = (entries: [string, unknown][]) => entries.map(([path, value]) => ({ path, value, file: 'x.json' }));

test('a reference is found wherever it sits in a value, including inside a composite', () => {
  assert.deepEqual(referencesIn('{sp.4}'), ['sp.4']);
  assert.deepEqual(referencesIn({ offsetY: '{sp.2}', color: { hex: '#000000' } }), ['sp.2']);
  assert.deepEqual(referencesIn([{ a: '{r.lg}' }, '{bw}']), ['r.lg', 'bw']);
  assert.deepEqual(referencesIn({ value: 4, unit: 'px' }), []);
});

test('a reference the carried set does not define is a problem, and the message says why it matters', () => {
  const problems = unresolvedProblems(held([['rhythm.group', '{sp.3}']]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /references \{sp\.3\}, which no token in the carried set defines/);
  assert.match(problems[0] ?? '', /leaves the braces in its output/);
});

test('a reference the carried set does define resolves', () => {
  assert.deepEqual(
    unresolvedProblems(held([['sp.3', { value: 12, unit: 'px' }], ['rhythm.group', '{sp.3}']])),
    [],
  );
});

test('a reference that comes back round to its own token is reported rather than walked forever', () => {
  const problems = cycleProblems(held([['a', '{b}'], ['b', '{a}']]));
  assert.ok(problems.length > 0);
  assert.match(problems[0] ?? '', /resolves to itself/);
  assert.deepEqual(cycleProblems(held([['sp.3', 12], ['rhythm.group', '{sp.3}']])), []);
});

test('a walk with no token, or with no reference at all, is a failure rather than a clean pass', () => {
  assert.deepEqual(zeroWalkProblems(1, 1), []);
  assert.equal(zeroWalkProblems(0, 1).length, 1);
  assert.match(zeroWalkProblems(1, 0)[0] ?? '', /authored as aliases on purpose/);
});

test('tokensOf reads leaves and never groups', () => {
  const found = tokensOf({ sp: { $type: 'dimension', 1: { $value: { value: 4, unit: 'px' } } } } as never, 'x.json');
  assert.deepEqual(found.map((f) => f.path), ['sp.1']);
});

test('the file that carries no value is left out of the walk, by the same name check:dtcg uses', () => {
  const files = carriedDesign();
  assert.equal(files.some((f) => f.endsWith('/roles.json')), false,
    'roles.json states questions and carries no value, so resolving it would measure a claim it never made');
  assert.ok(EXCLUDED.has('roles.json'));
  assert.ok(files.length > 0);
});

test('the tree passes its own claim, over more than nothing', () => {
  const { files, held: tokens, references, problems } = collect();
  assert.deepEqual(problems, []);
  assert.ok(files.length > 0);
  assert.ok(tokens.length > 0);
  assert.ok(references.length > 0,
    'the rhythm steps and the chart paddings are aliases, so a run finding none is looking in the wrong place');
});
