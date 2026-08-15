import test from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../../generate/core/arena-to-prod/extension-rules.ts';
import {
  collect, floorProblems, keyProblems, movedTokens, nameProblems, resolvedFor, valueProblems,
  zeroScopeProblems,
} from './check-extensions.ts';

const roles = (over: Record<string, string> = {}) => new Map(Object.entries({
  'bw-surface': '1px',
  'shadow-surface-rest': '0px 0px 0px 0px rgba(0,0,0,0)',
  'fill-surface': 'var(--color-base-100)',
  'rhythm-group': '8px',
  'rhythm-section': '64px',
  'lh-prose': '1.6',
  'lh-heading': '1.15',
  'measure-prose': '72ch',
  ...over,
}));

const ROLES = {
  'r-surface': { $type: 'dimension' },
  'bw-surface': { $type: 'dimension' },
  'dur-hover': { $type: 'duration' },
};

test('the rules module carries floors and shape checks and no design theory', () => {
  assert.deepEqual(Object.keys(rules).sort(), [
    'ARENA_EXT', 'FS_STEP', 'KEBAB', 'MAX_PROSE_MEASURE', 'MIN_HEADING_LEADING',
    'MIN_PROSE_LEADING', 'MIN_PROSE_MEASURE', 'RHYTHM_STEP',
    'floorProblems', 'keyProblems', 'nameProblems', 'valueProblems',
  ], 'a rule that keeps a catalogue coherent is Arena design theory, and a floor is a claim about '
  + 'a reader: only the second one has any business binding somebody else\'s product');
});

test('a move that re-values a role is accepted', () => {
  assert.deepEqual(keyProblems('at', 'r-surface',
    { $type: 'dimension', $value: '{r.xl}', $description: 'why' }, ROLES['r-surface']), []);
});

test('a move that is not a role fails, naming the token', () => {
  const problems = keyProblems('at', 'color-primary',
    { $type: 'color', $value: '#fff', $description: 'why' }, undefined);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /color-primary/);
});

test('a move that reaches for a raw scale step fails, because a scale is not a role to move', () => {
  assert.match(keyProblems('at', 'r-lg',
    { $type: 'dimension', $value: '{r.xl}', $description: 'why' }, undefined)[0] ?? '', /r-lg/);
});

test('a type that disagrees with the role it answers fails, so the two cannot drift', () => {
  assert.match(keyProblems('at', 'dur-hover',
    { $type: 'dimension', $value: '{dur.mid}', $description: 'why' }, ROLES['dur-hover'])[0] ?? '',
  /dimension.*duration|duration.*dimension/);
});

test('a token moved without a reason fails, because a move is a decision', () => {
  assert.match(keyProblems('at', 'r-surface',
    { $type: 'dimension', $value: '{r.xl}' }, ROLES['r-surface'])[0] ?? '', /\$description/);
});

test('a name that is not kebab-case fails, since it becomes a class', () => {
  assert.match(nameProblems('Showcase', ['light'], 'at')[0] ?? '', /kebab/i);
});

test('a name that is a theme polarity fails, since that class is already the palette own scope', () => {
  assert.match(nameProblems('light', ['light'], 'at')[0] ?? '', /polarity/);
});

test('a name that is merely unused by the config is ordinary', () => {
  assert.deepEqual(nameProblems('none', ['light'], 'at'), [],
    'a build declares the plugins it wants and never the absence of one, so no word is reserved');
  assert.deepEqual(nameProblems('default', ['light'], 'at'), []);
});

test('an fs step is movable, because the type ladder is already a set of roles', () => {
  assert.deepEqual(keyProblems('at', 'fs-display',
    { $type: 'dimension', $value: { value: 80, unit: 'px' }, $description: 'why' }, undefined), []);
});

test('an fs step still needs a reason, like any other move', () => {
  assert.match(keyProblems('at', 'fs-display',
    { $type: 'dimension', $value: { value: 80, unit: 'px' } }, undefined)[0] ?? '', /\$description/);
});

test('an fs step declared as something other than a dimension fails', () => {
  assert.match(keyProblems('at', 'fs-display',
    { $type: 'duration', $value: '{dur.mid}', $description: 'why' }, undefined)[0] ?? '', /dimension/);
});

test('a token that merely starts with fs is not an fs step', () => {
  assert.match(keyProblems('at', 'fsx-display',
    { $type: 'dimension', $value: { value: 80, unit: 'px' }, $description: 'why' }, undefined)[0] ?? '',
  /fsx-display/);
});

