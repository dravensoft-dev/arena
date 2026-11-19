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
import { fadeMarkers, memberValue } from './slots.ts';
import type { SlotCatalogue } from './slots.ts';
import { deriveSlots } from '../../../lib/core/color-slots.ts';
import type { GroupPart } from '../../../lib/core/color-slots.ts';
import { slotFixture } from '../../../lib/core/color-slots-fixture.ts';

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

test('the kernel pressed mix of Arena\'s primary and destructive actions clears AA, so the default plugin answers neither', () => {
  for (const theme of ['dark', 'light']) {
    const lines = kernel(theme).filter((line) => /^--actions-(primary|solid|destructive)-root-/.test(line));
    assert.deepEqual(lines, [], theme);
  }
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
  const mark = (name: string) => SLOTS[name]?.group === 'choices' && ['mark', 'knob'].includes(SLOTS[name]?.part ?? '');
  assert.ok(pairs.every((pair) => pair.min === (SLOTS[pair.slot]?.property === 'ink' && !mark(pair.slot) ? 4.5 : 3)), 'an ink is text at 4.5:1, a mark or a knob glyph at 3:1 (D69)');
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
  fixture.members!['ArenaIconButton.root']!.defaults = { 'actions-ghost-root-edge-selected': '{fill-surface}' };
  const lines = slotReports(fixture, new Map(), roles, colors, 'dark', LEVELS).map((one) => one.message);
  assert.ok(lines.some((line) => /^--actions-ghost-root-edge-selected(-hover|-pressed)? measures [0-9.]+:1 over --actions-ghost-root-fill-selected(-hover|-pressed)? .*as ArenaIconButton\.root paints it with its own default/.test(line)), lines.join('\n'));
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

test('the default plugin paints its actions with the kernel answers, and their hover and pressed figures clear AA', () => {
  const figures = (theme: string) => ['hover', 'pressed'].flatMap((state) => ['destructive', 'primary']
    .map((option) => pluginAt(theme)(`actions-${option}-root-ink-${state}`, `actions-${option}-root-fill-${state}`)));
  assert.deepEqual(figures('dark'), ['5.32', '6.41', '4.94', '4.53']);
  assert.deepEqual(figures('light'), ['5.17', '6.41', '4.91', '4.53']);
});

const declared = (parts: Record<string, GroupPart>) => deriveSlots(slotFixture(parts));

test('an ink with no fill is measured over every ground', () => {
  const c = declared({ required: { properties: ['ink', 'icon'], states: 'base', rest: { ink: '{ink-body}', icon: 'ink' } } });
  const pairs = slotPairs(c).filter((pair) => pair.slot.startsWith('fields-required-'));
  assert.deepEqual(pairs.map((pair) => `${pair.slot}>${pair.over}@${pair.min}`).sort(), [
    'fields-required-icon-hover>ground@3', 'fields-required-icon-pressed>ground@3', 'fields-required-icon-rest>ground@3',
    'fields-required-ink-hover>ground@4.5', 'fields-required-ink-pressed>ground@4.5', 'fields-required-ink-rest>ground@4.5',
  ]);
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  assert.deepEqual(unresolvedPairs(c, new Map(), roles, colors, LEVELS).filter((pair) => pair.over === 'ground').length, 0);
  const faint = new Map([['fields-required-ink-rest', 'var(--color-base-100)']]);
  const lines = slotReports(c, faint, roles, colors, 'dark', LEVELS).map((one) => one.message).filter((line) => line.startsWith('--fields-required-ink-rest measures'));
  const grounds = new Set(lines.map((line) => /composited over --color-(base-\d+)/.exec(line)?.[1]));
  assert.ok(grounds.size >= 2, lines.join('\n'));
  assert.ok(lines.every((line) => /over the ground in the rest state of the dark theme/.test(line)));
  assert.deepEqual(slotReports(c, new Map([['fields-required-ink-rest', 'var(--color-base-content)']]), roles, colors, 'dark', LEVELS)
    .filter((one) => one.message.startsWith('--fields-required-ink-rest measures')), []);
});

test('a mark is measured over its box', () => {
  const c = declared({
    box: { properties: ['fill', 'ink'], states: 'toggle', rest: { fill: '{fill-control}', ink: '{ink-body}' } },
    mark: { properties: ['fill', 'ink'], states: 'toggle', on: 'box', selectedOn: 'rest', rest: { fill: '{fill-surface}', ink: '{ink-body}' } },
  });
  const pairs = slotPairs(c);
  const fill = (slot: string) => pairs.find((pair) => pair.slot === slot);
  assert.deepEqual(fill('fields-mark-fill-hover'), { slot: 'fields-mark-fill-hover', over: 'fields-box-fill-hover', min: 3 });
  assert.deepEqual(fill('fields-mark-fill-selected'), { slot: 'fields-mark-fill-selected', over: 'fields-mark-fill-rest', min: 3 });
  assert.deepEqual(fill('fields-mark-fill-selected-hover'), { slot: 'fields-mark-fill-selected-hover', over: 'fields-mark-fill-rest', min: 3 });
  assert.deepEqual(fill('fields-mark-fill-selected-pressed'), { slot: 'fields-mark-fill-selected-pressed', over: 'fields-mark-fill-rest', min: 3 });
  assert.equal(fill('fields-mark-fill-selected-disabled'), undefined);
  assert.equal(fill('fields-mark-fill-disabled'), undefined);
  assert.equal(fill('fields-box-fill-rest'), undefined, 'a fill with no on is no pair');
  assert.deepEqual(fill('fields-mark-ink-pressed'), { slot: 'fields-mark-ink-pressed', over: 'fields-mark-fill-pressed', min: 3 }, 'a glyph sits on its own part\'s fill at 3:1 (D69)');
  const bare = slotPairs(declared({
    box: { properties: ['fill'], states: 'toggle', rest: { fill: '{fill-control}' } },
    tick: { properties: ['ink'], states: 'toggle', on: 'box', rest: { ink: '{ink-body}' } },
  }));
  assert.deepEqual(bare.find((pair) => pair.slot === 'fields-tick-ink-selected'), { slot: 'fields-tick-ink-selected', over: 'fields-box-fill-selected', min: 3 }, 'a mark with no fill sits on the box at 3:1');
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const same = new Map([['fields-mark-fill-rest', 'var(--color-base-300)'], ['fields-box-fill-rest', 'var(--color-base-300)']]);
  const lines = slotReports(c, same, roles, colors, 'dark', LEVELS).map((one) => one.message).filter((line) => line.startsWith('--fields-mark-fill-rest measures'));
  assert.ok(lines.length > 0, 'a mark the colour of its box is reported');
  assert.ok(lines.every((line) => /below 3:1 \(WCAG 1\.4\.11\)/.test(line)));
  const knobOff = { dark: '10.07', light: '7.06' };
  for (const theme of ['dark', 'light'] as const) {
    const ratio = pluginAt(theme);
    assert.equal(ratio('choices-knob-fill-rest', 'choices-box-fill-rest'), knobOff[theme], `${theme}: the off knob over the box at rest`);
    assert.ok(Number(ratio('choices-mark-ink-selected', 'choices-box-fill-selected')) >= 3, `${theme}: the white mark over fill-control-on`);
    assert.ok(Number(ratio('choices-box-fill-selected', 'choices-box-fill-rest')) >= 3, `${theme}: fill-control-on over fill-control`);
    for (const state of ['rest', 'selected']) assert.ok(Number(ratio(`choices-knob-ink-${state}`, `choices-knob-fill-${state}`)) >= 3, `${theme}: the knob glyph over the knob at ${state}`);
    assert.equal(ratio('choices-knob-ink-rest', 'choices-knob-fill-rest'), knobOff[theme], `${theme}: the off glyph over the off knob`);
    assert.equal(ratio('choices-mark-ink-selected', 'choices-box-fill-selected'), { dark: '3.71', light: '6.33' }[theme], `${theme}: the white mark over fill-control-on`);
    const plugin = readPlugin('default', JSON.parse(readFileSync(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json'), 'utf8')));
    const roles = rolesFor(plugin, CATALOGUE, theme);
    const answers = new Map([...roles].filter(([name]) => Object.hasOwn(SLOTS, name)));
    const choices = slotReports(CATALOGUE.slots, answers, roles, coloursOf(theme), theme, LEVELS).map((one) => one.message).filter((line) => line.startsWith('--choices-'));
    assert.deepEqual(choices, [], `${theme}: the default plugin draws every choices pair above its floor`);
  }
  const shipped = slotPairs(CATALOGUE.slots);
  assert.ok(shipped.some((pair) => pair.slot === 'choices-knob-fill-selected' && pair.over === 'choices-box-fill-selected' && pair.min === 3));
  assert.ok(shipped.some((pair) => pair.slot === 'choices-box-fill-selected' && pair.over === 'choices-box-fill-rest' && pair.min === 3));
  assert.ok(shipped.some((pair) => pair.slot === 'choices-knob-ink-selected' && pair.over === 'choices-knob-fill-selected' && pair.min === 3));
  assert.ok(shipped.some((pair) => pair.slot === 'choices-mark-ink-selected' && pair.over === 'choices-box-fill-selected' && pair.min === 3));
  assert.ok(!shipped.some((pair) => pair.slot === 'choices-mark-ink-rest'), 'the mark has no rest slot (D70)');
});

test('a disabled selected box keeps the fade while selected-disabled is silent, and an answered one stops the fade on its own part', () => {
  const box = SLOTS['choices-box-fill-selected-disabled'];
  assert.equal(box?.optional, true);
  assert.equal(box?.default, undefined, 'the default answers no selected-disabled slot');
  assert.equal(memberValue(CATALOGUE.slots, 'ArenaCheckbox.box', 'choices-box-fill-selected-disabled', 'tailwind'),
    'var(--choices-box-fill-selected-disabled,var(--choices-box-fill-selected,var(--fill-control-on)))');
  for (const state of ['disabled', 'selected-disabled']) {
    for (const stem of ['choices-knob-fill', 'choices-knob-ink', 'choices-knob-edge', 'choices-mark-ink']) {
      assert.equal(SLOTS[`${stem}-${state}`], undefined, `${stem}-${state}: a part drawn inside a faded part derives no disabled state (D72)`);
    }
  }
  assert.deepEqual(CATALOGUE.slots.members?.['ArenaSwitch.knob']?.states, ['rest', 'selected'], 'a disabled off knob reads its knob at rest and fades with its track');
  assert.deepEqual(fadeMarkers(Object.keys(SLOTS), CATALOGUE.slots).map(([marker]) => marker).filter((marker) => /^--choices-(knob|mark)-/.test(marker)), [],
    'no knob or mark marker is written, since nothing reads it');
  assert.deepEqual(fadeMarkers([], CATALOGUE.slots), [], 'nothing answered, nothing stops the fade');
  assert.deepEqual(fadeMarkers(['choices-box-fill-selected-disabled'], CATALOGUE.slots), [['--choices-box-fade-selected-disabled', '1']]);
  const roles = rolesFor(null, CATALOGUE, 'dark');
  const colors = coloursOf('dark');
  const at = (name: string) => slotColour(CATALOGUE.slots, name, new Map(), roles, colors, LEVELS, mixOf(roles), colors['base-100'] as string);
  assert.equal(at('choices-box-fill-selected-disabled'), at('choices-box-fill-selected'));
  const manifestOf = (path: string) => JSON.parse(readFileSync(join(repoRoot, 'frameworks/tailwind/components/forms', path), 'utf8'));
  for (const [path, part] of [['arena-checkbox/ArenaCheckbox.manifest.json', 'box'], ['arena-radio/ArenaRadio.manifest.json', 'ring']] as const) {
    const m = manifestOf(path);
    assert.doesNotMatch(m.variants.disabled.true.root ?? '', /opacity-/, `${path}: the root carries no fade, each part carries its own`);
    assert.match(m.variants.disabled.true[part], /opacity-\[var\(--choices-box-fade-disabled,var\(--fade-disabled\)\)\]/, `${path}: an answered disabled box stops its own fade`);
    assert.match(m.compoundVariants[0].class[part], /opacity-\[var\(--choices-box-fade-selected-disabled,var\(--fade-disabled\)\)\]/, `${path}: an answered selected-disabled box stops its own fade`);
  }
  const sw = manifestOf('arena-switch/ArenaSwitch.manifest.json');
  assert.match(sw.slots.track, /disabled:opacity-\[var\(--choices-box-fade-disabled,var\(--fade-disabled\)\)\]/, 'a native track fades under disabled:');
});

test('an answer that sinks the box under its white mark is reported below 3:1', () => {
  const plugin = readPlugin('default', JSON.parse(readFileSync(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json'), 'utf8')));
  const roles = rolesFor(plugin, CATALOGUE, 'light');
  const answers = new Map([['choices-box-fill-selected', 'var(--fill-surface)']]);
  const lines = slotReports(CATALOGUE.slots, answers, roles, coloursOf('light'), 'light', LEVELS).map((one) => one.message)
    .filter((line) => line.startsWith('--choices-mark-ink-selected measures '));
  assert.ok(lines.length > 0, 'the white mark over fill-surface is reported');
  assert.ok(lines.every((line) => / over --choices-box-fill-selected in the selected state of the light theme, below 3:1 \(WCAG 1\.4\.11\)/.test(line)), lines.join('\n'));
});

test('every fields ink clears AA over every ground in the default', () => {
  const shipped = slotPairs(CATALOGUE.slots);
  const grounded = ['fields-required-ink-rest', 'fields-error-status-ink-rest', 'fields-valid-status-ink-rest', 'fields-error-ink-rest', 'fields-neutral-counter-ink-rest', 'fields-warning-counter-ink-rest'];
  for (const slot of grounded) assert.ok(shipped.some((pair) => pair.slot === slot && pair.over === 'ground' && pair.min === 4.5), `${slot} is measured over every ground at 4.5:1`);
  assert.ok(shipped.some((pair) => pair.slot === 'fields-value-ink-rest' && pair.over === 'fields-value-fill-rest' && pair.min === 4.5), 'the text of every field is measured over its transparent fill, so over every ground');
  assert.ok(shipped.some((pair) => pair.slot === 'fields-stepper-ink-hover' && pair.over === 'fields-stepper-fill-hover' && pair.min === 4.5));
  for (const theme of ['dark', 'light'] as const) {
    const plugin = readPlugin('default', JSON.parse(readFileSync(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json'), 'utf8')));
    const roles = rolesFor(plugin, CATALOGUE, theme);
    const answers = new Map([...roles].filter(([name]) => Object.hasOwn(SLOTS, name)));
    const fields = slotReports(CATALOGUE.slots, answers, roles, coloursOf(theme), theme, LEVELS).map((one) => one.message).filter((line) => line.startsWith('--fields-'));
    assert.deepEqual(fields, [], `${theme}: the default plugin draws every fields pair above its floor`);
    assert.deepEqual(unresolvedPairs(CATALOGUE.slots, answers, roles, coloursOf(theme), LEVELS).filter((pair) => pair.slot.startsWith('fields-')), [], `${theme}: every fields pair resolves`);
  }
});

test('the menu destructive press clears AA over every ground', () => {
  const shipped = slotPairs(CATALOGUE.slots);
  assert.ok(shipped.some((pair) => pair.slot === 'menus-destructive-item-ink-pressed' && pair.over === 'menus-destructive-item-fill-pressed' && pair.min === 4.5));
  for (const theme of ['dark', 'light'] as const) {
    const plugin = readPlugin('default', JSON.parse(readFileSync(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json'), 'utf8')));
    const roles = rolesFor(plugin, CATALOGUE, theme);
    const answers = new Map([...roles].filter(([name]) => Object.hasOwn(SLOTS, name)));
    const menus = slotReports(CATALOGUE.slots, answers, roles, coloursOf(theme), theme, LEVELS).map((one) => one.message).filter((line) => line.startsWith('--menus-'));
    assert.deepEqual(menus, [], `${theme}: the default plugin draws every menus pair above its floor`);
  }
});

test('the selected edge clears 3:1 over the selected wash, hovered and pressed too', () => {
  const states = ['selected', 'selected-hover', 'selected-pressed'];
  for (const state of states) assert.ok(slotPairs(CATALOGUE.slots).some((pair) => pair.slot === `navigation-item-edge-${state}` && pair.over === `navigation-item-fill-${state}` && pair.min === 3), state);
  const figures: Record<string, number[]> = {};
  for (const theme of ['dark', 'light'] as const) {
    const plugin = readPlugin('default', JSON.parse(readFileSync(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json'), 'utf8')));
    const roles = rolesFor(plugin, CATALOGUE, theme);
    const answers = new Map([...roles].filter(([name]) => Object.hasOwn(SLOTS, name)));
    const colors = coloursOf(theme);
    for (const state of states) for (const ground of ['base-100', 'base-200']) {
      const under = slotColour(CATALOGUE.slots, `navigation-item-fill-${state}`, answers, roles, colors, LEVELS, mixOf(roles), colors[ground] as string) as string;
      (figures[state] ??= []).push(Number(contrast(slotColour(CATALOGUE.slots, `navigation-item-edge-${state}`, answers, roles, colors, LEVELS, mixOf(roles), under) as string, under).toFixed(2)));
    }
  }
  for (const state of states) assert.ok(figures[state]!.every((one) => one >= 3), `${state}: ${figures[state]!.join(', ')}`);
  const near = (got: number[], want: number[]) => got.every((one, i) => Math.abs(one - want[i]!) <= 0.02);
  assert.ok(near(figures.selected!, [4.38, 4.05, 5.04, 4.64]), `F4: ${figures.selected!.join(', ')}`);
  assert.ok(near(figures['selected-pressed']!, [3.37, 3.11, 4.48, 4.13]), `D85: ${figures['selected-pressed']!.join(', ')}`);
});
