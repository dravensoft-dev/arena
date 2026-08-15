import test from 'node:test';
import assert from 'node:assert/strict';
import { collisionProblems, declarationsByFile } from './check-token-collisions.ts';

const files = (...pairs: [string, string][]) => pairs.map(([file, css]) => ({ file, css }));

test('the same property from two files on one selector is the failure this gate exists for', () => {
  const errs = collisionProblems(files(
    ['typography.generated.css', ':root{--ls-label:0.22em;}'],
    ['effects.generated.css', ':root{--ls-label:0.14em;}'],
  ));
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /--ls-label/);
  assert.match(errs[0] ?? '', /typography\.generated\.css and effects\.generated\.css/);
  assert.match(errs[0] ?? '', /prefix/,
    'the message has to name the fix, because the cause is always a role wearing a scale name and '
    + 'the author who hit it is looking at two files that are each correct');
});

test('the same property on two DIFFERENT selectors is how a theme and a density work', () => {
  assert.deepEqual(collisionProblems(files(
    ['palette.generated.css', ':root{--color-base-100:#12100d;}'],
    ['palette.generated.css', '.arena-light{--color-base-100:#faf8f5;}'],
  )), [], 'one file restating a property under another scope is the mechanism, not the defect');
  assert.deepEqual(collisionProblems(files(
    ['spacing.generated.css', ':root{--dz-text-xs:11px;}'],
    ['effects.generated.css', '.arena-compact{--dz-text-xs:10px;}'],
  )), []);
});

test('a property declared twice inside one file is that file\'s own business', () => {
  assert.deepEqual(collisionProblems(files(
    ['effects.generated.css', ':root{--r-surface:14px;}\n:root{--r-surface:14px;}'],
  )), [],
  'source order inside one generated file is decided by FILES, which check:extensions already '
  + 'holds; this gate is about two files that do not know about each other');
});

test('comments carrying a property name do not count as a declaration', () => {
  const seen = declarationsByFile(files(
    ['a.css', ':root{/* --ls-label is the step below */--ls-heading:-0.02em;}'],
    ['b.css', ':root{--ls-label:0.22em;}'],
  ));
  assert.deepEqual(collisionProblems(files(
    ['a.css', ':root{/* --ls-label is the step below */--ls-heading:-0.02em;}'],
    ['b.css', ':root{--ls-label:0.22em;}'],
  )), []);
  assert.equal(seen.size, 2);
});

test('a clean set of files reports every declaration it walked', () => {
  const seen = declarationsByFile(files(
    ['a.css', ':root{--one:1px;--two:2px;}'],
    ['b.css', ':root{--three:3px;}\n.arena-light{--three:4px;}'],
  ));
  assert.equal(seen.size, 4, 'three on :root and one on .arena-light');
  assert.deepEqual(collisionProblems(files(
    ['a.css', ':root{--one:1px;--two:2px;}'],
    ['b.css', ':root{--three:3px;}\n.arena-light{--three:4px;}'],
  )), []);
});
