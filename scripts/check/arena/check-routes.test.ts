/* The gate reads the real tree, so these drive its pure functions over a temporary one with the
 * shapes a real mistake takes: a stop reaching nothing, a budget broken from either side, a branch
 * that costs nothing, a route opening with an entry nobody declared, and a walk that found no
 * document. ROUTES and ENTRIES are asserted by name, the declared reads are asserted equal to the
 * routers and stops, and the whole cost of every route is asserted to be its entry plus its worst
 * branch, which is the sum a reader actually pays and the one a split model could quietly lose. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ROUTES, ENTRIES, BUDGET_SLACK, node, branchesOf, documents, largestReached, measure, measureEntry,
  entryProblems, unreachedProblems, overBudgetProblems, staleBudgetProblems, zeroScanProblems,
  routeProblems,
} from './check-routes.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-routes-'));
  for (const [rel, text] of Object.entries(files)) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

const route = (over: Partial<typeof ROUTES[number]> = {}) => ({
  name: 'test-route',
  who: 'a reader in a test',
  entry: 'consumer',
  stops: ['SKILL.md'],
  budget: 1_000,
  reason: 'a budget declared by a test, which is the shape a real one has',
  ...over,
});

test('every entry names the router it opens and the reason for its budget', () => {
  assert.deepEqual(ENTRIES.map((one) => one.name), ['consumer', 'contributor']);
  for (const one of ENTRIES) {
    assert.ok(one.router.endsWith('.md'), `${one.name} opens a document`);
    assert.ok(one.budget > 0, `${one.name} carries a budget`);
    assert.ok(one.reason.length > 40, `${one.name} states why its budget is that number`);
  }
});

test('every route names the reader it is paid by, the entry it opens with, and the reason for its budget', () => {
  assert.deepEqual(ROUTES.map((r) => r.name), [
    'consumer-component', 'consumer-install', 'consumer-skin', 'consumer-register', 'consumer-seo',
    'consumer-surface', 'consumer-page', 'consumer-coldstart',
    'contributor-component', 'contributor-authoring', 'contributor-token', 'contributor-gate',
  ]);
  for (const one of ROUTES) {
    assert.ok(ENTRIES.some((entry) => entry.name === one.entry), `${one.name} opens with an entry`);
    assert.ok(branchesOf(one).every((branch) => branch.stops.length > 0),
      `${one.name} has no branch that costs nothing`);
    assert.ok(one.budget > 0, `${one.name} carries a budget`);
    assert.ok(one.reason.length > 40, `${one.name} states why its budget is that number`);
    assert.ok(one.who.length > 20, `${one.name} names who pays it`);
  }
});

test('a route declares its stops or its branches and never both, so one measurement path serves them', () => {
  for (const one of ROUTES)
    assert.ok(!(one.stops && one.branches),
      `${one.name} declares stops and branches, and the two would disagree silently`);
});

test('the declared reads are the routers and the stops, so the graph cannot know a narrower tree', () => {
  assert.deepEqual(node.reads, [...new Set([
    ...ENTRIES.map((entry) => entry.router),
    ...ROUTES.flatMap((r) => branchesOf(r).flatMap((branch) => branch.stops)),
  ])]);
  assert.deepEqual(node.writes, [], 'a gate judges and does not emit');
});

test('the consumer build route stays cheaper than the contributor one, which is the whole ordering', () => {
  const build = ROUTES.find((r) => r.name === 'consumer-component');
  const change = ROUTES.find((r) => r.name === 'contributor-component');
  assert.ok((build?.budget ?? 0) < (change?.budget ?? 0));
});

test('a stop is charged its largest match, because a route costs the worst case a reader can meet', () => {
  const base = tree({
    'frameworks/react/components/display/a/A.prompt.md': 'x'.repeat(300),
    'frameworks/react/components/forms/b/B.prompt.md': 'x'.repeat(900),
  });
  const charge = largestReached('frameworks/*/components/**/*.prompt.md', documents(base), base);
  assert.equal(charge?.chars, 900);
  assert.equal(charge?.rel, 'frameworks/react/components/forms/b/B.prompt.md');
});

test('a branch costs the sum of its stops, and a stop reaching nothing is reported rather than skipped', () => {
  const base = tree({ 'SKILL.md': 'x'.repeat(100) });
  const one = route({ stops: ['SKILL.md', 'frameworks/*/SKILL.md'] });
  const { total, unreached } = measure(one, documents(base), base);
  assert.equal(total, 100);
  assert.deepEqual(unreached, ['frameworks/*/SKILL.md']);
  const problems = unreachedProblems(one, unreached);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /describes a tree that moved under it/);
});

