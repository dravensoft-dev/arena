/* The gate's rule is asserted on a manifest mutated in memory, so the mutation that would reopen
 * the alternation at a threshold is a case here rather than a hope. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MEASURED, utility, outerMoves, branchProblems, unlistedCallers, staleEntries, zeroCallerProblems,
  callers, readManifests, collect,
} from './check-measured-box.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';

const manifests = readManifests();
const clone = (name: string): ComponentManifest => structuredClone(manifests.get(name)!);

test('a utility is read without its variant prefixes and its important mark', () => {
  assert.equal(utility('md:hover:mx-2'), 'mx-2');
  assert.equal(utility('!w-full'), 'w-full');
  assert.equal(utility('[transition:background_var(--dur-hover)]'), '[transition:background_var(--dur-hover)]');
  assert.equal(utility('focus-visible:shadow-[inset_0_0_0_var(--focus-width)_var(--focus-ring)]'),
    'shadow-[inset_0_0_0_var(--focus-width)_var(--focus-ring)]');
});

test('each family that moves the outer box is caught, and padding, border and block margins are not', () => {
  assert.deepEqual(outerMoves('mx-2 -ml-1 me-3 m-4 w-full min-w-0 max-w-none basis-1/2 grow shrink-0 flex-1 flex-auto flex-none'),
    ['mx-2', '-ml-1', 'me-3', 'm-4', 'w-full', 'min-w-0', 'max-w-none', 'basis-1/2', 'grow', 'shrink-0', 'flex-1', 'flex-auto', 'flex-none']);
  assert.deepEqual(outerMoves('inline inline-block inline-flex inline-grid contents absolute fixed'),
    ['inline', 'inline-block', 'inline-flex', 'inline-grid', 'contents', 'absolute', 'fixed']);
  assert.deepEqual(outerMoves('pl-3 px-4 py-2.5 border-[length:var(--bw-surface)] my-2 mt-1 mb-1 flex flex-col relative gap-4 items-stretch'), []);
});

test('a width-decided branch adding mx-2 to a measured slot fails', () => {
  const table = clone('ArenaTable');
  const narrow = table.variants!['narrow']!['true']!;
  narrow['root'] = `${narrow['root'] ?? ''} mx-2`;
  const problems = branchProblems('ArenaTable', MEASURED.get('ArenaTable')!, table);
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /narrow=true.*mx-2.*root/);
});

test('a compound selecting on a width-decided group is read too', () => {
  const head = clone('ArenaPageHead');
  (head as { compoundVariants?: unknown }).compoundVariants = [{ narrow: false, class: { root: 'w-full' } }];
  assert.equal(branchProblems('ArenaPageHead', MEASURED.get('ArenaPageHead')!, head).length, 1);
});

test('a branch its width does not decide may do what it likes', () => {
  const bar = clone('ArenaBulkActionBar');
  assert.ok(!MEASURED.get('ArenaBulkActionBar')!.decides.includes('open'));
  bar.variants!['open']!['false']!['root'] = 'hidden absolute';
  assert.deepEqual(branchProblems('ArenaBulkActionBar', MEASURED.get('ArenaBulkActionBar')!, bar), []);
});

test('a caller MEASURED does not name fails', () => {
  const problems = unlistedCallers(new Map([['ArenaNewPanel', ['frameworks/react/components']]]));
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /ArenaNewPanel/);
});

test('an entry naming a component, a slot or a group that is not there is stale', () => {
  const found = new Map([['ArenaTable', ['frameworks/react/components']]]);
  const stale = staleEntries(found, manifests, new Map([
    ['ArenaGone', { slot: 'root', decides: [], why: 'a component that was removed' }],
    ['ArenaTable', { slot: 'frame', decides: ['wide'], why: 'a slot and a group that were renamed' }],
  ]));
  assert.equal(stale.length, 3, stale.join('\n'));
});

test('a walk that finds no caller fails rather than passing over nothing', () => {
  assert.equal(zeroCallerProblems(0).length, 1);
  assert.deepEqual(zeroCallerProblems(1), []);
});

test('every entry carries a reason', () => {
  for (const [name, entry] of MEASURED) assert.ok(entry.why.length > 20, `${name} has no usable reason`);
});

test('MEASURED names exactly the components that call a container helper, in either layer', () => {
  assert.deepEqual([...callers().keys()].sort(), [...MEASURED.keys()].sort());
});

test('the tree is clean', () => {
  const { problems, callers: count } = collect();
  assert.deepEqual(problems, []);
  assert.ok(count > 0);
});
