import test from 'node:test';
import assert from 'node:assert/strict';
import { declarationProblems, defaultProblems, emittedTypes, rosterProblems, zeroRoleProblems, collect, ROLES } from './check-role-contract.ts';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const described = { $type: 'dimension', $description: 'x' };

test('a role carrying a value is not a declaration', () => {
  const problems = declarationProblems({ 'r-surface': { ...described, $value: '{r.lg}' } });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /r-surface carries a \$value/);
});

test('a role needs a type and a description', () => {
  assert.match(declarationProblems({ 'r-surface': { $type: 'dimension' } })[0] ?? '', /no \$description/);
  assert.match(declarationProblems({ 'r-surface': { $description: 'x' } })[0] ?? '', /no \$type/);
});

test('a keyword declares its closed set', () => {
  assert.match(declarationProblems({ 'tt-label': { $type: 'keyword', $description: 'x' } })[0] ?? '',
    /closed set/);
  assert.deepEqual(declarationProblems({
    'tt-label': {
      $type: 'keyword',
      $description: 'x',
      $extensions: { 'com.dravensoft.arena': { values: ['none', 'uppercase'] } },
    },
  }), []);
});

test('a zero walk is a failure and not a clean pass', () => {
  assert.equal(zeroRoleProblems(0).length, 1);
  assert.deepEqual(zeroRoleProblems(69), []);
});

test('the real declaration holds: it asks, answers only through a default alias, and a role outside the roster carries one', () => {
  assert.deepEqual(collect(), []);
});

const ARENA = 'com.dravensoft.arena';

const typed = (type: string) => ({ $type: type, $description: 'x' });

const defaulted = (type: string, alias: unknown, values?: string[]) => ({
  $type: type, $description: 'x', $extensions: { [ARENA]: { default: alias, ...(values ? { values } : {}) } },
});

const EMITTED = new Map([['r-lg', 'dimension'], ['color-primary', 'color']]);

test('a default aliasing a role or an emitted token of its own type holds', () => {
  assert.deepEqual(defaultProblems({
    'ink-body': typed('color'),
    'ink-link': defaulted('color', '{ink-body}'),
    'ink-accent': defaulted('color', '{color.primary}'),
    'r-popover': defaulted('dimension', '{r.lg}'),
  }, EMITTED), []);
});

test('a literal, an alias naming nothing and a type that disagrees are refused', () => {
  const problems = defaultProblems({
    'ink-body': typed('color'),
    literal: defaulted('color', '#ff0000'),
    nowhere: defaulted('color', '{color.nonesuch}'),
    crossed: defaulted('dimension', '{ink-body}'),
  }, EMITTED);
  assert.equal(problems.length, 3);
  assert.match(problems[0] ?? '', /^literal: its kernel default is "#ff0000", which is not an alias/);
  assert.match(problems[1] ?? '', /^nowhere: its kernel default \{color\.nonesuch\} names neither a role/);
  assert.match(problems[2] ?? '', /^crossed: is a dimension and its kernel default \{ink-body\} is a color/);
});

test('a keyword default may not offer a word outside the role\'s set', () => {
  const problems = defaultProblems({
    'tt-label': { ...typed('keyword'), $extensions: { [ARENA]: { values: ['none', 'uppercase', 'lowercase'] } } },
    'tt-chip': defaulted('keyword', '{tt-label}', ['none', 'uppercase']),
    'tt-tag': defaulted('keyword', '{tt-label}', ['none', 'uppercase', 'lowercase', 'capitalize']),
  }, EMITTED);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^tt-chip: its kernel default \{tt-label\} can take lowercase, outside none, uppercase/);
});

test('defaults that lead back to themselves are refused on every role of the cycle', () => {
  const problems = defaultProblems({
    a: defaulted('color', '{b}'), b: defaulted('color', '{a}'), self: defaulted('color', '{self}'),
  }, EMITTED);
  assert.equal(problems.length, 3);
  assert.match(problems[0] ?? '', /^a: its kernel default leads back to it through a, then b, then a/);
});

test('the roster holds the roles born without a default, and a role outside it carries one', () => {
  const roles = { 'r-surface': typed('dimension'), 'r-popover': defaulted('dimension', '{r.lg}') };
  assert.deepEqual(rosterProblems(roles, ['r-surface']), []);
  assert.match(rosterProblems({ ...roles, 'r-sheet': typed('dimension') }, ['r-surface'])[0] ?? '',
    /^r-sheet carries no kernel default and is not in scripts\/check\/core\/roles-without-default\.json/);
  assert.match(rosterProblems(roles, ['r-surface', 'r-popover'])[0] ?? '', /^r-popover is in .* and carries a kernel default/);
  assert.match(rosterProblems(roles, ['r-surface', 'r-gone'])[0] ?? '',
    /names r-gone, which contracts\/design\/roles\.json does not declare/);
  assert.equal(rosterProblems(roles, 'r-surface').length, 1);
});

test('the emitted tokens are the scales, typed, and never a role', () => {
  const emitted = emittedTypes();
  assert.equal(emitted.get('r-lg'), 'dimension');
  assert.equal(emitted.get('color-primary'), 'color');
  assert.equal(emitted.has('r-surface'), false);
  assert.ok(emitted.size > 100, `found ${emitted.size} emitted tokens`);
});

test('the side nav row and app bar band padding roles default to what they read', () => {
  const roles = readJson(join(repoRoot, ROLES)) as Record<string, { $extensions?: Record<string, { default?: string }> }>;
  const defaults = Object.fromEntries(['pad-nav-row-x', 'pad-nav-row-y', 'pad-band-x', 'pad-band-y']
    .map((name) => [name, roles[name]?.$extensions?.[ARENA]?.default]));
  assert.deepEqual(defaults, {
    'pad-nav-row-x': '{pad-row-x}', 'pad-nav-row-y': '{pad-row-y}', 'pad-band-x': '{gutter}', 'pad-band-y': '{sp.3}',
  });
});
