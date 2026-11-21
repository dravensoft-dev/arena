import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readJson } from '../../utils/read-file.ts';
import * as rules from '../../generate/core/arena-cli/style-plugin-rules.ts';
import {
  LIGHT_BY_DESIGN, ROOT_PLUGIN, defaultSlotAnswers, slotAnswerProblems, slotAcceptsProblems, shippedSlotAcceptsProblems, collect, shippedFixedRemProblems, defaultAnswerProblems, keyProblems, movedTokens, resolvedFor, totalityProblems,
  slotAnswerLines, valueProblems, zeroScopeProblems,
} from './check-style-plugin.ts';

test('a role nothing moves resolves to what it inherits, and one that is moved to what was written', () => {
  const css = ':root{--bw-surface:1px;--dur-hover:120ms}\n.arena-showcase{--bw-surface:0px}';
  const resolved = resolvedFor(css, 'showcase');
  assert.equal(resolved.get('bw-surface'), '0px');
  assert.equal(resolved.get('dur-hover'), '120ms');
});

test('a theme block overrides the base one, and the base one is the dark answer because :root is dark', () => {
  const css = ':root{--shadow-surface-rest:none}\n'
    + '.arena-showcase{--shadow-surface-rest:RIM}\n'
    + rules.scopeOn('.arena-light')('.arena-showcase', '--shadow-surface-rest:DROP');
  assert.equal(resolvedFor(css, 'showcase', 'dark').get('shadow-surface-rest'), 'RIM');
  assert.equal(resolvedFor(css, 'showcase', 'light').get('shadow-surface-rest'), 'DROP');
});

test('a cross written by scopeOn resolves for the light scope and not for the dark one', () => {
  const css = ':root{--a:dark}\n.arena-showcase{--a:rim}\n' + rules.scopeOn('.arena-light')('.arena-showcase', '--a:drop');
  assert.equal(resolvedFor(css, 'showcase', 'light').get('a'), 'drop');
  assert.equal(resolvedFor(css, 'showcase', 'dark').get('a'), 'rim');
});

test('the plugin own answers are not read from its high-contrast block', () => {
  const css = readFileSync(join(repoRoot, 'contracts/design-generated/style-plugin.complete.generated.css'), 'utf8');
  assert.equal(resolvedFor(css, 'complete', 'light').get('bw-surface'), '2px');
  assert.equal(resolvedFor('.arena-p{--bw:2px}\n@media (prefers-contrast: more) {\n.arena-p{--bw:9px}\n}', 'p').get('bw'), '2px');
});

test('a theme group is flattened to the tokens it holds, each labelled with the scope it overrides in', () => {
  const moved = movedTokens({
    'bw-surface': { $type: 'dimension' },
    light: { 'shadow-surface-rest': { $type: 'shadow' } },
  });
  assert.deepEqual(moved.map((m) => [m.key, m.theme]),
    [['bw-surface', ''], ['shadow-surface-rest', 'light']]);
});

test('a zero walk is a failure and not a clean pass', () => {
  assert.match(zeroScopeProblems(0)[0] ?? '', /0 scope/i);
  assert.deepEqual(zeroScopeProblems(2), []);
});

test('the real tree holds: every scope this build emits clears the reading floors', () => {
  assert.deepEqual(collect(), []);
});

test('a root plugin that leaves a question unanswered fails', () => {
  const problems = totalityProblems(['r-surface', 'bw-surface'], ['r-surface']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /bw-surface/);
});

test('a total root plugin passes', () => {
  assert.deepEqual(totalityProblems(['r-surface'], ['r-surface']), []);
});