test('a branching route is charged its worst branch and never the sum of them, because a reader walks one', () => {
  const base = tree({
    'tree.md': 'x'.repeat(100),
    'catalogue/one/ENTRY.md': 'x'.repeat(400),
    'template.html': 'x'.repeat(9_000),
  });
  const one = route({
    stops: undefined,
    branches: [
      { name: 'the document it was handed', stops: ['tree.md'] },
      { name: 'a catalogue entry', stops: ['tree.md', 'catalogue/*/ENTRY.md'] },
    ],
  });
  const { total, worst, branches } = measure(one, documents(base), base);
  assert.equal(branches.length, 2);
  assert.equal(total, 500, 'the sum of both branches would be 600, and no reader pays that');
  assert.equal(worst?.name, 'a catalogue entry');
});

test('a route over its budget names the stop spending most of it', () => {
  const one = route();
  const charged = [
    { stop: 'SKILL.md', rel: 'SKILL.md', chars: 400 },
    { stop: 'frameworks/*/SKILL.md', rel: 'frameworks/angular/SKILL.md', chars: 900 },
  ];
  const problems = overBudgetProblems(one.name, one.reason, one.budget, charged, 1_300);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /costs 1300 characters against a budget of 1000/);
  assert.match(problems[0] ?? '', /frameworks\/angular\/SKILL\.md at 900/);
  assert.deepEqual(overBudgetProblems(one.name, one.reason, one.budget, charged, 1_000), [],
    'a route at its budget is inside it');
});

test('a budget the tree has fallen far under fails as a stale allowance, not as a saving', () => {
  const floor = Math.round(1_000 * BUDGET_SLACK);
  assert.deepEqual(staleBudgetProblems('test-route', 1_000, floor), [],
    'a route at the floor still applies pressure');
  const problems = staleBudgetProblems('test-route', 1_000, floor - 1);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /An allowance is not an exemption/);
});

test('the floor and the ceiling reach an entry too, so a shared router cannot bloat or coast', () => {
  const base = tree({ 'SKILL.md': 'x'.repeat(900) });
  const entry = { name: 'consumer', router: 'SKILL.md', budget: 1_000, reason: 'x'.repeat(50) };
  const { total, charged } = measureEntry(entry, documents(base), base);
  assert.equal(total, 900);
  assert.deepEqual(overBudgetProblems(entry.name, entry.reason, entry.budget, charged, total), []);
  assert.match(overBudgetProblems(entry.name, entry.reason, 800, charged, total, 'entry')[0] ?? '',
    /argue the entry's budget up here/);
  assert.match(staleBudgetProblems(entry.name, 2_000, total)[0] ?? '', /An allowance is not an exemption/);
});

test('a route opening with an entry nobody declared is reported rather than charged from its second page', () => {
  assert.deepEqual(entryProblems(route()), []);
  const problems = entryProblems(route({ entry: 'nobody' }));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no entry is declared under that name/);
});

test('no entries, no routes, no documents, an unopened entry and a branch with no stop each fail', () => {
  assert.match(zeroScanProblems([route()], ['SKILL.md'], [])[0] ?? '', /declared 0 entries/);
  assert.match(zeroScanProblems([], ['SKILL.md'])[0] ?? '', /declared 0 routes/);
  assert.match(zeroScanProblems(ROUTES, [])[0] ?? '', /walked 0 documents/);
  assert.match(zeroScanProblems([route()], ['SKILL.md'])[0] ?? '',
    /the entry contributor is declared and no route opens with it/);
  assert.match(
    zeroScanProblems([route({ stops: [] })], ['SKILL.md'], [ENTRIES[0]!])[0] ?? '',
    /declares no stop/,
  );
  assert.deepEqual(zeroScanProblems([route()], ['SKILL.md'], [ENTRIES[0]!]), []);
});

test('the repository is inside every budget it declares, and a route costs its entry plus its worst branch', () => {
  const { problems, measured, opened, scanned } = routeProblems();
  assert.deepEqual(problems, []);
  assert.equal(measured.length, ROUTES.length);
  assert.equal(opened.length, ENTRIES.length);
  for (const one of measured)
    assert.equal(one.whole, one.opening + one.total,
      `${one.route.name} reports a whole cost that is not what a reader pays`);
  assert.ok(scanned > 100, 'the walk reaches the whole documentation tree');
});
