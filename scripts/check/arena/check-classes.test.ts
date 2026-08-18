/* The rules take strings and lists, so the failures are driven by fixtures rather than a tree.
 * NOT_WRITTEN is asserted in both directions, since a class nobody declared and one the sheets
 * have stopped defining are the two ways the map goes wrong. The tree assertions are the ones
 * that would have caught the density pair: they read the real sheets and the real pages. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PAGE, SHEETS, NOT_WRITTEN, classesIn, shipped, zeroClassProblems, homeProblems,
  staleExemptProblems, collect,
} from './check-classes.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-classes-'));
  for (const [rel, text] of Object.entries(files) as [string, string][]) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

test('the subject is derived from the sheets the assembly copies, and the tree carries them', () => {
  assert.ok(SHEETS.length > 0, 'no sheet is declared, so every assertion below is vacuous');
  const names = shipped();
  assert.ok(names.includes('arena-stack'), 'the rhythm sheet reached this gate');
  assert.ok(names.includes('arena-compact'), 'the token layer reached this gate');
});

test('a selector is read wherever it sits, because a class is not always first on its line', () => {
  assert.deepEqual(classesIn('.arena-stack{gap:1px}'), ['arena-stack']);
  assert.deepEqual(classesIn(':root,.arena-light{--x:0}'), ['arena-light']);
  assert.deepEqual(classesIn('.arena-row.arena-row--start{gap:1px}'), ['arena-row', 'arena-row--start']);
  assert.deepEqual(classesIn('@media (min-width:1px){.arena-band{width:1px}}'), ['arena-band']);
});

test('a name written in prose above a block is not a definition', () => {
  assert.deepEqual(classesIn('/* .arena-invented is discussed here */\n.arena-band{width:1px}'), ['arena-band']);
});

test('NOT_WRITTEN states a reason for every class it keeps off the page', () => {
  for (const [name, reason] of NOT_WRITTEN) assert.ok(reason.length > 40, `${name} states its reason`);
  assert.equal(new Set(NOT_WRITTEN.keys()).size, NOT_WRITTEN.size);
});

test('a class no shipped sheet defines any more fails as a stale allowance', () => {
  assert.deepEqual(staleExemptProblems(['arena-band'], new Map([['arena-gone', 'a reason long enough to be a reason']])).length, 1);
  assert.deepEqual(staleExemptProblems(['arena-gone'], new Map([['arena-gone', 'a reason long enough to be a reason']])), []);
});

test('an empty subject is a failure rather than a clean pass', () => {
  assert.equal(zeroClassProblems([]).length, 1);
  assert.deepEqual(zeroClassProblems(['arena-band']), []);
});

test('a class the sheets ship and the npm page never names is reported per layer', () => {
  const base = tree({
    [`frameworks/react/${PAGE}`]: 'the page names `.arena-band` and nothing else\n',
    [`frameworks/angular/${PAGE}`]: 'the page names `.arena-band` and `.arena-compact`\n',
  });
  const problems = homeProblems(base, ['arena-band', 'arena-compact'], new Map());
  assert.equal(problems.length, 1, 'one page names both and the other names one');
  assert.match(problems[0] ?? '', /arena-compact/);
  assert.match(problems[0] ?? '', /react/);
});

test('a declared class is kept off the page without a report', () => {
  const base = tree({
    [`frameworks/react/${PAGE}`]: 'names nothing\n',
    [`frameworks/angular/${PAGE}`]: 'names nothing\n',
  });
  assert.deepEqual(homeProblems(base, ['arena-light'], NOT_WRITTEN), []);
});

test('the tree it actually ships passes, which is the claim the gate prints', () => {
  assert.deepEqual(collect(), []);
});
