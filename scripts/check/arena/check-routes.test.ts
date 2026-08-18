/* The gate reads the real tree, so these drive its pure functions over a temporary one with the
 * four shapes a real mistake takes: a stop reaching nothing, a route over its budget, a budget the
 * tree has fallen under, and a walk that found no document. ROUTES is asserted by name, and the
 * declared reads are asserted equal to the stops, which is the pair a second copy would drift. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ROUTES, BUDGET_SLACK, node, documents, largestReached, measure,
  unreachedProblems, overBudgetProblems, staleBudgetProblems, zeroScanProblems, routeProblems,
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
  stops: ['SKILL.md'],
  budget: 1_000,
  reason: 'a budget declared by a test, which is the shape a real one has',
  ...over,
});

test('every route names the reader it is paid by and the reason for its budget', () => {
  assert.deepEqual(ROUTES.map((r) => r.name), [
    'consumer-component', 'consumer-install', 'consumer-skin', 'consumer-register', 'consumer-seo',
    'consumer-surface', 'consumer-page',
    'contributor-component', 'contributor-authoring', 'contributor-token', 'contributor-gate',
  ]);
  for (const one of ROUTES) {
    assert.ok(one.stops.length > 1, `${one.name} is a route rather than a single document`);
    assert.ok(one.budget > 0, `${one.name} carries a budget`);
    assert.ok(one.reason.length > 40, `${one.name} states why its budget is that number`);
    assert.ok(one.who.length > 20, `${one.name} names who pays it`);
  }
});

test('the declared reads are the stops, so the graph cannot know a narrower tree than the gate opens', () => {
  assert.deepEqual(node.reads, [...new Set(ROUTES.flatMap((r) => r.stops))]);
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

test('a route costs the sum of its stops, and a stop reaching nothing is reported rather than skipped', () => {
  const base = tree({ 'SKILL.md': 'x'.repeat(100) });
  const one = route({ stops: ['SKILL.md', 'frameworks/*/SKILL.md'] });
  const { total, unreached } = measure(one, documents(base), base);
  assert.equal(total, 100);
  assert.deepEqual(unreached, ['frameworks/*/SKILL.md']);
  const problems = unreachedProblems(one, unreached);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /describes a tree that moved under it/);
});

test('a route over its budget names the stop spending most of it', () => {
  const charged = [
    { stop: 'SKILL.md', rel: 'SKILL.md', chars: 400 },
    { stop: 'frameworks/*/SKILL.md', rel: 'frameworks/angular/SKILL.md', chars: 900 },
  ];
  const problems = overBudgetProblems(route(), charged, 1_300);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /costs 1300 characters against a budget of 1000/);
  assert.match(problems[0] ?? '', /frameworks\/angular\/SKILL\.md at 900/);
  assert.deepEqual(overBudgetProblems(route(), charged, 1_000), [], 'a route at its budget is inside it');
});

test('a budget the tree has fallen far under fails as a stale allowance, not as a saving', () => {
  const floor = Math.round(1_000 * BUDGET_SLACK);
  assert.deepEqual(staleBudgetProblems(route(), floor), [], 'a route at the floor still applies pressure');
  const problems = staleBudgetProblems(route(), floor - 1);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /An allowance is not an exemption/);
});

test('no routes, no documents and a route with no stop are each failures rather than a clean pass', () => {
  assert.match(zeroScanProblems([], ['SKILL.md'])[0] ?? '', /declared 0 routes/);
  assert.match(zeroScanProblems(ROUTES, [])[0] ?? '', /walked 0 documents/);
  assert.match(zeroScanProblems([route({ stops: [] })], ['SKILL.md'])[0] ?? '', /is a route in name only/);
  assert.deepEqual(zeroScanProblems([route()], ['SKILL.md']), []);
});

test('the repository is inside every budget it declares', () => {
  const { problems, measured, scanned } = routeProblems();
  assert.deepEqual(problems, []);
  assert.equal(measured.length, ROUTES.length);
  assert.ok(scanned > 100, 'the walk reaches the whole documentation tree');
});
