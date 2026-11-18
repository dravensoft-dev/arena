import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { disabledReports, mixOf, slotColour, slotPairs, slotReports, unresolvedPairs } from './slot-contrast.ts';
import { levelDefaults } from './levels.ts';
import { readPlugin, rolesFor } from './theme-css.ts';
import { contrast } from './validate-palette.mjs';
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
    assert.ok(lineOf(lines, 'actions-primary-root-ink-pressed', 'actions-primary-root-fill-pressed', '4.47'), `${theme}\n${lines.join('\n')}`);
    assert.ok(lines.some((line) => /^--actions-destructive-root-ink-pressed measures 4\.(34|25):1 over --actions-destructive-root-fill-pressed/.test(line)), theme);
    assert.ok(lines.some((line) => /^--actions-destructive-root-ink-pressed measures (4\.02|3\.89):1 /.test(line)), theme);
  }
  assert.ok(lineOf(kernel('light'), 'actions-destructive-root-ink-hover', 'actions-destructive-root-fill-hover', '4.36'));
  assert.equal(kernel('dark').some((line) => line.includes('destructive-root-ink-hover')), false, 'dark hover is 4.56');
});

test('a ghost pair is measured over each ground', () => {
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const ink = (ground: string) => slotColour(CATALOGUE.slots, 'actions-ghost-root-ink-rest', new Map(), roles, colors, LEVELS, mixOf(roles), ground);
  const mark = colors[(/--color-([\w-]+)/.exec(roles.get('emphasis-ghost-ink') ?? '') ?? [])[1] ?? ''] as string;
  for (const ground of [colors['base-100'] as string, colors['base-200'] as string]) {
    const painted = ink(ground) as string;
    assert.notEqual(painted, mark, 'the level-ink-body composite is not the bare ink');
    assert.notEqual(painted, ground);
  }
  assert.notEqual(ink(colors['base-100'] as string), ink(colors['base-200'] as string));
  const paired = slotPairs(CATALOGUE.slots).filter((pair) => pair.slot === 'actions-ghost-root-ink-pressed');
  assert.deepEqual(paired, [{ slot: 'actions-ghost-root-ink-pressed', over: 'actions-ghost-root-fill-pressed', min: 4.5 }]);
  const pressed = { ...SLOTS['actions-ghost-root-fill-pressed'] };
  assert.equal(pressed.derive?.mix, 'mix-pressed');
  const pale = { ...colors, 'base-content': colors['base-100'] as string };
  const failing = slotReports(CATALOGUE.slots, new Map([['actions-ghost-root-ink-rest', 'var(--color-base-100)']]), rolesFor(null, CATALOGUE, 'dark'), pale, 'dark', LEVELS);
  const ghost = failing.filter((one) => one.message.startsWith('--actions-ghost-root-ink-pressed measures'));
  assert.ok(ghost.length >= 2, 'one line per ground the ghost fill is composited over');
  assert.ok(ghost.every((one) => /composited over --color-base-\d+/.test(one.message)));
});

test('a rest edge is not a slot pair, a selected edge is', () => {
  const pairs = slotPairs(CATALOGUE.slots);
  assert.equal(pairs.some((pair) => pair.slot === 'actions-secondary-root-edge-rest'), false);
  assert.equal(pairs.some((pair) => pair.slot === 'actions-ghost-root-edge-hover'), false);
  const selected = pairs.filter((pair) => SLOTS[pair.slot]?.property === 'edge');
  assert.ok(selected.length > 0);
  assert.ok(selected.every((pair) => SLOTS[pair.slot]?.state.startsWith('selected') && pair.min === 3));
  assert.equal(pairs.some((pair) => /disabled$/.test(SLOTS[pair.slot]?.state ?? '') || /disabled$/.test(SLOTS[pair.over]?.state ?? '')), false,
    'a disabled and a selected-disabled slot is never a pair');
  assert.ok(pairs.every((pair) => pair.min === (SLOTS[pair.slot]?.property === 'ink' ? 4.5 : 3)));
});