test('the contrast composition defines nothing and only re-points a role at a step Arena carries', () => {
  const css = readFileSync(join(repoRoot, 'contracts/design/contrast.css'), 'utf8');
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
    .map(([, name, value]) => ({ name: name as string, value: (value as string).trim() }));

  assert.ok(declarations.length > 0,
    'a composition file declaring nothing composes nothing, and this one is the answer to prefers-contrast');
  assert.match(body, /@media \(prefers-contrast: more\)/,
    'the whole file is one query, so nothing in it applies to a reader who did not ask');

  for (const { name, value } of declarations) {
    assert.match(value, /^var\(--[\w-]+\)$/,
      `${name} is assigned ${value}, and this layer holds no value of its own: it points a role at a `
      + 'step of a ladder that is already in the token tier, the way colors.css holds no colour');
    assert.notEqual(value, `var(${name})`, `${name} resolves to itself`);
  }
});

const KERNEL = {
  'ink-eyebrow': {},
  'ink-link': { $extensions: { 'com.dravensoft.arena': { default: '{ink-eyebrow}' } } },
  'r-popover': { $extensions: { 'com.dravensoft.arena': { default: '{r.lg}' } } },
};

const answering = (over: Record<string, unknown> = {}) => ({
  'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' },
  'ink-link': { $type: 'color', $value: '{color.secondary}' },
  'r-popover': { $type: 'dimension', $value: '{r.lg}' },
  ...over,
});

test('the default plugin answers a role with a kernel default the way the default does', () => {
  assert.deepEqual(defaultAnswerProblems(KERNEL, answering()), []);
  const problems = defaultAnswerProblems(KERNEL, answering({ 'ink-link': { $type: 'color', $value: '{color.base-200}' } }));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '',
    /--ink-link is "\{color\.base-200\}" and its kernel default \{ink-eyebrow\} comes to "\{color\.secondary\}"/);
});

test('a keyword default that names an emitted keyword token is held to that token\'s word', () => {
  const kernel = { 'tt-key': { $extensions: { 'com.dravensoft.arena': { default: '{case.none}' } } } };
  const words = new Map([['case-none', 'none']]);
  assert.deepEqual(defaultAnswerProblems(kernel, { 'tt-key': { $type: 'keyword', $value: 'none' } }, words), []);
  const problems = defaultAnswerProblems(kernel, { 'tt-key': { $type: 'keyword', $value: 'uppercase' } }, words);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /--tt-key is "uppercase" and its kernel default \{case\.none\} comes to "none"/);
});

test('a light answer is held too, and a role the default plugin is silent on is totality\'s to report', () => {
  const lit = answering({ light: { 'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' } } });
  assert.equal(defaultAnswerProblems(KERNEL, lit).length, 1);
  const silent = Object.fromEntries(Object.entries(answering()).filter(([key]) => key !== 'r-popover'));
  assert.deepEqual(defaultAnswerProblems(KERNEL, silent), []);
});

test('a role whose light answer is the default plugin\'s by design is held on its dark answer only', () => {
  const kernel = { 'edge-focus': { $extensions: { 'com.dravensoft.arena': { default: '{color.secondary}' } } } };
  const light = { 'edge-focus': { $type: 'color', $value: '{color.secondary}' }, light: { 'edge-focus': { $type: 'color', $value: '{color.base-content}' } } };
  assert.deepEqual(defaultAnswerProblems(kernel, light), []);
  const dark = { 'edge-focus': { $type: 'color', $value: '{color.base-content}' } };
  assert.equal(defaultAnswerProblems(kernel, dark).length, 1);
});

test('the shipped answer files carry no rem on a fixed role', () => {
  assert.deepEqual(shippedFixedRemProblems(readJson(join(repoRoot, 'contracts/design/roles.json')) as Record<string, unknown>), []);
});

