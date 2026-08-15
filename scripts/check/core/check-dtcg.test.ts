import test from 'node:test';
import assert from 'node:assert/strict';
import { EXCLUDED, validateTree, zeroSourceProblems } from './check-dtcg.ts';
import type { DtcgNode } from '../../lib/core/dtcg-shapes.ts';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const ok = (tree: DtcgNode) => assert.deepEqual(validateTree(tree, 'f.json'), []);
const fails = (tree: DtcgNode, re: RegExp) => {
  const errs = validateTree(tree, 'f.json');
  assert.ok(errs.length > 0, 'expected at least one violation');
  assert.match(errs.join('\n'), re);
};

test('accepts a conformant tree with group-level $type inheritance', () => {
  ok({ sp: { $type: 'dimension', 0: { $value: { value: 0, unit: 'px' } }, 1: { $value: { value: 4, unit: 'px' } } } });
});

test('rejects a token that resolves no $type', () => {
  fails({ mystery: { $value: 3 } }, /no \$type/);
});

test('rejects a bare hex string color', () => {
  fails({ c: { $type: 'color', p: { $value: '#b52a20' } } }, /color .* object/);
});

test('accepts a structured srgb color and rejects out-of-range components', () => {
  ok({ c: { $type: 'color', p: { $value: { colorSpace: 'srgb', components: [0.1, 0.2, 0.3] } } } });
  fails({ c: { $type: 'color', p: { $value: { colorSpace: 'srgb', components: [1.5, 0, 0] } } } }, /components/);
});

test('rejects a hex that does not round-trip its components', () => {
  ok({ c: { $type: 'color', p: { $value: { colorSpace: 'srgb', components: [0.7098, 0.1647, 0.1255], hex: '#b52a20' } } } });
  fails({ c: { $type: 'color', p: { $value: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#b52a20' } } } }, /hex .* components/);
});

test('rejects a string dimension and a dimension missing its unit', () => {
  fails({ d: { $type: 'dimension', a: { $value: '64px' } } }, /dimension .* object/);
  fails({ d: { $type: 'dimension', a: { $value: { value: 0 } } } }, /unit/);
});

test('rejects a cubicBezier with the wrong arity or an out-of-range x', () => {
  ok({ e: { $type: 'cubicBezier', a: { $value: [0.2, 0.7, 0.3, 1] } } });
  fails({ e: { $type: 'cubicBezier', a: { $value: [0.2, 0.7, 0.3] } } }, /four numbers/);
  fails({ e: { $type: 'cubicBezier', a: { $value: [1.4, 0.7, 0.3, 1] } } }, /between 0 and 1/);
});

test('validates a shadow composite down to its parts', () => {
  const px = (value: number) => ({ value, unit: 'px' });
  ok({ s: { $type: 'shadow', a: { $value: {
    offsetX: px(0), offsetY: px(2), blur: px(6), spread: px(-2),
    color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.5 } } } } });
  fails({ s: { $type: 'shadow', a: { $value: { offsetX: px(0), offsetY: px(2), blur: px(6) } } } }, /spread/);
});

test('keyword holds its value to the closed set the token itself declares', () => {
  const values = { $extensions: { 'com.dravensoft.arena': { values: ['none', 'uppercase', 'lowercase', 'capitalize'] } } };
  ok({ tt: { $type: 'keyword', eyebrow: { $value: 'uppercase', ...values } } });
  fails({ tt: { $type: 'keyword', eyebrow: { $value: 'smallcaps', ...values } } }, /not one of/);
});

test('keyword refuses anything that is not a bare CSS word', () => {
  fails({ tt: { $type: 'keyword', a: { $value: '' } } }, /keyword/);
  fails({ tt: { $type: 'keyword', a: { $value: 12 } } }, /keyword/);
  fails({ tt: { $type: 'keyword', a: { $value: 'upper case' } } }, /keyword/);
});

test('a keyword may omit its values, because a style plugin re-values a role it did not declare', () => {
  ok({ tt: { $type: 'keyword', eyebrow: { $value: 'none' } } });
  fails({ tt: { $type: 'keyword', a: { $value: 'none', $extensions: { 'com.dravensoft.arena': { values: [] } } } } },
    /values/);
});

test('rejects a non reverse-DNS $extensions key', () => {
  fails({ n: { $type: 'number', a: { $value: 1, $extensions: { cssUnit: 'em' } } } }, /reverse-DNS/);
  ok({ n: { $type: 'number', a: { $value: 1, $extensions: { 'com.dravensoft.arena': { cssUnit: 'em' } } } } });
});

test('rejects a token name containing a dot', () => {
  fails({ 'a.b': { $type: 'number', $value: 1 } }, /name/);
});

test('zero source files is a named failure', () => {
  const problems = zeroSourceProblems(0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /0 /);
  assert.match(problems[0] ?? '', /design/);
});

test('a populated source directory has no zero problem', () => {
  assert.deepEqual(zeroSourceProblems(11), []);
});

test('every rhythm step is an alias of sp, so a step cannot drift off the 4px grid', () => {
  const spacing = readJson(join(repoRoot, 'contracts', 'design', 'spacing.json'));
  const rhythm = (spacing as Record<string, Record<string, { $value?: unknown }>>).rhythm ?? {};
  const steps = Object.entries(rhythm).filter(([key]) => !key.startsWith('$'));
  assert.ok(steps.length > 0, 'found no rhythm step at all, which is a walk that read the wrong group');
  for (const [name, token] of steps) {
    assert.match(String(token.$value), /^\{sp\.\d+\}$/,
      `rhythm.${name} is ${JSON.stringify(token.$value)}: a step is an alias of sp and never a `
      + 'length of its own, because a length authored here is a length off the 4px grid the '
      + 'moment somebody rounds it');
  }
});

test('the role declaration is excluded by name and says why', () => {
  const why = EXCLUDED.get('roles.json') ?? '';
  assert.match(why, /carries no value/,
    'a DTCG token without $value is not a DTCG token, so the file leaves this gate by name rather '
    + 'than by an accident of what the walk happens to accept');
});