test('an inset ring is measured over each state of its fill', () => {
  const fixture: SlotCatalogue = { ...CATALOGUE.slots, rings: { ...CATALOGUE.slots.rings, 'ArenaButton.root': 'actions-primary-root-fill-rest' } };
  const rings = slotPairs(fixture).filter((pair) => pair.slot === 'edge-focus');
  assert.deepEqual(rings.map((pair) => pair.over).sort(), ['actions-primary-root-fill-hover', 'actions-primary-root-fill-pressed', 'actions-primary-root-fill-rest']);
  assert.ok(rings.every((pair) => pair.min === 3));
  assert.deepEqual(slotPairs(CATALOGUE.slots).filter((pair) => pair.slot === 'edge-focus'), [], 'no ring ships naming a fill');
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const ringed = new Map(roles);
  ringed.set('edge-focus', 'var(--color-primary-fill)');
  const found = slotReports(fixture, new Map(), ringed, colors, 'dark', LEVELS).filter((one) => one.message.startsWith('--edge-focus measures'));
  assert.ok(found.length > 0, 'the focus ring in the primary fill colour is invisible over the primary fill');
  assert.ok(found.every((one) => /over --actions-primary-root-fill-(rest|hover|pressed) in the (rest|hover|pressed) state/.test(one.message)));
});

test('an answered disabled part whose slots are its rest colours gets one note, never a failure', () => {
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const rest = new Map<string, string>();
  for (const [name, slot] of Object.entries(SLOTS)) {
    if (slot.option === 'primary' && slot.state === 'disabled' && slot.property !== 'edge') {
      rest.set(name, roles.get(slot.property === 'fill' ? 'emphasis-primary-fill' : 'emphasis-primary-ink') as string);
    }
  }
  assert.deepEqual(disabledReports(CATALOGUE.slots, new Map(), roles, colors, 'dark', LEVELS), []);
  const notes = disabledReports(CATALOGUE.slots, rest, roles, colors, 'dark', LEVELS);
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.kind, 'contrast');
  assert.match(notes[0]?.message ?? '', /^--actions-primary-root answers its disabled slots/);
  const other = new Map(rest);
  other.set('actions-primary-root-fill-disabled', 'var(--color-base-200)');
  assert.deepEqual(disabledReports(CATALOGUE.slots, other, roles, colors, 'dark', LEVELS), []);
});

test('a destructive glyph follows its ink in the state a plugin answers', () => {
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const answers = new Map([
    ['actions-destructive-root-ink-hover', 'var(--color-base-100)'],
    ['actions-destructive-root-fill-hover', 'var(--color-error)'],
  ]);
  const at = (name: string) => slotColour(CATALOGUE.slots, name, answers, roles, colors, LEVELS, mixOf(roles), colors['base-100'] as string);
  assert.equal(at('actions-destructive-root-icon-hover'), at('actions-destructive-root-ink-hover'));
  assert.notEqual(at('actions-destructive-root-icon-hover'), at('actions-destructive-root-icon-rest'));
  const lines = slotReports(CATALOGUE.slots, answers, roles, colors, 'dark', LEVELS).map((one) => one.message);
  assert.equal(lines.some((line) => line.startsWith('--actions-destructive-root-icon-hover')), false);
});

test('a plugin still filling the button with primary is measured, the palette pair cannot see it', () => {
  const colors = { ...coloursOf('dark'), primary: '#9e77ed', 'primary-fill': '#7f56d9', 'primary-content': '#ffffff' };
  const roles = new Map(rolesFor(null, CATALOGUE, 'dark'));
  roles.set('emphasis-primary-fill', 'var(--color-primary)');
  roles.set('emphasis-solid-fill', 'var(--color-primary)');
  roles.set('emphasis-primary-ink', 'var(--color-primary-content)');
  roles.set('emphasis-solid-ink', 'var(--color-primary-content)');
  const lines = slotReports(CATALOGUE.slots, new Map(), roles, colors, 'dark', LEVELS).map((one) => one.message);
  for (const name of ['actions-primary-root-ink-rest', 'actions-solid-root-ink-rest']) {
    assert.ok(lineOf(lines, name, name.replace('-ink-', '-fill-'), '3.33'), lines.join('\n'));
  }
  assert.ok(lines.some((line) => line.includes('a palette that splits primary-fill from primary fills the button with primary-fill')));
  const ok = new Map(roles);
  ok.set('emphasis-primary-fill', 'var(--color-primary-fill)');
  ok.set('emphasis-solid-fill', 'var(--color-primary-fill)');
  assert.equal(slotReports(CATALOGUE.slots, new Map(), ok, colors, 'dark', LEVELS).some((one) => one.message.includes('-ink-rest measures')), false);
});

const paintedIn = (theme: string, answers: Map<string, string>) => {
  const roles = rolesFor(null, CATALOGUE, theme);
  const colors = coloursOf(theme);
  return (name: string) => slotColour(CATALOGUE.slots, name, answers, roles, colors, LEVELS, mixOf(roles), colors['base-100'] as string);
};

