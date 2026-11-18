import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { disabledReports, mixOf, slotColour, slotPairs, slotReports } from './slot-contrast.ts';
import { levelDefaults } from './levels.ts';
import { rolesFor } from './theme-css.ts';
import { tokenCatalogue } from '../../../lib/arena/package-assembly.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import type { SlotCatalogue } from './slots.ts';

const CATALOGUE = tokenCatalogue();
const SLOTS = CATALOGUE.slots.slots;
const LEVELS = levelDefaults(readFileSync(join(repoRoot, 'contracts/design/colors.css'), 'utf8'));

const coloursOf = (theme: string) => {
  const palette = JSON.parse(readFileSync(join(repoRoot, `contracts/design/palette.${theme}.json`), 'utf8')).color as Record<string, { $value?: { hex?: string } }>;
  return Object.fromEntries(Object.entries(palette).filter(([, token]) => token.$value?.hex).map(([key, token]) => [key, token.$value?.hex as string]));
};

const kernel = (theme: string) => slotReports(CATALOGUE.slots, new Map(), rolesFor(null, CATALOGUE, theme), coloursOf(theme), theme, LEVELS)
  .map((one) => one.message);

const lineOf = (lines: string[], slot: string, over: string, ratio: string) =>
  lines.some((line) => line.startsWith(`--${slot} measures ${ratio}:1 over --${over} in the `));

test('the kernel pressed mix of Arena\'s primary falls under AA', () => {
  for (const theme of ['dark', 'light']) {
    const lines = kernel(theme);
    assert.ok(lineOf(lines, 'emphasis-primary-root-ink-pressed', 'emphasis-primary-root-fill-pressed', '4.47'), `${theme}\n${lines.join('\n')}`);
    const slots = Object.keys(SLOTS).filter((name) => /^[a-z-]+-primary-[a-z]+-ink-pressed$/.test(name) && SLOTS[name]?.option === 'primary');
    assert.ok(slots.length >= 4, slots.join(' '));
    for (const slot of slots) {
      assert.ok(lineOf(lines, slot, slot.replace('-ink-', '-fill-'), '4.47'), `${theme} ${slot}`);
    }
    assert.ok(lines.some((line) => /^--button-destructive-root-ink-pressed measures 4\.(34|25):1 over --button-destructive-root-fill-pressed/.test(line)), theme);
    assert.ok(lines.some((line) => /^--split-button-destructive-caret-ink-pressed measures (4\.02|3\.89):1 /.test(line)), theme);
  }
  assert.ok(lineOf(kernel('light'), 'button-destructive-root-ink-hover', 'button-destructive-root-fill-hover', '4.36'));
  assert.equal(kernel('dark').some((line) => line.includes('destructive-root-ink-hover')), false, 'dark hover is 4.56');
});

test('a ghost pair is measured over each ground', () => {
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const ink = (ground: string) => slotColour(CATALOGUE.slots, 'emphasis-ghost-root-ink-rest', new Map(), roles, colors, LEVELS, mixOf(roles), ground);
  const mark = colors[(/--color-([\w-]+)/.exec(roles.get('emphasis-ghost-ink') ?? '') ?? [])[1] ?? ''] as string;
  for (const ground of [colors['base-100'] as string, colors['base-200'] as string]) {
    const painted = ink(ground) as string;
    assert.notEqual(painted, mark, 'the level-ink-body composite is not the bare ink');
    assert.notEqual(painted, ground);
  }
  assert.notEqual(ink(colors['base-100'] as string), ink(colors['base-200'] as string));
  const paired = slotPairs(CATALOGUE.slots).filter((pair) => pair.slot === 'emphasis-ghost-root-ink-pressed');
  assert.deepEqual(paired, [{ slot: 'emphasis-ghost-root-ink-pressed', over: 'emphasis-ghost-root-fill-pressed', min: 4.5 }]);
  const pressed = { ...SLOTS['emphasis-ghost-root-fill-pressed'] };
  assert.equal(pressed.derive?.mix, 'mix-pressed');
  const pale = { ...colors, 'base-content': colors['base-100'] as string };
  const failing = slotReports(CATALOGUE.slots, new Map([['emphasis-ghost-root-ink-rest', 'var(--color-base-100)']]), rolesFor(null, CATALOGUE, 'dark'), pale, 'dark', LEVELS);
  const ghost = failing.filter((one) => one.message.startsWith('--emphasis-ghost-root-ink-pressed measures'));
  assert.ok(ghost.length >= 2, 'one line per ground the ghost fill is composited over');
  assert.ok(ghost.every((one) => /composited over --color-base-\d+/.test(one.message)));
});

