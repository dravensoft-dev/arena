import test from 'node:test';
import assert from 'node:assert/strict';
import { EXCLUDED, validateTree, zeroSourceProblems } from './check-dtcg.ts';
import type { DtcgNode } from '../../lib/core/dtcg-shapes.ts';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const px = (value: number) => ({ value, unit: 'px' });
const KEYWORD_VALUES = { $extensions: { 'com.dravensoft.arena': { values: ['none', 'uppercase', 'lowercase', 'capitalize'] } } };

type Row = [name: string, tree: DtcgNode, expected: 'ok' | RegExp];

const TREE_ROWS: Row[] = [
  ['accepts a conformant tree with group-level $type inheritance', { sp: { $type: 'dimension', 0: { $value: { value: 0, unit: 'px' } }, 1: { $value: { value: 4, unit: 'px' } } } }, 'ok'],
  ['rejects a token that resolves no $type', { mystery: { $value: 3 } }, /no \$type/],
  ['rejects a bare hex string color', { c: { $type: 'color', p: { $value: '#b52a20' } } }, /color .* object/],
  ['accepts a structured srgb color', { c: { $type: 'color', p: { $value: { colorSpace: 'srgb', components: [0.1, 0.2, 0.3] } } } }, 'ok'],
  ['rejects out-of-range srgb components', { c: { $type: 'color', p: { $value: { colorSpace: 'srgb', components: [1.5, 0, 0] } } } }, /components/],
  [
    'accepts a hex that round-trips its components',
    { c: { $type: 'color', p: { $value: { colorSpace: 'srgb', components: [0.7098, 0.1647, 0.1255], hex: '#b52a20' } } } },
    'ok',
  ],
  ['rejects a hex that does not round-trip its components', { c: { $type: 'color', p: { $value: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#b52a20' } } } }, /hex .* components/],
  ['rejects a string dimension', { d: { $type: 'dimension', a: { $value: '64px' } } }, /dimension .* object/],
  ['rejects a dimension missing its unit', { d: { $type: 'dimension', a: { $value: { value: 0 } } } }, /unit/],
  ['accepts a cubicBezier of four numbers', { e: { $type: 'cubicBezier', a: { $value: [0.2, 0.7, 0.3, 1] } } }, 'ok'],
  ['rejects a cubicBezier with the wrong arity', { e: { $type: 'cubicBezier', a: { $value: [0.2, 0.7, 0.3] } } }, /four numbers/],
  ['rejects a cubicBezier with an out-of-range x', { e: { $type: 'cubicBezier', a: { $value: [1.4, 0.7, 0.3, 1] } } }, /between 0 and 1/],
  [
    'validates a shadow composite down to its parts',
    { s: { $type: 'shadow', a: { $value: { offsetX: px(0), offsetY: px(2), blur: px(6), spread: px(-2), color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.5 } } } } },
    'ok',
  ],
  ['rejects a shadow composite missing a part', { s: { $type: 'shadow', a: { $value: { offsetX: px(0), offsetY: px(2), blur: px(6) } } } }, /spread/],
  ['keyword holds its value to the closed set the token itself declares', { tt: { $type: 'keyword', eyebrow: { $value: 'uppercase', ...KEYWORD_VALUES } } }, 'ok'],
  ['keyword refuses a value outside the set the token declares', { tt: { $type: 'keyword', eyebrow: { $value: 'smallcaps', ...KEYWORD_VALUES } } }, /not one of/],
  ['keyword refuses an empty string', { tt: { $type: 'keyword', a: { $value: '' } } }, /keyword/],
  ['keyword refuses a number', { tt: { $type: 'keyword', a: { $value: 12 } } }, /keyword/],
  ['keyword refuses a value with a space', { tt: { $type: 'keyword', a: { $value: 'upper case' } } }, /keyword/],
  ['a keyword may omit its values, because a style plugin re-values a role it did not declare', { tt: { $type: 'keyword', eyebrow: { $value: 'none' } } }, 'ok'],
  ['a keyword may not declare an empty values set', { tt: { $type: 'keyword', a: { $value: 'none', $extensions: { 'com.dravensoft.arena': { values: [] } } } } }, /values/],
  ['rejects a non reverse-DNS $extensions key', { n: { $type: 'number', a: { $value: 1, $extensions: { cssUnit: 'em' } } } }, /reverse-DNS/],
  ['accepts a reverse-DNS $extensions key', { n: { $type: 'number', a: { $value: 1, $extensions: { 'com.dravensoft.arena': { cssUnit: 'em' } } } } }, 'ok'],
  ['rejects a token name containing a dot', { 'a.b': { $type: 'number', $value: 1 } }, /name/],
];

test('validateTree accepts a conformant tree and names the rule a token breaks', () => {
  assert.ok(TREE_ROWS.length > 0);
  for (const [name, tree, expected] of TREE_ROWS) {
    const errs = validateTree(tree, 'f.json');
    if (expected === 'ok') assert.deepEqual(errs, [], name);
    else {
      assert.ok(errs.length > 0, `${name}: expected at least one violation`);
      assert.match(errs.join('\n'), expected, name);
    }
  }
});

test('zero source files is a named failure and a populated source directory has no zero problem', () => {
  const problems = zeroSourceProblems(0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /0 /);
  assert.match(problems[0] ?? '', /design/);
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