test('an unlevelled destructive glyph paints as its ink, and a levelled ghost glyph takes its ink level once', () => {
  const at = paintedIn('dark', new Map());
  assert.equal(at('actions-destructive-root-icon-rest'), at('actions-destructive-root-ink-rest'));
  const ink = paintedIn('dark', new Map([['actions-ghost-root-ink-rest', 'var(--color-primary)']]));
  assert.equal(ink('actions-ghost-root-icon-rest'), ink('actions-ghost-root-ink-rest'));
  assert.notEqual(ink('actions-ghost-root-ink-rest'), at('actions-ghost-root-ink-rest'));
  assert.equal(at('actions-ghost-root-icon-rest'), at('actions-ghost-root-ink-rest'));
});

test('a slot reads its own answers through the channels its option writes, and a disabled glyph follows the disabled ink', () => {
  const surface = 'var(--color-base-100)';
  const rest = paintedIn('dark', new Map([['actions-primary-root-fill-rest', surface]]));
  for (const state of ['hover', 'disabled']) assert.equal(rest(`actions-primary-root-fill-${state}`), rest('actions-primary-root-fill-rest'), state);
  const hover = paintedIn('dark', new Map([['actions-primary-root-fill-hover', surface]]));
  assert.notEqual(hover('actions-primary-root-fill-hover'), hover('actions-primary-root-fill-rest'));
  const ink = paintedIn('dark', new Map([['actions-primary-root-ink-disabled', 'var(--color-base-content)']]));
  assert.equal(ink('actions-primary-root-icon-disabled'), ink('actions-primary-root-ink-disabled'));
  assert.notEqual(ink('actions-primary-root-icon-disabled'), ink('actions-primary-root-icon-rest'));
});

test('a pair whose mark or fill resolves to no palette colour is returned, not skipped', () => {
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  assert.deepEqual(unresolvedPairs(CATALOGUE.slots, new Map(), roles, colors, LEVELS), []);
  const lost = unresolvedPairs(CATALOGUE.slots, new Map([['actions-primary-root-fill-pressed', 'var(--color-nowhere)']]), roles, colors, LEVELS);
  assert.deepEqual(lost.map((pair) => `${pair.slot} ${pair.over}`), ['actions-primary-root-icon-pressed actions-primary-root-fill-pressed',
    'actions-primary-root-ink-pressed actions-primary-root-fill-pressed']);
});

test('a member default is measured as the member paints it, where it moves a pair', () => {
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const fixture = structuredClone(CATALOGUE.slots);
  fixture.members!['ArenaIconButton.root']!.defaults = { 'actions-ghost-root-edge-selected': '{fill-selected}' };
  const lines = slotReports(fixture, new Map(), roles, colors, 'dark', LEVELS).map((one) => one.message);
  assert.ok(lines.some((line) => /^--actions-ghost-root-edge-selected measures [0-9.]+:1 over --actions-ghost-root-fill-selected .*as ArenaIconButton\.root paints it with its own default/.test(line)), lines.join('\n'));
  assert.equal(slotReports(CATALOGUE.slots, new Map(), roles, colors, 'dark', LEVELS).some((one) => one.message.includes('ArenaIconButton.root')), false,
    'the shipped member default is a rest edge, which is no pair');
});

const pluginAt = (theme: string) => {
  const plugin = readPlugin('default', JSON.parse(readFileSync(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json'), 'utf8')));
  const roles = rolesFor(plugin, CATALOGUE, theme);
  const answers = new Map([...roles].filter(([name]) => Object.hasOwn(SLOTS, name)));
  const colors = coloursOf(theme);
  return (slot: string, over: string) => {
    const ground = colors['base-100'] as string;
    const under = slotColour(CATALOGUE.slots, over, answers, roles, colors, LEVELS, mixOf(roles), ground) as string;
    return contrast(slotColour(CATALOGUE.slots, slot, answers, roles, colors, LEVELS, mixOf(roles), under) as string, under).toFixed(2);
  };
};

test('the default plugin keeps D22\'s destructive hover figures under the group names, and the kernel keeps the primary pressed pair', () => {
  assert.equal(pluginAt('dark')('actions-destructive-root-ink-hover', 'actions-destructive-root-fill-hover'), '5.15');
  assert.equal(pluginAt('light')('actions-destructive-root-ink-hover', 'actions-destructive-root-fill-hover'), '5.41');
  for (const theme of ['dark', 'light']) {
    assert.ok(lineOf(kernel(theme), 'actions-primary-root-ink-pressed', 'actions-primary-root-fill-pressed', '4.47'), theme);
  }
});
