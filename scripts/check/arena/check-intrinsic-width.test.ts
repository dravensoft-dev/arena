/* The rule is asserted on manifests mutated in memory, so taking w-fit off a badge, or putting a
 * button with full off back on w-auto, is a failing case rather than a regression found in a card. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAWN, EXEMPT, choices, collect, drawnSlot, manifestFindings, resolve } from './check-intrinsic-width.ts';
import { readManifests } from './check-measured-box.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';

const manifests = readManifests();
const clone = (name: string): ComponentManifest => structuredClone(manifests.get(name)!);

test('a badge whose root loses w-fit fails', () => {
  const badge = clone('ArenaBadge');
  (badge.slots as Record<string, string>)['root'] = badge.slots!['root']!.replace(/\s*\bw-fit\b/, '');
  assert.equal(manifestFindings(badge).findings.length, choices(badge, 'root').length, 'a branch kept a width it no longer declares');
});

test('a button whose full-off branch is back on w-auto fails for that branch alone', () => {
  const button = clone('ArenaButton');
  button.variants!['full']!['false']!['root'] = 'w-auto';
  const { findings } = manifestFindings(button);
  assert.ok(findings.length > 0);
  assert.ok(findings.every((finding) => finding.chosen['full'] === 'false'));
});

test('a minimum is not a width', () => {
  const icon = clone('ArenaIconButton');
  (icon.slots as Record<string, string>)['root'] = icon.slots!['root']!.replace(/\s*\bw-fit\b/, '');
  icon.variants!['showLabel']!['true']!['root'] = icon.variants!['showLabel']!['true']!['root']!.replace('w-fit', '');
  assert.ok(manifestFindings(icon).findings.some((finding) => finding.chosen['showLabel'] === 'false'),
    'min-w-ctl-h counted as a width');
});

test('a slot that is not inline-level is not asked', () => {
  const card = clone('ArenaCard');
  assert.equal(manifestFindings(card).inline, 0);
});

test('the last width wins, as the recipe resolves it', () => {
  const button = clone('ArenaButton');
  assert.ok(resolve(button, 'root', { full: 'true' }).includes('w-full'));
  assert.ok(resolve(button, 'root', { full: 'false' }).includes('w-fit'));
});

test('only the groups that touch the slot are combined', () => {
  const avatar = clone('ArenaAvatar');
  assert.deepEqual(choices(avatar, 'root').map((chosen) => Object.keys(chosen)), [['size'], ['size'], ['size'], ['size']]);
});

test('SegmentedControl is read through its track, which DRAWN declares with a reason', () => {
  assert.equal(drawnSlot(clone('ArenaSegmentedControl')), 'track');
  for (const [name, entry] of DRAWN) assert.ok(entry.why.length > 20, `${name} has no usable reason`);
});

test('EXEMPT starts empty, and that is the claim', () => {
  assert.equal(EXEMPT.size, 0);
});

test('the tree is clean, and the gate looked at something', () => {
  const { problems, inline } = collect();
  assert.deepEqual(problems, []);
  assert.ok(inline > 0);
});
