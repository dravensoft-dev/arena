import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BROWSER_BOUND, CSS_VALUED, WEB_PROSE, WEB_SHAPED, collect, memberPath, proseProblems, strands,
  valueProblems, zeroRecordProblems, zeroWalkProblems,
} from './check-contracts-neutrality.ts';
import { COMPUTED, DESIGN_MEMBERS, computedProblems, designMemberProblems, optionShapeProblems } from './check-contracts-neutrality.ts';
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

test('a value carrying a browser construct fails, and the record is what makes it not fail', () => {
  const tree = { api: { width: { default: 'calc(var(--sp-1) * 120)' } } };
  const loose = valueProblems(of('contracts/api/components/Ghost.json', tree), BROWSER_BOUND, new Map());
  assert.equal(loose.length, 1);
  assert.match(loose[0] ?? '', /cannot execute/);

  const recorded = new Map([['contracts/api/components/Ghost.json:api.width', 'on the record']]);
  assert.deepEqual(valueProblems(of('contracts/api/components/Ghost.json', tree), BROWSER_BOUND, recorded), []);
});

test('a recorded member whose value stopped being CSS fails, so the record cannot outlive the debt', () => {
  const tree = { api: { width: { default: '480' } } };
  const recorded = new Map([['contracts/api/components/Ghost.json:api.width', 'on the record']]);
  const problems = valueProblems(of('contracts/api/components/Ghost.json', tree), BROWSER_BOUND, recorded);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /outlived the debt it records/);
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

test('an empty walk, an empty record and an empty exemption set are all failures', () => {
  assert.deepEqual(zeroWalkProblems(1, 1, 1), []);
  assert.equal(zeroWalkProblems(0, 1, 1).length, 1);
  assert.equal(zeroWalkProblems(1, 0, 1).length, 1);
  assert.equal(zeroWalkProblems(1, 1, 0).length, 1);
  assert.deepEqual(zeroRecordProblems(1), []);
  assert.equal(zeroRecordProblems(0).length, 1);
});

test('the tree passes its own claim, over more than nothing', () => {
  const { files, all, problems } = collect();
  assert.deepEqual(problems, []);
  assert.ok(files.length > 0);
  assert.ok(all.filter((s) => !s.prose).length > 0, 'a gate reading no value checks no value');
});

test('every record still names something the payload holds', () => {
  const { all } = collect();
  const values = new Set(all.filter((s) => !s.prose).map(memberPath));
  for (const member of CSS_VALUED.keys()) {
    assert.ok(values.has(member), `CSS_VALUED names ${member} and no value under it was read`);
  }
  const proseAt = new Set(all.filter((s) => s.prose).map((s) => `${s.rel}:${s.path.split('.').slice(0, -1).join('.') || '(root)'}`));
  for (const at of WEB_PROSE.keys()) {
    assert.ok(proseAt.has(at), `WEB_PROSE names ${at} and no description was read there`);
  }
  assert.ok(WEB_SHAPED.size > 0);
  assert.ok(BROWSER_BOUND.size > 0);
});

test('every design member still to migrate names a member a contract declares, and a later phase', () => {
  assert.deepEqual(designMemberProblems(() => true), []);
  assert.match(designMemberProblems((key) => !key.endsWith(':api.size'), new Map([['contracts/api/components/ArenaButton.json:api.size', { phase: 5, why: 'w' }]])).join('\n'),
    /DESIGN_MEMBERS names contracts\/api\/components\/ArenaButton\.json:api\.size and no contract declares it/);
  assert.match(designMemberProblems(() => true, new Map([['k', { phase: 1 as never, why: 'w' }]])).join('\n'), /phase 1/);
});

test('the record holds the tree as it is: every entry resolves, and full is not among them', () => {
  assert.deepEqual(designMemberProblems(), []);
  assert.ok(![...DESIGN_MEMBERS.keys()].some((key) => key.endsWith(':api.full')));
});

test('a design member owned by phase 4 fails, since only phases 5 and 6 are still to run', () => {
  const problems = designMemberProblems(() => true, new Map([['k', { phase: 4 as never, why: 'w' }]]));
  assert.match(problems.join('\n'), /only phases 5 and 6 are still to run/);
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

test('the real COMPUTED holds, and no member is both computed and a design debt', () => {
  assert.deepEqual(computedProblems(), []);
  assert.equal(COMPUTED.size, 14);
  for (const key of COMPUTED.keys()) assert.ok(!DESIGN_MEMBERS.has(key), `${key} is in both maps`);
});

const probeContracts = new Map<string, ContractCandidate>([
  ['ArenaButton', { component: 'ArenaButton', api: { size: { form: 'enum', type: 'ArenaControlSize' } } }],
]);
const probeTypes = new Map<string, TypeContract>([
  ['ArenaControlSize', { name: 'ArenaControlSize', kind: 'enum', values: ['sm', 'md', 'lg'] }],
]);
const probeOptions = new Map([['arena-size-sm', 'size']]);
const probeKey = 'contracts/api/components/ArenaButton.json:api.size';

test('an enum member whose value is a family option fails, and the message names the way out', () => {
  const problems = optionShapeProblems(probeContracts, probeTypes, probeOptions, new Map(), new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /api\.size is an enum whose value sm is the option arena-size-sm: appearance is a class, not a member\. Write the class, or record the member in COMPUTED/);
});

test('an enum field of a type whose value is a family option fails too', () => {
  const types = new Map<string, TypeContract>([
    ...probeTypes,
    ['ArenaRow', { name: 'ArenaRow', kind: 'object', fields: { size: { form: 'enum', type: 'ArenaControlSize' } } }],
  ]);
  const problems = optionShapeProblems(new Map(), types, probeOptions, new Map(), new Map());
  assert.match(problems.join('\n'), /contracts\/api\/types\/arena-row\.json:fields\.size is an enum whose value sm/);
});

test('a member recorded in COMPUTED or held in DESIGN_MEMBERS passes', () => {
  const computed = new Map([[probeKey, { reads: 'r', why: 'w' }]]);
  assert.deepEqual(optionShapeProblems(probeContracts, probeTypes, probeOptions, computed, new Map()), []);
  const members = new Map([[probeKey, { phase: 5 as const, why: 'w' }]]);
  assert.deepEqual(optionShapeProblems(probeContracts, probeTypes, probeOptions, new Map(), members), []);
});

test('an enum that meets no option passes, and an empty option map is a zero walk', () => {
  assert.deepEqual(optionShapeProblems(probeContracts, probeTypes, new Map([['arena-fill-card', 'fill']]), new Map(), new Map()), []);
  assert.match(optionShapeProblems(probeContracts, probeTypes, new Map()).join('\n'), /0 family options/);
});
