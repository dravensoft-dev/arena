/* The rule is asserted on manifests mutated in memory, so a button that stops reading the fill
 * channel, or a badge that loses its own width, is a failing case rather than a regression found
 * in a card. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAWN, FILL_READ, OWN_WIDTH, choices, collect, drawnSlot, manifestFindings, resolve } from './check-intrinsic-width.ts';
import { readManifests } from './check-measured-box.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';

const manifests = readManifests();
const clone = (name: string): ComponentManifest => structuredClone(manifests.get(name)!);
const slots = (manifest: ComponentManifest) => manifest.slots as Record<string, string>;

test('an inline root that answers fill and reads the channel with fit-content behind it is clean', () => {
  assert.deepEqual(manifestFindings(clone('ArenaButton')).findings, []);
});

test('an inline root that answers fill and no longer reads the channel fails', () => {
  const button = clone('ArenaButton');
  slots(button)['root'] = slots(button)['root']!.replace(FILL_READ, 'w-fit');
  assert.ok(manifestFindings(button).findings.length > 0);
});

test('a badge whose root loses w-fit fails, since it keeps a width of its own', () => {
  const badge = clone('ArenaBadge');
  slots(badge)['root'] = slots(badge)['root']!.replace(/\s*\bw-fit\b/, '');
  assert.equal(manifestFindings(badge).findings.length, choices(badge, 'root').length, 'a branch kept a width it no longer declares');
});

test('a minimum is not a width', () => {
  const icon = clone('ArenaIconButton');
  slots(icon)['root'] = slots(icon)['root']!.replace(FILL_READ, '');
  assert.ok(manifestFindings(icon).findings.some((finding) => finding.chosen['showLabel'] === 'false'),
    'min-w-ctl-h counted as a width');
});

test('a slot that is not inline-level is not asked', () => {
  assert.equal(manifestFindings(clone('ArenaCard')).inline, 0);
});

test('the last width wins, as the recipe resolves it', () => {
  assert.ok(resolve(clone('ArenaButton'), 'root', {}).includes(FILL_READ));
});

test('only the groups that touch the slot are combined', () => {
  const avatar = clone('ArenaAvatar');
  assert.deepEqual(choices(avatar, 'box').map((chosen) => Object.keys(chosen)), [['kind'], ['kind']]);
});

test('SegmentedControl is read through its track, which DRAWN declares with a reason', () => {
  assert.equal(drawnSlot(clone('ArenaSegmentedControl')), 'track');
  for (const [name, entry] of DRAWN) assert.ok(entry.why.length > 20, `${name} has no usable reason`);
});

test('an inline root that neither answers fill nor is listed in OWN_WIDTH fails, however it sets its width', () => {
  const { problems } = collect(undefined, new Map(), new Map([['ArenaBadge', clone('ArenaBadge')]]));
  assert.match(problems.join('\n'), /ArenaBadge\.root is inline-level, answers no fill and is not in OWN_WIDTH/);
});

test('a listed root keeps a width of its own, and the old rule still holds for it', () => {
  const badge = clone('ArenaBadge');
  slots(badge)['root'] = slots(badge)['root']!.replace('w-fit', 'w-auto');
  assert.match(collect(undefined, OWN_WIDTH, new Map([['ArenaBadge', badge]])).problems.join('\n'), /declares w-auto/);
});

test('an OWN_WIDTH entry that answers fill, or is not inline at all, is stale', () => {
  const text = collect(undefined, new Map([['ArenaButton', 'why'], ['ArenaCard', 'why']])).problems.join('\n');
  assert.match(text, /stale OWN_WIDTH: ArenaButton answers fill/);
  assert.match(text, /stale OWN_WIDTH: ArenaCard has no inline-level root/);
});

test('every listed root says why it keeps its own width', () => {
  for (const [name, why] of OWN_WIDTH) assert.ok(why.length > 20, `${name} has no usable reason`);
});

test('the tree is clean, and the gate looked at something', () => {
  const { problems, inline } = collect();
  assert.deepEqual(problems, []);
  assert.ok(inline > 0);
});
