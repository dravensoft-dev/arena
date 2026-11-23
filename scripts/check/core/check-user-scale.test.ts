import test from 'node:test';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import {
  AXES, KEY, PLUGIN_ANSWERS, answerAxisProblems, classify, collect, collectAnswers, declaredAxis,
  tokenAxes, unusedAxisProblems, zeroClassifiedProblems, zeroJudgedProblems,
} from './check-user-scale.ts';

const ext = (axis: string) => ({ $extensions: { 'com.dravensoft.arena': { [KEY]: axis } } });
const px = (value: number) => ({ $value: { value, unit: 'px' } });

test('a group declares for the leaves under it', () => {
  const { found, problems } = classify(
    { sp: { $type: 'dimension', ...ext('fixed'), 1: px(4), 2: px(8) } },
    'spacing.json',
  );
  assert.deepEqual(problems, []);
  assert.deepEqual(found.map((f) => [f.at, f.axis]),
    [['spacing.json:sp.1', 'fixed'], ['spacing.json:sp.2', 'fixed']]);
  assert.equal(found[0]?.declaredAt, 'spacing.json:sp');
});

test('a leaf overrides the group it sits in, and says where the answer came from', () => {
  const { found } = classify(
    { dz: { $type: 'dimension', ...ext('fixed'), 'ctl-h': px(40), text: { ...px(14), ...ext('scales') } } },
    'spacing.json',
  );
  assert.deepEqual(found.map((f) => [f.at, f.axis, f.declaredAt]), [
    ['spacing.json:dz.ctl-h', 'fixed', 'spacing.json:dz'],
    ['spacing.json:dz.text', 'scales', 'spacing.json:dz.text'],
  ]);
});

test('a dimension resolving no axis is a problem, and a colour is not', () => {
  const { problems } = classify({ r: { $type: 'dimension', xs: px(4) } }, 'effects.json');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /effects\.json:r\.xs is a dimension and resolves no userScale/);

  const colour = classify(
    { color: { $type: 'color', primary: { $value: { colorSpace: 'srgb', components: [0, 0, 0] } } } },
    'palette.dark.json',
  );
  assert.deepEqual(colour.problems, []);
});

test('a word outside the closed set is refused, and the message names the set', () => {
  const { problems } = classify({ fs: { $type: 'dimension', ...ext('grows'), md: px(15) } }, 'typography.json');
  assert.match(problems[0] ?? '', /declares userScale "grows"/);
  assert.match(problems[0] ?? '', /scales, follows, fixed/);
});

test('a multiplier may declare an axis and is never required to', () => {
  const { found, problems } = classify(
    { lh: { $type: 'number', ...ext('follows'), body: { $value: 1.6 } }, z: { $type: 'number', nav: { $value: 800 } } },
    'typography.json',
  );
  assert.deepEqual(problems, []);
  assert.deepEqual(found.map((f) => f.axis), ['follows']);
});

test('a walk that classifies nothing fails rather than passing over nothing', () => {
  assert.deepEqual(zeroClassifiedProblems(1), []);
  assert.equal(zeroClassifiedProblems(0).length, 1);
  assert.match(zeroClassifiedProblems(0)[0] ?? '', /failure rather than a clean pass/);
});

test('an axis no token takes fails, so the set cannot outlive its cases', () => {
  const found = [{ at: 'x', axis: 'fixed', declaredAt: 'x' }];
  const problems = unusedAxisProblems(found);
  assert.equal(problems.length, AXES.size - 1);
  assert.match(problems[0] ?? '', /"scales" is declared in this gate and no token takes it/);
});

test('declaredAxis reads Arena\'s vendor key and nobody else\'s', () => {
  assert.equal(declaredAxis({ $extensions: { 'com.other.tool': { [KEY]: 'scales' } } } as never), undefined);
  assert.equal(declaredAxis(ext('scales') as never), 'scales');
  assert.equal(declaredAxis({} as never), undefined);
});

test('the tree passes its own claim, over more than nothing, and every axis is taken', () => {
  const { files, found, problems } = collect();
  assert.deepEqual(problems, []);
  assert.ok(files.length > 0, 'a gate reading zero files reports zero problems by construction');
  assert.deepEqual(unusedAxisProblems(found), []);
  for (const axis of AXES.keys()) {
    assert.ok(found.some((f) => f.axis === axis), `no token in the tree takes the axis "${axis}"`);
  }
});

test('the text ladders scale and the grid they sit on does not', () => {
  const { found } = collect();
  const axisOf = (at: string) => found.find((f) => f.at === at)?.axis;
  assert.equal(axisOf('typography.json:fs.md'), 'scales');
  assert.equal(axisOf('spacing.json:dz.text'), 'scales');
  assert.equal(axisOf('density.compact.json:dz.text'), 'scales');
  assert.equal(axisOf('icon.json:icon.md'), 'scales');
  assert.equal(axisOf('spacing.json:sp.4'), 'fixed');
  assert.equal(axisOf('spacing.json:dz.ctl-h'), 'fixed');
  assert.equal(axisOf('spacing.json:dz.lh'), 'follows');
  assert.equal(axisOf('chart.json:chart.tick-char'), 'fixed');
});

