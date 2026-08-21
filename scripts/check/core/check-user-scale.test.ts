import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AXES, KEY, classify, collect, declaredAxis, unusedAxisProblems, zeroClassifiedProblems,
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
