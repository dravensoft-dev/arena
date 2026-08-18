/* The two exemptions are what these mostly hold, because an exemption that is wrong makes the
 * gate quiet rather than loud: a same-name pair is never compared at all, and a same-family pair
 * is compared against a much larger number. The third is the normalizer: a generated region left
 * in made every prompt overlap every other one through the same emitted line, which read as 24
 * findings and was one. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MIN_WORDS, LIMIT, FAMILY_LIMIT, FAMILY_DEBT, ONE_SOURCE_RENDERED_TWICE,
  authored, sentences, sameSubject, sameFamily, familyOf, limitFor,
  documents, duplicationProblems, zeroScanProblems,
} from './check-duplication.ts';

const long = (word: string) => `${`${word} `.repeat(MIN_WORDS).trim()}.`;

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-duplication-'));
  for (const [rel, text] of Object.entries(files)) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

test('a sentence is long enough that a heading cannot collide with one by accident', () => {
  assert.equal(sentences('# Title').length, 0);
  assert.equal(sentences('one two three four.').length, 0);
  assert.equal(sentences(long('word')).length, 1);
});

test('a table row and a code span are cut, so a shared member name is not a shared concept', () => {
  assert.equal(sentences(`| a | b |\n${long('word')}`).length, 1);
  const [one] = sentences(`${long('word')} and \`ArenaTag\` is here as well today.`);
  assert.match(one ?? '', /^word/);
  assert.ok(!sentences('`ArenaTag` `ArenaCard` `ArenaBadge` `A` `B` `C` `D` `E`.').join(' ').includes('arenatag'));
});

test('a generated region is cut out, because it is one source rendered into many files', () => {
  const source = ['prose above', '<!-- @api GENERATED from contracts -->', 'emitted line',
    '<!-- @api end -->', 'prose below'].join('\n');
  assert.equal(authored(source), 'prose above\nprose below');
  assert.equal(authored('no region at all'), 'no region at all');
});

test('two documents with one name are one document rendered per layer, and are never compared', () => {
  assert.equal(sameSubject('frameworks/react/PACKAGE.md', 'frameworks/angular/PACKAGE.md'), true);
  assert.equal(sameSubject('frameworks/react/INDEX.md', 'frameworks/react/PACKAGE.md'), false);
  assert.ok(ONE_SOURCE_RENDERED_TWICE.length > 80, 'the exemption states its reason');
});

test('a family is the category a component is filed under, in either layer', () => {
  const bar = 'frameworks/react/components/charts/arena-bar-chart/ArenaBarChart.prompt.md';
  const line = 'frameworks/angular/components/charts/arena-line-chart/ArenaLineChart.prompt.md';
  const card = 'frameworks/react/components/display/arena-card/ArenaCard.prompt.md';
  assert.equal(familyOf(bar), 'charts');
  assert.equal(familyOf('AGENTS.md'), null);
  assert.equal(sameFamily(bar, line), true);
  assert.equal(sameFamily(bar, card), false);
  assert.equal(limitFor(bar, line), FAMILY_LIMIT);
  assert.equal(limitFor(bar, card), LIMIT);
  assert.equal(limitFor('AGENTS.md', 'DOUBTS.md'), LIMIT);
  assert.ok(FAMILY_LIMIT > LIMIT, 'a family shares its own rule and is bounded rather than banned');
  assert.ok(FAMILY_DEBT.length > 200, 'the family allowance states the cost and the way out');
});

test('a pair over its limit names the count, the limit and one of the sentences it repeats', () => {
  const shared = Array.from({ length: LIMIT + 1 }, (_, i) => long(`shared${i}`)).join(' ');
  const base = tree({ 'a/AGENTS.md': shared, 'b/DOUBTS.md': `${shared}\n${long('own')}` });
  const problems = duplicationProblems(base, ['a/AGENTS.md', 'b/DOUBTS.md']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', new RegExp(`state ${LIMIT + 1} of the same sentences, over a limit of ${LIMIT}`));
  assert.match(problems[0] ?? '', /Give it one owner/);
});

test('a pair at its limit passes, so a shared Do or Don\'t line is not a duplicated concept', () => {
  const shared = Array.from({ length: LIMIT }, (_, i) => long(`shared${i}`)).join(' ');
  const base = tree({ 'a/AGENTS.md': shared, 'b/DOUBTS.md': shared });
  assert.deepEqual(duplicationProblems(base, ['a/AGENTS.md', 'b/DOUBTS.md']), []);
});

test('a family pair is measured against the family limit and says what the debt is', () => {
  const over = Array.from({ length: FAMILY_LIMIT + 1 }, (_, i) => long(`shared${i}`)).join(' ');
  const a = 'frameworks/react/components/charts/arena-bar-chart/ArenaBarChart.prompt.md';
  const b = 'frameworks/react/components/charts/arena-line-chart/ArenaLineChart.prompt.md';
  const base = tree({ [a]: over, [b]: over });
  const problems = duplicationProblems(base, [a, b]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /They are one family/);
});

test('an empty read and a tree with no overlap at all are failures rather than a clean pass', () => {
  assert.match(zeroScanProblems([], 0)[0] ?? '', /a comparison needs two/);
  assert.match(zeroScanProblems(['a.md', 'b.md'], 0)[0] ?? '', /the reader stopped reading/);
  assert.deepEqual(zeroScanProblems(['a.md', 'b.md'], 5), []);
});

test('the repository states no concept twice outside a family or a rendering', () => {
  const docs = documents();
  assert.ok(docs.length > 100, 'the walk reaches the whole documentation tree');
  assert.deepEqual(duplicationProblems(undefined, docs), []);
});
