/* Covers check-boolean-inputs.ts. The cases that matter are the three a looser reader gets
 * wrong: an input that is boolean by its DEFAULT rather than by a type argument, one that is
 * boolean by type and takes no attribute on purpose, and a non-boolean input whose default
 * happens to be a string. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  booleanInputProblems, isBooleanInput, carriesTransform, NOT_AN_ATTRIBUTE,
} from './check-boolean-inputs.ts';

const reader = (files: Record<string, string>) => (path: string) => files[path] ?? '';

test('a boolean input carrying the transform passes', () => {
  const files = {
    'A.ts': 'readonly disabled = input(false, { transform: booleanAttribute });',
  };
  const { problems, found } = booleanInputProblems(Object.keys(files), reader(files), new Map());
  assert.deepEqual(problems, []);
  assert.equal(found, 1);
});

test('a boolean input without the transform fails, naming the component and the member', () => {
  const files = { 'ArenaBulkActionBar.ts': 'readonly clearable = input(true);' };
  const { problems } = booleanInputProblems(Object.keys(files), reader(files), new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaBulkActionBar\.clearable is a boolean input without/);
});

test('a default of true is what makes it boolean, with no type argument anywhere', () => {
  assert.equal(isBooleanInput('', ['true']), true);
  assert.equal(isBooleanInput('', ['false']), true);
  assert.equal(isBooleanInput('<boolean | undefined>', []), true);
  assert.equal(isBooleanInput('<ArenaToastTone>', ["'neutral'"]), false);
  assert.equal(isBooleanInput('', ["'items'"]), false);
});

test('the transform is read out of the options object rather than off the whole call', () => {
  assert.equal(carriesTransform(['false', ' { transform: booleanAttribute }']), true);
  assert.equal(carriesTransform(['false', ' { alias: "off" }']), false);
});

test('an exempt input passes without the transform, and is claimed', () => {
  const files = { 'ArenaIconButton.ts': 'readonly pressed = input<boolean | undefined>();' };
  const exempt = new Map([['ArenaIconButton.pressed', 'a tri-state rather than a toggle.']]);
  assert.deepEqual(booleanInputProblems(Object.keys(files), reader(files), exempt).problems, []);
});

test('an exemption for an input that now carries the transform fails as a wrong record', () => {
  const files = {
    'ArenaIconButton.ts': 'readonly pressed = input(false, { transform: booleanAttribute });',
  };
  const exempt = new Map([['ArenaIconButton.pressed', 'a tri-state rather than a toggle.']]);
  const { problems } = booleanInputProblems(Object.keys(files), reader(files), exempt);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /carries booleanAttribute and is also named in NOT_AN_ATTRIBUTE/);
});

test('an exemption for an input that is gone fails as stale', () => {
  const files = { 'ArenaIconButton.ts': 'readonly icon = input.required<string>();' };
  const exempt = new Map([['ArenaIconButton.pressed', 'a tri-state rather than a toggle.']]);
  const { problems } = booleanInputProblems(Object.keys(files), reader(files), exempt);
  assert.ok(problems.some((p) => /NOT_AN_ATTRIBUTE names ArenaIconButton.pressed/.test(p)));
});

test('reading no boolean input at all is a failure rather than a vacuous pass', () => {
  const files = { 'A.ts': 'readonly label = input.required<string>();' };
  const { problems, found } = booleanInputProblems(Object.keys(files), reader(files), new Map());
  assert.equal(found, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /An empty result set is a failure/);
});

test('every NOT_AN_ATTRIBUTE entry carries its reason', () => {
  assert.equal(NOT_AN_ATTRIBUTE.size, 1);
  for (const [key, reason] of NOT_AN_ATTRIBUTE) {
    assert.match(key, /^Arena\w+\.\w+$/);
    assert.ok(reason.length > 60, `${key} is exempt without a reason a reader can weigh`);
  }
});
