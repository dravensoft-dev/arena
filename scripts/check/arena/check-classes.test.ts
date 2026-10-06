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
  PAGE, SHEETS, VOCABULARY_PAGE, NOT_WRITTEN, classesIn, shipped, zeroClassProblems, homeProblems,
  staleExemptProblems, collect, utilitiesIn, themeUtilities,
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
  assert.ok(names.includes('arena-stack'), 'the stack family\'s sheet reached this gate');
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

const FAMILY = (dir: string, target: string) => ({
  [`frameworks/tailwind/vocabulary/${dir}/F.family.json`]: JSON.stringify({ family: dir, reach: 'box', ...(target === 'markup' ? { target } : {}),
    description: 'd', variants: { [`arena-${dir}-a`]: '[--arena-x:1px]' } }),
});

test('a component family option named only on the vocabulary page passes, one named nowhere fails', () => {
  const base = tree({
    ...FAMILY('opt', 'component'),
    [`frameworks/react/${PAGE}`]: 'names nothing\n',
    [`frameworks/angular/${PAGE}`]: 'names nothing\n',
    [VOCABULARY_PAGE]: '| `opt` | `arena-opt-a` |\n',
  });
  assert.deepEqual(homeProblems(base, ['arena-opt-a'], new Map()), []);
  assert.equal(homeProblems(base, ['arena-opt-b'], new Map()).length, 2, 'named nowhere, so both pages fail');
});

test('a component family option fails when the vocabulary page is absent or does not name it', () => {
  const files = {
    ...FAMILY('opt', 'component'),
    [`frameworks/react/${PAGE}`]: 'names nothing\n',
    [`frameworks/angular/${PAGE}`]: 'names nothing\n',
  };
  assert.equal(homeProblems(tree(files), ['arena-opt-a'], new Map()).length, 2, 'no vocabulary page');
  assert.equal(homeProblems(tree({ ...files, [VOCABULARY_PAGE]: '| `opt` | `arena-opt-z` |\n' }), ['arena-opt-a'], new Map()).length, 2, 'a page that names other options');
});

test('a markup class named only on the vocabulary page still fails', () => {
  const base = tree({
    ...FAMILY('opt', 'markup'),
    [`frameworks/react/${PAGE}`]: 'names nothing\n',
    [`frameworks/angular/${PAGE}`]: 'names nothing\n',
    [VOCABULARY_PAGE]: '| `opt` | `arena-opt-a` |\n',
  });
  assert.equal(homeProblems(base, ['arena-opt-a'], new Map()).length, 2);
});

test('the tree it actually ships passes, which is the claim the gate prints', () => {
  assert.deepEqual(collect(), []);
});

test('NOT_WRITTEN names the eight theme utilities, and an entry no sheet and no utility defines is stale', () => {
  const eight = ['arena-shimmer', 'arena-pop', 'arena-menu', 'arena-fade', 'arena-prog-indeterminate', 'arena-prog-ring', 'arena-btn-spin', 'arena-spinner'];
  for (const name of eight) assert.ok(NOT_WRITTEN.has(name), `${name} is recorded`);
  assert.deepEqual([...themeUtilities().keys()].filter((name) => !NOT_WRITTEN.has(name)), []);
  assert.deepEqual(utilitiesIn('/* @utility arena-no { } */ @utility arena-yes {\n a: b }\n@utility other { }'), ['arena-yes']);
  const only = new Map([['arena-spinner', 'a reason long enough to be a reason']]);
  assert.deepEqual(staleExemptProblems([], only, ['arena-spinner']), []);
  assert.equal(staleExemptProblems([], only, []).length, 1);
});
