import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  promptProblems, regionOf, rulesRegionOf, answersRegionOf, answersProblem, zeroScanProblems, keysProblem,
} from './check-prompts.ts';
import {
  openLine, CLOSE_LINE, renderAnswersRegion, answeredFamilies, RULES_OPEN, RULES_CLOSE_LINE, ROUTER_FROM_PROMPT, renderKeysRegion,
} from '../../generate/arena/generate-prompt-api.ts';

test('every committed prompt carries the region its contract emits', () => {
  const { problems } = promptProblems();
  assert.deepEqual(problems, []);
});

test('the gate read a real corpus rather than an empty one', () => {
  const { held, anchored, scanned } = promptProblems();
  assert.ok(scanned > 100, `reached only ${scanned} prompt(s)`);
  assert.equal(held, scanned, 'a prompt was skipped, so a clean pass says less than it looks');
  assert.equal(anchored, scanned, 'a prompt points nowhere, and it is the reader\'s last stop');
});

test('a file with no region is reported for each, since each answers its own question', () => {
  const { problems } = promptProblems(undefined, [
    { component: 'ArenaBadge', layer: 'react', path: 'frameworks/react/components/display/arena-badge/ArenaBadge.tsx' },
  ]);
  assert.equal(problems.length, 4);
  assert.ok(problems.some((one) => /carries no @answers region/.test(one)));
  assert.ok(problems.some((one) => /carries no @keys region/.test(one)));
  assert.ok(problems.some((one) => /carries no @api region/.test(one)));
  assert.ok(problems.some((one) => /carries no @rules region/.test(one)));
});

test('every prompt names the router, which is the whole point of the note', () => {
  const { problems } = promptProblems();
  assert.deepEqual(problems, []);
  const source = readFileSync(
    join(repoRoot, 'frameworks/react/components/forms/arena-button/ArenaButton.prompt.md'),
    'utf8',
  );
  assert.ok((rulesRegionOf(source) ?? '').includes(ROUTER_FROM_PROMPT));
});

test('rulesRegionOf reads its own region and not the @api one beside it', () => {
  const source = `${openLine('ArenaBadge')}\nrows\n${CLOSE_LINE}\n\n${RULES_OPEN}\nnote\n${RULES_CLOSE_LINE}\n`;
  assert.equal(rulesRegionOf(source), `${RULES_OPEN}\nnote\n${RULES_CLOSE_LINE}`);
  assert.equal(regionOf(source), `${openLine('ArenaBadge')}\nrows\n${CLOSE_LINE}`);
  assert.equal(rulesRegionOf(`${RULES_OPEN}\nnote\n`), null);
});

test('regionOf reads the whole region, markers included', () => {
  const source = `x\n\n${openLine('ArenaBadge')}\nrows\n${CLOSE_LINE}\n\ny\n`;
  assert.equal(regionOf(source), `${openLine('ArenaBadge')}\nrows\n${CLOSE_LINE}`);
});

test('an unclosed region reads as no region, so the gate reports it rather than trusting it', () => {
  assert.equal(regionOf(`${openLine('ArenaBadge')}\nrows\n`), null);
  assert.equal(regionOf('no region here\n'), null);
});

test('an empty scan is a problem, never a clean run', () => {
  assert.equal(zeroScanProblems(0).length, 1);
  assert.deepEqual(zeroScanProblems(110), []);
});

const FILL = {
  family: 'fill', reach: 'box', description: 'd', default: 'arena-fit',
  variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' },
} as const;

test('an @answers region that names a family the manifest does not answer is reported', () => {
  const stale = `x\n${renderAnswersRegion('ArenaCard', 'react', [FILL])}\n`;
  assert.equal(answersProblem('p.md', stale, 'ArenaCard', 'react', []).length, 1);
  assert.deepEqual(answersProblem('p.md', stale, 'ArenaCard', 'react', [FILL]), []);
  assert.equal(answersProblem('p.md', 'x\n', 'ArenaCard', 'react', []).length, 1);
  assert.equal(answersRegionOf(stale), renderAnswersRegion('ArenaCard', 'react', [FILL]));
});

test('the real tree answers fill, emphasis and size for ArenaButton, so the generator and the gate do not agree on nothing', () => {
  const answered = answeredFamilies('ArenaButton');
  assert.deepEqual(answered.map((one) => one.family), ['fill', 'emphasis', 'size']);
  for (const layer of ['react', 'angular']) {
    assert.match(renderAnswersRegion('ArenaButton', layer, answered), /`arena-fill`/);
  }
  const path = 'frameworks/react/components/forms/arena-button/ArenaButton.prompt.md';
  assert.match(answersRegionOf(readFileSync(join(repoRoot, path), 'utf8')) ?? '', /`arena-fill`/);
});

test('a prompt whose keys region is missing or stale is a problem, and a fresh one is not', () => {
  const pattern = { name: 'tabs', requires: { 'keyboard.ArrowLeft': 'moves left' } };
  const fresh = `x\n\n${renderKeysRegion({ pattern: 'tabs' }, pattern)}\n`;
  assert.deepEqual(keysProblem('p.md', fresh, { pattern: 'tabs' }, pattern), []);
  assert.match(keysProblem('p.md', 'x\n', { pattern: 'tabs' }, pattern)[0] ?? '', /carries no @keys region/);
  assert.match(keysProblem('p.md', fresh.replace('moves left', 'moves right'), { pattern: 'tabs' }, pattern)[0] ?? '',
    /does not match/);
});
