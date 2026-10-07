import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BROWSER_BOUND, WEB_PROSE, WEB_SHAPED, collect, memberPath, proseProblems, strands,
  valueProblems, zeroWalkProblems,
} from './check-contracts-neutrality.ts';
import { COMPUTED, computedProblems, optionShapeProblems } from './check-contracts-neutrality.ts';
import type { ContractCandidate, TypeContract } from '../../lib/arena/contract-shapes.ts';

const of = (rel: string, tree: unknown) => strands(rel, tree);

test('a string under a description key is prose and every other string is a value', () => {
  const all = of('x.json', {
    api: { width: { default: 'calc(1px)', description: 'a calc() explained' } },
  });
  const value = all.find((s) => s.path.endsWith('.default'));
  const prose = all.find((s) => s.path.endsWith('.description'));
  assert.equal(value?.prose, false);
  assert.equal(prose?.prose, true);
});

test('a value carrying a browser construct fails, and no record excuses it', () => {
  const tree = { api: { width: { default: 'calc(var(--sp-1) * 120)' } } };
  const problems = valueProblems(of('contracts/api/components/Ghost.json', tree), BROWSER_BOUND);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /cannot execute/);
});

test('a var(--) default on a member fails, so no member takes a CSS value', () => {
  const tree = { api: { ratio: { form: 'primitive', type: 'string', default: 'var(--aspect-media)' } } };
  const problems = valueProblems(of('contracts/api/components/Ghost.json', tree));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /Ghost\.json:api\.ratio\.default has a value carrying "var\(--"/);
});

test('a member path drops the field the value sat in, so one entry covers its type and its default', () => {
  const all = of('x.json', { api: { width: { default: 'calc(1px)', type: 'string' } } });
  const paths = new Set(all.filter((s) => !s.prose).map(memberPath));
  assert.deepEqual([...paths], ['x.json:api.width']);
});

test('prose speaking web idiom fails unless recorded, and a recorded one that stopped fails too', () => {
  const web = of('x.json', { a: { $description: 'add var(--pad-safe-bottom) to it' } });
  assert.match(proseProblems(web, BROWSER_BOUND, new Map())[0] ?? '', /WEB_PROSE does not name it/);
  assert.deepEqual(proseProblems(web, BROWSER_BOUND, new Map([['x.json:a', 'recorded']])), []);

  const plain = of('x.json', { a: { $description: 'a plain sentence' } });
  const stale = proseProblems(plain, BROWSER_BOUND, new Map([['x.json:a', 'recorded']]));
  assert.match(stale[0] ?? '', /no longer speaks web idiom/);
});

test('an empty walk and an empty exemption set are all failures', () => {
  assert.deepEqual(zeroWalkProblems(1, 1, 1), []);
  assert.equal(zeroWalkProblems(0, 1, 1).length, 1);
  assert.equal(zeroWalkProblems(1, 0, 1).length, 1);
  assert.equal(zeroWalkProblems(1, 1, 0).length, 1);
});

test('the tree passes its own claim, over more than nothing', () => {
  const { files, all, problems } = collect();
  assert.deepEqual(problems, []);
  assert.ok(files.length > 0);
  assert.ok(all.filter((s) => !s.prose).length > 0, 'a gate reading no value checks no value');
});

test('every record still names something the payload holds', () => {
  const { all } = collect();
  const proseAt = new Set(all.filter((s) => s.prose).map((s) => `${s.rel}:${s.path.split('.').slice(0, -1).join('.') || '(root)'}`));
  for (const at of WEB_PROSE.keys()) {
    assert.ok(proseAt.has(at), `WEB_PROSE names ${at} and no description was read there`);
  }
  assert.ok(WEB_SHAPED.size > 0);
  assert.ok(BROWSER_BOUND.size > 0);
});

test('a COMPUTED entry fails when its key does not resolve, its file lacks the function, or the map is empty', () => {
  const entry = { reads: 'scripts/check/arena/check-contracts-neutrality.ts:computedProblems(a)', why: 'w' };
  assert.deepEqual(computedProblems(() => true, new Map([['k', entry]])), []);
  assert.match(computedProblems(() => false, new Map([['k', entry]])).join('\n'), /names k and no contract declares it/);
  const lacking = { reads: 'scripts/check/arena/check-contracts-neutrality.ts:noSuchFunction(a)', why: 'w' };
  assert.match(computedProblems(() => true, new Map([['k', lacking]])).join('\n'), /noSuchFunction/);
  const missing = { reads: 'scripts/check/arena/no-such-file.ts:computedProblems(a)', why: 'w' };
  assert.match(computedProblems(() => true, new Map([['k', missing]])).join('\n'), /no-such-file/);
  assert.match(computedProblems(() => true, new Map()).join('\n'), /COMPUTED is empty/);
});

