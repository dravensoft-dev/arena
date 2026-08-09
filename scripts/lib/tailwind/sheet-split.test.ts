/* The split is what lets an adopter who already runs Tailwind skip Arena's preflight and
 * take its utilities, so the two halves must be separable without either losing the layer
 * order declaration: `@layer properties;` is declared before the four-name order, and a half
 * that dropped it would sort Tailwind's own property fallbacks above everything. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitCompiledSheet } from './sheet-split.ts';
import { repoRoot } from '../arena/repo-root.ts';

const SHEET = [
  '/* banner */',
  '@layer properties;',
  '@layer theme, base, components, utilities;',
  '@layer theme {',
  '  :root { --color-x: red; }',
  '}',
  '@layer base {',
  '  * { margin: 0; }',
  '}',
  '@layer utilities {',
  '  .p-1 { padding: 4px; }',
  '}',
  '@keyframes spin { to { rotate: 360deg; } }',
  '',
].join('\n');

test('the base half carries the preflight and nothing else of the sheet', () => {
  const { base } = splitCompiledSheet(SHEET);
  assert.match(base, /@layer base \{/);
  assert.match(base, /margin: 0/);
  assert.doesNotMatch(base, /@layer utilities \{/);
  assert.doesNotMatch(base, /--color-x/, 'the theme belongs with the utilities that read it');
  assert.doesNotMatch(base, /@keyframes/);
});

test('the utilities half carries the theme, the utilities and the trailing at-rules', () => {
  const { utilities } = splitCompiledSheet(SHEET);
  assert.match(utilities, /--color-x/);
  assert.match(utilities, /\.p-1/);
  assert.match(utilities, /@keyframes spin/);
  assert.doesNotMatch(utilities, /@layer base \{/, 'the preflight is the half an adopter may skip');
  assert.doesNotMatch(utilities, /margin: 0/);
});

test('both halves declare the layer order, so either can be imported without the other', () => {
  const { base, utilities } = splitCompiledSheet(SHEET);
  for (const half of [base, utilities]) {
    assert.match(half, /@layer properties;/);
    assert.match(half, /@layer theme, base, components, utilities;/);
    assert.ok(half.indexOf('@layer properties;') < half.indexOf('@layer theme, base'),
      'properties is declared first or it stops being the lowest layer');
  }
});

test('a brace inside a string does not end the block early', () => {
  const tricky = SHEET.replace("  * { margin: 0; }", '  *::before { content: "}"; margin: 0; }');
  const { base, utilities } = splitCompiledSheet(tricky);
  assert.match(base, /content: "\}"/);
  assert.match(base, /margin: 0/);
  assert.doesNotMatch(utilities, /margin: 0/, 'the block was cut at the brace inside the string');
});

test('a sheet with no preflight is refused rather than split into one empty half', () => {
  assert.throws(() => splitCompiledSheet('@layer utilities {\n  .p-1 { padding: 4px; }\n}\n'),
    /no top-level `@layer base`/);
});

test('a sheet whose halves would lose rules is refused', () => {
  assert.throws(() => splitCompiledSheet('@layer base {\n}\n'), /nothing but the preflight/);
});

test('THE REAL SHEET: the two halves reassemble to every rule the one file carries', () => {
  const css = readFileSync(join(repoRoot, 'frameworks/tailwind/Utilities.generated.css'), 'utf8');
  const { base, utilities } = splitCompiledSheet(css);

  const rules = (text: string) => (text.match(/\{/g) ?? []).length;
  assert.equal(rules(base) + rules(utilities), rules(css),
    'a layer declaration opens no block, so the brace counts add up exactly; a mismatch means '
    + 'a rule was dropped or duplicated');

  assert.ok(base.includes('-webkit-text-size-adjust'), 'the preflight is in the base half');
  assert.ok(base.includes('font: inherit'), 'including the form-control rule Arena depends on');
  assert.ok(utilities.includes('.bg-base-200'), 'and the utilities in the other');
  assert.ok(!utilities.includes('-webkit-text-size-adjust'),
    'with no preflight left behind in it. The marker is not `box-sizing: border-box`, which the '
    + 'preflight sets on every element AND `.box-border` sets on one, so it proves nothing here');
});

test('THE REAL SHEET: nothing is rewritten, only moved -- the halves are the original\'s own bytes', () => {
  const css = readFileSync(join(repoRoot, 'frameworks/tailwind/Utilities.generated.css'), 'utf8');
  const { base, utilities } = splitCompiledSheet(css);

  const block = base.slice(base.indexOf('@layer base {'));
  assert.ok(css.includes(block.trimEnd()),
    'the base half is a verbatim slice of the compiled sheet, not a re-serialisation of it');

  const strip = (text: string) => text.replace(/^@layer [^{};]*;$/gm, '').replace(/\s+/g, ' ').trim();
  assert.equal(
    strip(utilities),
    strip(css.replace(block.trimEnd(), '')),
    'the utilities half is the compiled sheet with exactly the base block lifted out',
  );
});

test('the layer order survives the cut, which is the only thing the cascade depends on', () => {
  const css = readFileSync(join(repoRoot, 'frameworks/tailwind/Utilities.generated.css'), 'utf8');
  const declared = (text: string) => (text.match(/^@layer [^{};]*;$/gm) ?? []);
  const { base, utilities } = splitCompiledSheet(css);

  assert.deepEqual(declared(base), declared(css));
  assert.deepEqual(declared(utilities), declared(css),
    'either half imported alone establishes the same order the one file did, so a browser sorts '
    + 'base under utilities whichever the adopter takes');
});