const dim = (axis: string) => ({ $type: 'dimension', ...ext(axis) });
const roles = { 'r-surface': dim('fixed'), 'step-label': dim('scales'), 'pad-x': dim('fixed'), 'ink-body': { $type: 'color' } } as never;
const axes = new Map([['r.lg', 'fixed'], ['dz.text-2xs', 'scales']]);
const answer = (tokens: Record<string, unknown>) => [{ name: 'default', tokens: tokens as never }];
const alias = (to: string) => ({ $type: 'dimension', $value: `{${to}}` });

test('an alias answer on its role\'s axis holds, and one on another axis is refused', () => {
  assert.deepEqual(answerAxisProblems(roles, axes, answer({ 'r-surface': alias('r.lg') })),
    { judged: 1, problems: [] });
  const { problems } = answerAxisProblems(roles, axes, answer({ 'r-surface': alias('dz.text-2xs') }));
  assert.equal(problems.length, 1);
  for (const word of ['default', 'r-surface', '{dz.text-2xs}', 'scales', 'fixed']) {
    assert.match(problems[0] ?? '', new RegExp(word.replace(/[{}.]/g, '\\$&')));
  }
});

test('an answer aliasing a role is judged by that role\'s declared axis', () => {
  assert.equal(answerAxisProblems(roles, axes, answer({ 'pad-x': alias('step-label') })).problems.length, 1);
  assert.deepEqual(answerAxisProblems(roles, axes, answer({ 'pad-x': alias('r-surface') })).problems, []);
});

test('a role of another type that declares an axis is judged like a dimension', () => {
  const numbers = { 'lh-tight': { $type: 'number', ...ext('follows') } } as never;
  const withFollows = new Map([...axes, ['dz.lh', 'follows']]);
  const onScales = answerAxisProblems(numbers, withFollows, answer({ 'lh-tight': { $type: 'number', $value: '{dz.text-2xs}' } }));
  assert.equal(onScales.judged, 1);
  assert.equal(onScales.problems.length, 1);
  assert.deepEqual(answerAxisProblems(numbers, withFollows, answer({ 'lh-tight': { $type: 'number', $value: '{dz.lh}' } })),
    { judged: 1, problems: [] });
});

test('a literal answer is not judged here, rem included', () => {
  const result = answerAxisProblems(roles, axes,
    answer({ 'r-surface': { $type: 'dimension', $value: { value: 30, unit: 'rem' } } }));
  assert.deepEqual(result, { judged: 0, problems: [] });
});

test('an alias naming nothing and a key that is not a role are left to other gates', () => {
  const result = answerAxisProblems(roles, axes,
    answer({ 'r-surface': alias('r.nope'), 'not-a-role': alias('r.lg'), $description: 'x', 'ink-body': alias('r.lg') }));
  assert.deepEqual(result, { judged: 0, problems: [] });
});

test('tokenAxes maps dotted paths to axes', () => {
  const map = tokenAxes();
  assert.equal(map.get('r.lg'), 'fixed');
  assert.equal(map.get('dz.text-sm'), 'scales');
});

test('the real tree holds: every alias answer in default, complete and the catalogue is on its role\'s axis', () => {
  const { problems, judged, walked } = collectAnswers();
  assert.deepEqual(problems, []);
  assert.ok(judged > 0);
  assert.ok(walked.includes('default') && walked.includes('complete'));
  assert.equal(walked.filter((w) => w.startsWith('catalogue/')).length, 8);
  assert.equal(PLUGIN_ANSWERS.length, 3);
  assert.deepEqual(walked, ['default', 'complete', ...readdirSync(join(process.cwd(), 'plugin-style-store/catalogue'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort().map((e) => `catalogue/${e}`)]);
});

test('a walk that judges no answer fails, and one that judges some does not', () => {
  assert.deepEqual(zeroJudgedProblems(1), []);
  assert.equal(zeroJudgedProblems(0).length, 1);
  assert.match(zeroJudgedProblems(0)[0] ?? '', /judged 0 plugin answers/);
});

test('an unparsable or missing answer file is a problem naming it, not a throw', () => {
  const base = mkdtempSync(join(tmpdir(), 'user-scale-'));
  try {
    cpSync(join(process.cwd(), 'contracts/design'), join(base, 'contracts/design'), { recursive: true });
    cpSync(join(process.cwd(), 'plugin-style-store'), join(base, 'plugin-style-store'), { recursive: true });
    writeFileSync(join(base, 'plugin-style-store/default/plugin.tokens.json'), '{ not json');
    rmSync(join(base, 'plugin-style-store/complete/plugin.tokens.json'));
    const { problems } = collectAnswers(base);
    assert.equal(problems.filter((p) => /default\/plugin\.tokens\.json cannot be read/.test(p)).length, 1);
    assert.equal(problems.filter((p) => /complete\/plugin\.tokens\.json cannot be read/.test(p)).length, 1);
    writeFileSync(join(base, 'contracts/design/roles.json'), '{ not json');
    const roleProblems = collectAnswers(base).problems.filter((p) => /roles\.json/.test(p));
    assert.equal(roleProblems.length, 1);
    assert.match(roleProblems[0] ?? '', /cannot be read as the role file/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