test('the real COMPUTED holds', () => {
  assert.deepEqual(computedProblems(), []);
  assert.equal(COMPUTED.size, 14);
});

const probeContracts = new Map<string, ContractCandidate>([
  ['ArenaButton', { component: 'ArenaButton', api: { size: { form: 'enum', type: 'ArenaControlSize' } } }],
]);
const probeTypes = new Map<string, TypeContract>([
  ['ArenaControlSize', { name: 'ArenaControlSize', kind: 'enum', values: ['sm'] }],
]);
const probeOptions = new Map([['arena-size-sm', 'size']]);
const probeKey = 'contracts/api/components/ArenaButton.json:api.size';

test('an enum member whose value is a family option fails, and the message names the way out', () => {
  const problems = optionShapeProblems(probeContracts, probeTypes, probeOptions, new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /api\.size is an enum whose value sm is the option arena-size-sm: appearance is a class, not a member\. Write the class, or record the member in COMPUTED/);
});

test('an enum field of a type whose value is a family option fails too', () => {
  const types = new Map<string, TypeContract>([
    ...probeTypes,
    ['ArenaRow', { name: 'ArenaRow', kind: 'object', fields: { size: { form: 'enum', type: 'ArenaControlSize' } } }],
  ]);
  const problems = optionShapeProblems(new Map(), types, probeOptions, new Map());
  assert.match(problems.join('\n'), /contracts\/api\/types\/arena-row\.json:fields\.size is an enum whose value sm/);
});

test('a member recorded in COMPUTED passes', () => {
  const computed = new Map([[probeKey, { reads: 'r', why: 'w' }]]);
  assert.deepEqual(optionShapeProblems(probeContracts, probeTypes, probeOptions, computed), []);
});

test('an enum that meets no option passes, and an empty option map is a zero walk', () => {
  assert.deepEqual(optionShapeProblems(probeContracts, probeTypes, new Map([['arena-fill-card', 'fill']]), new Map()), []);
  assert.match(optionShapeProblems(probeContracts, probeTypes, new Map()).join('\n'), /0 family options/);
});

test('an enum is appearance when two of its values, or its only one, are options of one family', () => {
  const options = new Map([['arena-gap-none', 'gap'], ['arena-size-sm', 'size'], ['arena-size-md', 'size']]);
  const types = new Map<string, TypeContract>([
    ['Heading', { name: 'Heading', kind: 'enum', values: ['h1', 'h2', 'none'] }],
    ['Size', { name: 'Size', kind: 'enum', values: ['sm', 'md'] }],
    ['Only', { name: 'Only', kind: 'enum', values: ['sm'] }],
  ]);
  const contracts = new Map<string, ContractCandidate>([['ArenaX', { component: 'ArenaX', api: {
    level: { form: 'enum', type: 'Heading' }, size: { form: 'enum', type: 'Size' }, only: { form: 'enum', type: 'Only' },
  } }]]);
  const problems = optionShapeProblems(contracts, types, options, new Map()).join('\n');
  assert.doesNotMatch(problems, /api\.level/);
  assert.match(problems, /api\.size is an enum whose values sm, md are options of size/);
  assert.match(problems, /api\.only is an enum whose value sm is the option arena-size-sm/);
});

test('an enum whose values each meet a different family is not appearance', () => {
  const options = new Map([['arena-gap-none', 'gap'], ['arena-size-sm', 'size']]);
  const types = new Map<string, TypeContract>([['Mixed', { name: 'Mixed', kind: 'enum', values: ['sm', 'none'] }]]);
  const contracts = new Map<string, ContractCandidate>([['ArenaX', { component: 'ArenaX', api: { mixed: { form: 'enum', type: 'Mixed' } } }]]);
  assert.deepEqual(optionShapeProblems(contracts, types, options, new Map()), []);
});
