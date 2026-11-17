import test from 'node:test';
import assert from 'node:assert/strict';
import { declarationProblems, defaultProblems, singleAnswerProblems, emittedTypes, emittedWords, rosterProblems, zeroRoleProblems, collect, ROLES, metadataProblems, questionProblems, combineProblems, levelNames, QUESTION_MAX, SIZE_QUESTION_MAX } from './check-role-contract.ts';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

test('a keyword default may name an emitted keyword token, and only one whose word the role takes', () => {
  const words = new Map([['case-none', 'none'], ['case-loud', 'uppercase']]);
  const emitted = new Map([...EMITTED, ['case-none', 'keyword'], ['case-loud', 'keyword']]);
  const problems = defaultProblems({
    'tt-key': defaulted('keyword', '{case.none}', ['none', 'capitalize']),
    'tt-pill': defaulted('keyword', '{case.loud}', ['none', 'capitalize']),
  }, emitted, words);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^tt-pill: its kernel default \{case\.loud\} is the word uppercase, outside none, capitalize/);
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

test('the package emits a keyword token and a half spacing step a role can default to', () => {
  assert.equal(emittedTypes().get('case-none'), 'keyword');
  assert.equal(emittedWords().get('case-none'), 'none');
  assert.equal(emittedTypes().get('sp-0-5'), 'dimension');
});

test('the side nav row and app bar band padding roles default to what they read', () => {
  const roles = readJson(join(repoRoot, ROLES)) as Record<string, { $extensions?: Record<string, { default?: string }> }>;
  const defaults = Object.fromEntries(['pad-nav-row-x', 'pad-nav-row-y', 'pad-band-x', 'pad-band-y']
    .map((name) => [name, roles[name]?.$extensions?.[ARENA]?.default]));
  assert.deepEqual(defaults, {
    'pad-nav-row-x': '{pad-row-x}', 'pad-nav-row-y': '{pad-row-y}', 'pad-band-x': '{gutter}', 'pad-band-y': '{sp.3}',
  });
});

test('a badge at arena-size-sm defaults to a smaller label and tighter padding than at arena-size-md', () => {
  const roles = readJson(join(repoRoot, ROLES)) as Record<string, { $extensions?: Record<string, { default?: string }> }>;
  const defaults = Object.fromEntries(['size-sm-badge-pad-x', 'size-sm-badge-pad-y', 'size-sm-badge-step']
    .map((name) => [name, roles[name]?.$extensions?.[ARENA]?.default]));
  assert.deepEqual(defaults, {
    'size-sm-badge-pad-x': '{sp.1}', 'size-sm-badge-pad-y': '{sp.0}', 'size-sm-badge-step': '{dz.text-2xs}',
  });
});

test('no role has only its default as a valid answer', () => {
  const one = singleAnswerProblems({ 'x-one': defaulted('keyword', '{case.none}', ['none']) });
  assert.equal(one.length, 1);
  assert.match(one[0] ?? '', /x-one/);
  const heat = singleAnswerProblems({ 'x-heat': defaulted('color', '{color.heat-1}') });
  assert.equal(heat.length, 1);
  assert.match(heat[0] ?? '', /x-heat/);
  assert.deepEqual(singleAnswerProblems({
    'x-two': defaulted('keyword', '{case.none}', ['none', 'uppercase']),
    'x-ink': defaulted('color', '{ink-muted}'),
    'x-floor': { ...typed('keyword'), $extensions: { [ARENA]: { values: ['transparent'] } } },
  }), []);
  assert.deepEqual(singleAnswerProblems(readJson(join(repoRoot, ROLES)) as any), []);
});

const meta = (extra: Record<string, unknown> = {}) => ({
  $type: 'dimension', $description: 'x',
  $extensions: { 'com.dravensoft.arena': { audience: 'markup', task: 'edges', userScale: 'fixed', ...extra } },
});

test('a role declares who reads it and which task it serves', () => {
  const none = meta({ audience: undefined });
  assert.equal(metadataProblems({ 'r-surface': none }).length, 1);
  assert.match(metadataProblems({ 'r-surface': none })[0] ?? '', /no audience.*markup, component/);
  const bad = metadataProblems({ 'r-surface': meta({ audience: 'adopter' }) });
  assert.equal(bad.length, 1);
  assert.match(bad[0] ?? '', /"adopter"/);
  const noTask = metadataProblems({ 'r-surface': meta({ task: undefined }) });
  assert.equal(noTask.length, 1);
  assert.match(noTask[0] ?? '', /no task.*surfaces-and-text.*component-size/);
  const badTask = metadataProblems({ 'r-surface': meta({ task: 'colour' }) });
  assert.equal(badTask.length, 1);
  assert.match(badTask[0] ?? '', /"colour"/);
  assert.deepEqual(metadataProblems({ 'r-surface': meta() }), []);
});

test('a dimension role declares its user-scale axis and any other role may', () => {
  const none = metadataProblems({ 'r-surface': meta({ userScale: undefined }) });
  assert.equal(none.length, 1);
  assert.match(none[0] ?? '', /no userScale/);
  const bad = metadataProblems({ 'r-surface': meta({ userScale: 'grows' }) });
  assert.equal(bad.length, 1);
  assert.match(bad[0] ?? '', /"grows"/);
  assert.match(bad[0] ?? '', /scales, follows, fixed/);
  assert.deepEqual(metadataProblems({ 'n-count': { ...meta({ userScale: 'follows' }), $type: 'number' } }), []);
  assert.deepEqual(metadataProblems({ 'c-ink': { ...meta({ userScale: undefined }), $type: 'color' } }), []);
  assert.equal(metadataProblems({ 'c-ink': { ...meta({ userScale: 'grows' }), $type: 'color' } }).length, 1);
});

test('deleting any metadata key from the real declaration fails the gate', () => {
  const roles = readJson(join(repoRoot, ROLES)) as Record<string, any>;
  assert.deepEqual(metadataProblems(roles), []);
  for (const key of ['audience', 'task', 'userScale']) {
    const copy = structuredClone(roles);
    delete copy['r-surface'].$extensions['com.dravensoft.arena'][key];
    const problems = metadataProblems(copy);
    assert.equal(problems.length, 1, key);
    assert.match(problems[0] ?? '', /r-surface/);
  }
});

const asking = (question?: unknown, combines?: unknown) => ({
  $type: 'dimension', $description: 'x',
  $extensions: { [ARENA]: { ...(question === undefined ? {} : { question }), ...(combines === undefined ? {} : { combines }) } },
});

test('a role with no question fails, naming it', () => {
  const problems = questionProblems({ 'r-surface': asking() });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^r-surface has no question/);
  assert.match(questionProblems({ 'r-surface': asking(4) })[0] ?? '', /^r-surface declares a question that is not a string/);
});