test('a rhythm step is movable for the same reason an fs step is, and both still need a reason', () => {
  assert.deepEqual(keyProblems('at', 'rhythm-section',
    { $type: 'dimension', $value: '{sp.10}', $description: 'why' }, undefined), []);
  assert.match(keyProblems('at', 'rhythm-section',
    { $type: 'dimension', $value: '{sp.10}' }, undefined)[0] ?? '', /\$description/);
  assert.match(keyProblems('at', 'rhythm-section',
    { $type: 'duration', $value: '{dur.mid}', $description: 'why' }, undefined)[0] ?? '',
  /rhythm step is a dimension/);
});

test('a spacing step that is not a rhythm step is still a scale, so nothing may reach it', () => {
  assert.match(keyProblems('at', 'sp-5',
    { $type: 'dimension', $value: '{sp.8}', $description: 'why' }, undefined)[0] ?? '', /sp-5/);
});

test('a colour role admits a reference and never a literal, because it assigns and never authors', () => {
  assert.deepEqual(valueProblems('at', 'fill-surface',
    { $type: 'color', $value: '{color.base-300}', $description: 'why' }, { $type: 'color' }), []);
  const problems = valueProblems('at', 'fill-surface',
    { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0] }, $description: 'why' },
    { $type: 'color' });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /assigns a colour and never authors one/);
});

test('a colour role may not point outside the palette, since only a colour alias is re-emitted per theme', () => {
  const problems = valueProblems('at', 'fill-surface',
    { $type: 'color', $value: '{scrim}', $description: 'why' }, { $type: 'color' });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /\{color\./);
});

test('a keyword role is held to the set its own role declares', () => {
  const role = { $type: 'keyword', $extensions: { 'com.dravensoft.arena': { values: ['none', 'uppercase'] } } };
  assert.deepEqual(valueProblems('at', 'tt-eyebrow',
    { $type: 'keyword', $value: 'none', $description: 'why' }, role), []);
  const problems = valueProblems('at', 'tt-eyebrow',
    { $type: 'keyword', $value: 'smallcaps', $description: 'why' }, role);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /not one of none, uppercase/);
});

test('a heading leading under 1 is a heading whose lines overlap', () => {
  assert.deepEqual(floorProblems(roles({ 'lh-heading': '1.15' }), 'dark', 'v'), []);
  assert.match(floorProblems(roles({ 'lh-heading': '0.8' }), 'dark', 'v')[0] ?? '', /--lh-heading is 0.8/);
});

test('a prose measure outside 45 to 90 characters stops being a measure', () => {
  assert.deepEqual(floorProblems(roles({ 'measure-prose': '68ch' }), 'dark', 'v'), []);
  assert.match(floorProblems(roles({ 'measure-prose': '30ch' }), 'dark', 'v')[0] ?? '', /45/);
  assert.match(floorProblems(roles({ 'measure-prose': '120ch' }), 'dark', 'v')[0] ?? '', /90/);
});

test('the reading floor is measured, not trusted, and an answer may sit far above it', () => {
  assert.deepEqual(floorProblems(roles({ 'lh-prose': '1.8' }), 'dark', 'x'), []);
  assert.deepEqual(floorProblems(roles({ 'lh-prose': '1.5' }), 'dark', 'x'), []);
  assert.match(floorProblems(roles({ 'lh-prose': '1.15' }), 'dark', 'x')[0] ?? '',
    /--lh-prose is 1\.15 in dark, under the 1\.5/);
  assert.match(floorProblems(new Map(), 'light', 'x').join('\n'), /--lh-prose does not resolve to a number in light/);
});

test('a floor that does not resolve is reported per floor, so one missing token hides no other', () => {
  const problems = floorProblems(new Map(), 'dark', 'x');
  assert.equal(problems.length, 3, 'prose leading, heading leading and prose measure, each named');
  assert.match(problems.join('\n'), /--lh-heading does not resolve/);
  assert.match(problems.join('\n'), /--measure-prose does not resolve/);
});

test('a role nothing moves resolves to what it inherits, and one that is moved to what was written', () => {
  const css = ':root{--bw-surface:1px;--dur-hover:120ms}\n.arena-showcase{--bw-surface:0px}';
  const resolved = resolvedFor(css, 'showcase');
  assert.equal(resolved.get('bw-surface'), '0px');
  assert.equal(resolved.get('dur-hover'), '120ms');
});

test('a theme block overrides the base one, and the base one is the dark answer because :root is dark', () => {
  const css = ':root{--shadow-surface-rest:none}\n'
    + '.arena-showcase{--shadow-surface-rest:RIM}\n'
    + '.arena-light.arena-showcase, .arena-light .arena-showcase, .arena-showcase .arena-light'
    + '{--shadow-surface-rest:DROP}';
  assert.equal(resolvedFor(css, 'showcase', 'dark').get('shadow-surface-rest'), 'RIM');
  assert.equal(resolvedFor(css, 'showcase', 'light').get('shadow-surface-rest'), 'DROP');
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
