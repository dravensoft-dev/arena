import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BROWSER_BOUND, WEB_PROSE, aliasProseProblems, zeroAliasProseProblems, WEB_SHAPED, collect, memberPath, proseProblems, strands,
  valueProblems, zeroWalkProblems,
} from './check-contracts-neutrality.ts';
import { COMPUTED, computedProblems, cssLengthProblems, functionBody, NOT_GEOMETRY, optionShapeProblems } from './check-contracts-neutrality.ts';
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
  assert.deepEqual(computedProblems(() => true, new Map([['x:api.resolves', entry]])), []);
  assert.match(computedProblems(() => false, new Map([['k', entry]])).join('\n'), /names k and no contract declares it/);
  const lacking = { reads: 'scripts/check/arena/check-contracts-neutrality.ts:noSuchFunction(a)', why: 'w' };
  assert.match(computedProblems(() => true, new Map([['k', lacking]])).join('\n'), /noSuchFunction/);
  const missing = { reads: 'scripts/check/arena/no-such-file.ts:computedProblems(a)', why: 'w' };
  assert.match(computedProblems(() => true, new Map([['k', missing]])).join('\n'), /no-such-file/);
  assert.match(computedProblems(() => true, new Map()).join('\n'), /COMPUTED is empty/);
});

test('a COMPUTED entry fails when its function body does not read the member', () => {
  const entry = { reads: 'scripts/check/arena/check-contracts-neutrality.ts:computedProblems(a)', why: 'w' };
  const problems = computedProblems(() => true, new Map([['x:api.zzNeverRead', entry]])).join('\n');
  assert.match(problems, /body of computedProblems does not read zzNeverRead/);
  assert.ok(functionBody('function f(a) { if (a) { return 1; } return 2; }\nconst g = 3;', 'f')?.endsWith('return 2; }'));
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

test('a description under contracts/api naming a compatibility alias fails', () => {
  const at = 'contracts/api/types/arena-x.json';
  const fixture = (text: string) => of(at, { description: text });
  assert.deepEqual(aliasProseProblems(fixture('Drawn bold in the body ink.')), []);
  assert.equal(aliasProseProblems(fixture('Drawn bold in --bone.')).length, 1);
  assert.equal(aliasProseProblems(fixture('Outline in --error rather than --bone-dim.')).length, 1);
  assert.deepEqual(aliasProseProblems(fixture('Painted on a --color-cat slot, or --accent-primary.')), []);
  assert.deepEqual(aliasProseProblems(of('contracts/design/x.json', { description: 'in --bone' })), []);
});

test('the alias guard fails on a walk that read no description under contracts/api', () => {
  assert.equal(zeroAliasProseProblems([]).length, 1);
  assert.deepEqual(zeroAliasProseProblems(of('contracts/api/types/a.json', { description: 'x' })), []);
  assert.deepEqual(zeroAliasProseProblems(collect().all), []);
});

const lengthFamilies = new Map([['dialog', { axis: '--arena-dialog-width' }], ['grid', { axis: ['--arena-grid-min', '--arena-grid-max'] }]]);
const stringMember = (extra: object = {}) => ({ form: 'primitive', type: 'string', ...extra });
const lengthOf = (api: Record<string, object>, computed = new Map<string, { reads: string; why: string }>(),
  notGeometry = new Map<string, string>()) =>
  cssLengthProblems(new Map<string, ContractCandidate>([['ArenaX', { component: 'ArenaX', api }]]), new Map(), lengthFamilies, computed, notGeometry);

test('a string member named for a shipped axis fails, and one with another name passes', () => {
  assert.match(lengthOf({ width: stringMember() }).join('\n'), /ArenaX\.json:api\.width is a string named for the axis width/);
  assert.match(lengthOf({ min: stringMember() }).join('\n'), /api\.min is a string named for the axis min/);
  assert.deepEqual(lengthOf({ label: stringMember() }), []);
  assert.deepEqual(lengthOf({ width: { form: 'primitive', type: 'number' } }), []);
});

test('a string member whose default or example parses as a length, percentage or ratio fails under any name', () => {
  assert.match(lengthOf({ label: stringMember({ default: '40rem' }) }).join('\n'), /api\.label is a string carrying the CSS length "40rem"/);
  assert.equal(lengthOf({ a: stringMember({ examples: ['x', '50%'] }) }).length, 1);
  assert.equal(lengthOf({ a: stringMember({ default: '16/9' }) }).length, 1);
  assert.deepEqual(lengthOf({ a: stringMember({ default: 'wide' }) }), []);
});

test('a COMPUTED-recorded string member passes, and a run that derived no axis name fails', () => {
  const computed = new Map([['contracts/api/components/ArenaX.json:api.width', { reads: 'r', why: 'w' }]]);
  assert.deepEqual(lengthOf({ width: stringMember() }, computed), []);
  const none = cssLengthProblems(new Map(), new Map(), new Map());
  assert.match(none.join('\n'), /derived 0 axis names/);
});

test('a NOT_GEOMETRY member passes, and an entry whose member is gone or no longer matched fails', () => {
  const key = 'contracts/api/components/ArenaX.json:api.min';
  const exempt = new Map([[key, 'bounds the value']]);
  assert.deepEqual(lengthOf({ min: stringMember() }, new Map(), exempt), []);
  assert.match(lengthOf({ label: stringMember() }, new Map(), exempt).join('\n'), /NOT_GEOMETRY names .*api\.min/);
  assert.match(lengthOf({ min: stringMember() }, new Map(), new Map()).join('\n'), /api\.min is a string named for the axis/);
  assert.ok(NOT_GEOMETRY.size > 0);
});
