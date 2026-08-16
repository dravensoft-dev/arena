/* Every rule takes strings, so the failures are driven by literal fixtures rather than a tree.
 * DEPARTURES is asserted by name in both directions, since a departure nobody declared and one the
 * tree stopped making are the two ways the map goes wrong. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOT, CONVENTION, COMPANION, DEPARTURES, trackedPages, entryPoints, zeroPageProblems,
  zeroEntryProblems, rootProblems, frontmatterProblems, commandProblems, madeDepartures,
  undeclaredDepartureProblems, staleDepartureProblems, collect,
} from './check-agents-spec.ts';

const SCRIPTS = { build: 'x', check: 'y', 'check:docs': 'z' };

test('the convention is named, and the tree tracks pages under the one name it fixes', () => {
  assert.equal(ROOT, 'AGENTS.md');
  assert.equal(CONVENTION, 'https://agents.md');
  assert.ok(trackedPages().length > 0, 'the index holds no page, so every assertion below is vacuous');
});

test('DEPARTURES names each departure and states the reason for it', () => {
  assert.deepEqual([...DEPARTURES.keys()], [COMPANION]);
  for (const reason of DEPARTURES.values()) assert.ok(reason.length > 40, 'an entry states its reason');
});

test('an entry point is a script whose name carries no colon, and a phase script is not one', () => {
  assert.deepEqual(entryPoints(SCRIPTS), ['build', 'check']);
  assert.deepEqual(entryPoints({}), []);
});

test('an empty subject is a failure, because every rule below passes over a tree nobody opened', () => {
  assert.equal(zeroPageProblems([]).length, 1);
  assert.deepEqual(zeroPageProblems([ROOT]), []);
  assert.equal(zeroEntryProblems([]).length, 1);
  assert.deepEqual(zeroEntryProblems(['check']), []);
});

test('the one placement the convention requires is the root, and a nested page is not it', () => {
  assert.deepEqual(rootProblems([ROOT, `a/${ROOT}`]), []);
  const problems = rootProblems([`a/${ROOT}`]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no AGENTS\.md at the repository root/);
});

test('frontmatter is the shape of a skill, and the convention fixes no field at all', () => {
  assert.deepEqual(frontmatterProblems(ROOT, '# Arena\n\ntext'), []);
  const problems = frontmatterProblems(ROOT, '---\nname: arena\n---\n\n# Arena');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /opens with frontmatter/);
});

test('an entry point the root page never names is one no agent is asked to run', () => {
  assert.deepEqual(commandProblems('run `bun run build` and `bun run check --release`', SCRIPTS), []);
  const problems = commandProblems('run `bun run build` and `bun run check:docs`', SCRIPTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /names no `bun run check`/);
});

test('a phase script named on the page is not an entry point, and satisfies nothing', () => {
  const problems = commandProblems('`bun run check:docs` only', SCRIPTS);
  assert.equal(problems.length, 2, 'build and check are both still unnamed');
});

test('a departure the tree makes and nobody declared is one the next reader repairs', () => {
  const problems = undeclaredDepartureProblems([COMPANION, 'OTHER.md']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /OTHER\.md departs from https:\/\/agents\.md/);
});

test('a declared departure the tree no longer makes fails as one that outlived its reason', () => {
  const problems = staleDepartureProblems([]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /DEPARTURES declares CLAUDE\.md, which the tree no longer departs on/);
  assert.deepEqual(staleDepartureProblems([COMPANION]), []);
});

test('this tree makes the departures it declares, and no others', () => {
  const made = madeDepartures();
  assert.deepEqual(undeclaredDepartureProblems(made), []);
  assert.deepEqual(staleDepartureProblems(made), []);
});

test('this tree conforms', () => {
  const problems = collect();
  assert.deepEqual(problems, [], problems.join('\n'));
});