test('the roles a light answer is by design are the keys of the default plugin\'s light group', () => {
  const plugin = readJson(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json')) as { light?: Record<string, unknown> };
  assert.deepEqual([...LIGHT_BY_DESIGN].sort(), Object.keys(plugin.light ?? {}).sort());
});

test('a slot answer in a plugin is held to its accepts set, and a role answer is not asked of a slot', () => {
  const kernel = { 'fill-surface': { $type: 'color' }, 'ink-body': { $type: 'color' } };
  const answer = (value: string) => ({ 'actions-primary-root-fill-rest': { $type: 'color', $value: value, $description: 'why' } });
  assert.deepEqual(slotAnswerProblems('at', answer('{fill-surface}'), kernel), []);
  assert.equal(slotAnswerProblems('at', answer('{ink-body}'), kernel).length, 1);
});

test('the accepts half holds a slot answer to its set and asks no description of it', () => {
  const kernel = { 'fill-surface': { $type: 'color' }, 'ink-body': { $type: 'color' } };
  const answer = (value: string) => ({ 'actions-primary-root-fill-rest': { $type: 'color', $value: value } });
  assert.deepEqual(slotAcceptsProblems('at', answer('{fill-surface}'), kernel), []);
  assert.deepEqual(slotAcceptsProblems('at', answer('{color.primary-content}'), kernel).length, 1);
  assert.deepEqual(slotAcceptsProblems('at', { light: answer('{ink-body}') }, kernel).length, 1);
});

test('every shipped plugin answers each slot with a role its accepts set takes', () => {
  assert.deepEqual(shippedSlotAcceptsProblems(), []);
});

test('a bad slot answer in the light group is refused', () => {
  const kernel = { 'fill-surface': { $type: 'color' }, 'ink-body': { $type: 'color' } };
  const light = { light: { 'actions-primary-root-fill-rest': { $type: 'color', $value: '{ink-body}', $description: 'why' } } };
  assert.equal(slotAnswerProblems('at', light, kernel).length, 1);
});

test('the default plugin answers no colour slot', () => {
  assert.deepEqual(defaultSlotAnswers(), [], 'a sub-AA pair of the default is corrected in the identity, never by a slot answer');
  const dir = mkdtempSync(join(tmpdir(), 'slot-answers-'));
  try {
    mkdirSync(join(dir, 'contracts/design'), { recursive: true });
    mkdirSync(join(dir, 'plugin-style-store/default'), { recursive: true });
    writeFileSync(join(dir, 'contracts/design/color-slots.json'), readFileSync(join(repoRoot, 'contracts/design/color-slots.json')));
    const plugin = readJson(join(repoRoot, ROOT_PLUGIN)) as Record<string, unknown>;
    writeFileSync(join(dir, ROOT_PLUGIN), JSON.stringify({ ...plugin,
      'actions-primary-root-fill-pressed': { $type: 'color', $value: '{emphasis-primary-fill}', $description: 'why' } }));
    const lines = defaultSlotAnswers(dir);
    assert.equal(lines.length, 1, lines.join('\n'));
    assert.match(lines[0] as string, /actions-primary-root-fill-pressed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('slot answer and accepts problems share one read', () => {
  const kernel = { 'fill-surface': { $type: 'color' }, 'ink-body': { $type: 'color' } };
  const tokens = {
    'actions-primary-root-fill-rest': { $type: 'color', $value: '{ink-body}' },
    'fill-surface': { $type: 'color', $value: '{color.base-100}' },
    light: { 'actions-primary-root-ink-rest': { $type: 'color', $value: '{ink-body}' } },
  };
  const seen: string[] = [];
  const spy = (where: string, key: string) => { seen.push(`${where}:${key}`); return [`${key} read`]; };
  assert.deepEqual(slotAnswerLines('at', tokens, kernel, spy), ['actions-primary-root-fill-rest read', 'actions-primary-root-ink-rest read']);
  assert.deepEqual(seen, ['at:actions-primary-root-fill-rest', 'at:actions-primary-root-ink-rest'], 'only slot keys reach the rule, a role key never does');
  assert.deepEqual(slotAnswerProblems('at', tokens, kernel), slotAnswerLines('at', tokens, kernel, keyProblems));
  assert.deepEqual(slotAcceptsProblems('at', tokens, kernel), slotAnswerLines('at', tokens, kernel, valueProblems));
});