test('a question must end in ? and fit 140 characters', () => {
  assert.deepEqual(questionProblems({ 'r-surface': asking('How round is the surface?') }), []);
  assert.match(questionProblems({ 'r-surface': asking('How round is the surface.') })[0] ?? '', /^r-surface: .*end in \?/);
  assert.match(questionProblems({ 'r-surface': asking('How round?\nIs it?') })[0] ?? '', /^r-surface: .*more than one line/);
  const long = `${'x'.repeat(QUESTION_MAX)}?`;
  assert.match(questionProblems({ 'r-surface': asking(long) })[0] ?? '', /^r-surface: .*141 characters, over 140/);
  assert.deepEqual(questionProblems({ 'r-surface': asking(`${'x'.repeat(QUESTION_MAX - 1)}?`) }), []);
});

test('a question carries no pipe, backtick or em dash, and a size role keeps to 100', () => {
  for (const bad of ['How wide | tall?', 'How wide is `x`?', 'How wide \u2014 or tall?'])
    assert.match(questionProblems({ 'r-surface': asking(bad) })[0] ?? '', /^r-surface: .*pipe, a backtick or an em dash/);
  const sized = (question: string) => ({ ...asking(question),
    $extensions: { [ARENA]: { question, task: 'component-size' } } });
  const over = `${'x'.repeat(SIZE_QUESTION_MAX)}?`;
  assert.match(questionProblems({ 'size-a': sized(over) })[0] ?? '', /^size-a: .*101 characters, over 100/);
  assert.deepEqual(questionProblems({ 'size-a': sized(`${'x'.repeat(SIZE_QUESTION_MAX - 1)}?`) }), []);
  assert.deepEqual(questionProblems({ 'r-surface': asking(over) }), []);
});

test('two roles cannot ask the same question', () => {
  const problems = questionProblems({ 'r-a': asking('How round?'), 'r-b': asking('How round?') });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^r-b: .*r-a asks/);
});

test('combines takes a role, an emitted token or a colours level', () => {
  const roles = { 'bw-surface': asking('A?'), 'edge-surface': asking('B?') };
  const emitted = new Map([['dz-row-scale-x', 'dimension']]);
  const levels = new Set(['level-ink-muted']);
  const check = (...combines: unknown[]) => combineProblems({ ...roles, 'r-x': asking('C?', combines) }, emitted, levels);
  assert.deepEqual(check({ with: 'bw-surface', as: 'width' }, { with: 'dz-row-scale-x', as: 'density' },
    { with: 'level-ink-muted', as: 'level' }), []);
  assert.equal(check({ with: '--level-ink-muted', as: 'level' }).length, 1);
  assert.equal(check({ with: 'level-ink-nope', as: 'level' }).length, 1);
  assert.equal(check({ with: 'bw-surface', as: 'state' }).length, 1);
  assert.equal(check({ with: 'r-x', as: 'width' }).length, 1);
  assert.equal(check({ with: 'bw-surface', as: 'width' }, { with: 'bw-surface', as: 'width' }).length, 1);
  assert.equal(check({ with: 'bw-surface', as: 'width', extra: 1 }).length, 1);
  assert.equal(check({ as: 'width' }).length, 1);
  assert.equal(combineProblems({ 'r-x': asking('C?', 'bw-surface') }, emitted, levels).length, 1);
});

test('levelNames reads declarations, not comments', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-levels-'));
  try {
    mkdirSync(join(root, 'contracts', 'design'), { recursive: true });
    writeFileSync(join(root, 'contracts', 'design', 'colors.css'),
      ':root {\n  --level-ink-body:82%;\n  /* --level-x:1% and --level-y:2% */\n  --level-ink-muted: 62%;\n}\n');
    assert.deepEqual([...levelNames(root)].sort(), ['level-ink-body', 'level-ink-muted']);
  } finally { rmSync(root, { recursive: true, force: true }); }
  assert.ok(levelNames().has('level-ink-muted'));
});
