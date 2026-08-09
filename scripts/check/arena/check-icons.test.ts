/* Covers check-icons.ts. The weight map is a fixture rather than the installed package, so a
 * case states a name and a weight without 1500 real ones behind it, and the vacuous-pass guard
 * is asserted directly: a gate that finds no stylesheet must fail rather than report clean. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import {
  EXEMPT, ICON_TOKEN, SCANNED_ROOTS, everyGlyph, scannedFiles, staleExemptions, tokenProblems,
  weightsFrom, zeroWeightProblems,
} from './check-icons.ts';

const ARENA_WEIGHTS = new Map([
  ['ph', new Set(['ph-house', 'ph-gear', 'ph-acorn'])],
  ['ph-bold', new Set(['ph-house', 'ph-gear', 'ph-acorn'])],
  ['ph-fill', new Set(['ph-house', 'ph-gear'])],
]);

function tree(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'arena-icons-'));
  for (const [rel, body] of Object.entries(files) as [string, string][]) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  }
  return root;
}

test('EXEMPT is empty, and staying empty is the point', () => {
  assert.equal(EXEMPT.size, 0,
    'a name Phosphor does not have is a typo rather than a case, so an entry here needs an '
    + 'argument for why an empty box is correct');
});

test('a glyph that exists in the paired weight is silent', () => {
  assert.deepEqual(tokenProblems('<i class="ph-bold ph-house"></i>', 'a.html', ARENA_WEIGHTS), []);
  assert.deepEqual(tokenProblems("icon: 'ph-fill ph-gear'", 'a.ts', ARENA_WEIGHTS), []);
  assert.deepEqual(tokenProblems('<i class="ph ph-acorn"></i>', 'a.html', ARENA_WEIGHTS), []);
});

test('a name no weight has is reported, which is the typo the gate exists for', () => {
  const problems = tokenProblems('<i class="ph-bold ph-hosue"></i>', 'a.html', ARENA_WEIGHTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /a\.html:1/);
  assert.match(problems[0] ?? '', /"ph-hosue" is not a Phosphor glyph in any weight/);
  assert.match(problems[0] ?? '', /empty box/);
});

test('a real glyph in a weight that does not carry it is reported separately', () => {
  const problems = tokenProblems('<i class="ph-fill ph-acorn"></i>', 'a.html', ARENA_WEIGHTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /not in the "ph-fill" weight/);
});

test('a bare weight class on its own is fine, since it names no glyph', () => {
  assert.deepEqual(tokenProblems('const WEIGHT = "ph-bold";', 'a.ts', ARENA_WEIGHTS), []);
});

test('the line number is the line the name is on', () => {
  const problems = tokenProblems('ok\nok\n<i class="ph-bold ph-nope"></i>', 'a.html', ARENA_WEIGHTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /a\.html:3/);
});

test('no stylesheet at all is a failure, not a clean pass over nothing', () => {
  assert.deepEqual(zeroWeightProblems(ARENA_WEIGHTS), []);
  const problems = zeroWeightProblems(new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /vacuous pass/);
});

test('everyGlyph is the union, so a glyph in one weight is a known name', () => {
  assert.deepEqual([...everyGlyph(ARENA_WEIGHTS)].sort(), ['ph-acorn', 'ph-gear', 'ph-house']);
});

test('the token pattern takes a class name and leaves ordinary prose alone', () => {
  const of = (text: string) => [...text.matchAll(ICON_TOKEN)].map((m) => m[0]);
  assert.deepEqual(of('class="ph-bold ph-caret-up"'), ['ph-bold', 'ph-caret-up']);
  assert.deepEqual(of('a pH of 7, and the ph value'), []);
  assert.deepEqual(of('ph-arrow-fat-line-up'), ['ph-arrow-fat-line-up']);
});

test('a stale exemption fails, the way every reason-carrying map here does', () => {
  assert.deepEqual(staleExemptions(new Set()), [],
    'nothing is exempt today, so nothing can be stale');
});

test('the walk skips the directories that hold copies, and takes the roots by name', () => {
  const root = tree({
    'frameworks/react/A.tsx': 'ph-bold ph-house',
    'frameworks/react/dist/A.js': 'ph-bold ph-nope',
    'frameworks/react/vendor/React.generated.js': 'ph-bold ph-nope',
    'node_modules/x/y.ts': 'ph-bold ph-nope',
    'intro/page.html': 'ph-fill ph-gear',
    'somewhere-else/z.ts': 'ph-bold ph-nope',
  });
  const found = scannedFiles(root).map((p) => relPosix(root, p));
  assert.deepEqual(found.sort(), ['frameworks/react/A.tsx', 'intro/page.html'],
    'dist/ and vendor/ hold copies, and a root the list does not name is out of scope');
  rmSync(root, { recursive: true });
});

test('the scanned roots are named by literal value', () => {
  assert.deepEqual([...SCANNED_ROOTS].sort(), ['contracts', 'docs', 'frameworks', 'intro'],
    'adding a root is a decision: a tree nobody scans is a tree where a typo lives forever');
});

test('the installed package yields every weight, each with a real glyph set', () => {
  const weights = weightsFrom();
  assert.ok(weights.has('ph'), 'the regular weight is `.ph`, not `.ph-regular`');
  assert.ok(weights.has('ph-bold'));
  assert.ok(weights.has('ph-fill'));
  for (const [name, glyphs] of weights) {
    assert.ok(glyphs.size > 1000, `${name} yielded ${glyphs.size} glyphs, which is a parse failure`);
    assert.ok(glyphs.has('ph-house'), `${name} is missing a glyph every weight has`);
  }
});