test('a rest edge is not a slot pair, a selected edge is', () => {
  const pairs = slotPairs(CATALOGUE.slots);
  assert.equal(pairs.some((pair) => pair.slot === 'emphasis-secondary-root-edge-rest'), false);
  assert.equal(pairs.some((pair) => pair.slot === 'emphasis-ghost-root-edge-hover'), false);
  const selected = pairs.filter((pair) => SLOTS[pair.slot]?.property === 'edge');
  assert.ok(selected.length > 0);
  assert.ok(selected.every((pair) => SLOTS[pair.slot]?.state.startsWith('selected') && pair.min === 3));
  assert.equal(pairs.some((pair) => /disabled$/.test(SLOTS[pair.slot]?.state ?? '') || /disabled$/.test(SLOTS[pair.over]?.state ?? '')), false,
    'a disabled and a selected-disabled slot is never a pair');
  assert.ok(pairs.every((pair) => pair.min === (SLOTS[pair.slot]?.property === 'ink' ? 4.5 : 3)));
});

test('an inset ring is measured over each state of its fill', () => {
  const fixture: SlotCatalogue = { ...CATALOGUE.slots, rings: { ...CATALOGUE.slots.rings, 'ArenaButton.root': 'button-primary-root-fill-rest' } };
  const rings = slotPairs(fixture).filter((pair) => pair.slot === 'edge-focus');
  assert.deepEqual(rings.map((pair) => pair.over).sort(), ['button-primary-root-fill-hover', 'button-primary-root-fill-pressed', 'button-primary-root-fill-rest']);
  assert.ok(rings.every((pair) => pair.min === 3));
  assert.deepEqual(slotPairs(CATALOGUE.slots).filter((pair) => pair.slot === 'edge-focus'), [], 'no ring ships naming a fill');
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const ringed = new Map(roles);
  ringed.set('edge-focus', 'var(--color-primary-fill)');
  const found = slotReports(fixture, new Map(), ringed, colors, 'dark', LEVELS).filter((one) => one.message.startsWith('--edge-focus measures'));
  assert.ok(found.length > 0, 'the focus ring in the primary fill colour is invisible over the primary fill');
  assert.ok(found.every((one) => /over --button-primary-root-fill-(rest|hover|pressed) in the (rest|hover|pressed) state/.test(one.message)));
});

test('an answered disabled part whose slots are its rest colours gets one note, never a failure', () => {
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const rest = new Map<string, string>();
  for (const [name, slot] of Object.entries(SLOTS)) {
    if (slot.scope === 'component' && slot.component === 'ArenaButton' && slot.option === 'primary' && slot.state === 'disabled' && slot.property !== 'edge') {
      rest.set(name, roles.get(slot.property === 'fill' ? 'emphasis-primary-fill' : 'emphasis-primary-ink') as string);
    }
  }
  assert.deepEqual(disabledReports(CATALOGUE.slots, new Map(), roles, colors, 'dark', LEVELS), []);
  const notes = disabledReports(CATALOGUE.slots, rest, roles, colors, 'dark', LEVELS);
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.kind, 'contrast');
  assert.match(notes[0]?.message ?? '', /^--button-primary-root answers its disabled slots/);
  const other = new Map(rest);
  other.set('button-primary-root-fill-disabled', 'var(--color-base-200)');
  assert.deepEqual(disabledReports(CATALOGUE.slots, other, roles, colors, 'dark', LEVELS), []);
});

test('a destructive glyph follows its ink in the state a plugin answers', () => {
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const answers = new Map([
    ['button-destructive-root-ink-hover', 'var(--color-base-100)'],
    ['button-destructive-root-fill-hover', 'var(--color-error)'],
  ]);
  const at = (name: string) => slotColour(CATALOGUE.slots, name, answers, roles, colors, LEVELS, mixOf(roles), colors['base-100'] as string);
  assert.equal(at('button-destructive-root-icon-hover'), at('button-destructive-root-ink-hover'));
  assert.notEqual(at('button-destructive-root-icon-hover'), at('button-destructive-root-icon-rest'));
  const lines = slotReports(CATALOGUE.slots, answers, roles, colors, 'dark', LEVELS).map((one) => one.message);
  assert.equal(lines.some((line) => line.startsWith('--button-destructive-root-icon-hover')), false);
});
