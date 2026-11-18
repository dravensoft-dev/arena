import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_KEYS, deriveSlots, readSlotDeclarations } from './color-slots.ts';
import type { SlotDeclarations } from './color-slots.ts';
import { SLOT_STATES } from '../../generate/core/arena-cli/slots.ts';

const fixture = (): SlotDeclarations => ({
  accepts: { fill: ['f-*'], ink: ['i-*'], edge: ['e-*', 'transparent'], icon: ['i-*'] },
  refused: [],
  states: [...SLOT_STATES],
  stateSets: {
    rest: ['rest'],
    base: ['rest', 'hover', 'pressed', 'disabled'],
    selectable: ['rest', 'hover', 'pressed', 'disabled', 'selected', 'selected-hover', 'selected-pressed', 'selected-disabled'],
  },
  selected: { fill: { role: '{fill-selected}', level: 'level-sel' }, ink: { role: '{ink-selected}' }, edge: { role: '{edge-selected}' } },
  families: {
    tone: {
      channel: '--arena-tone-{property}',
      options: {
        calm: { states: 'selectable', parts: { root: { fill: '{tone-calm-fill}', ink: { role: '{tone-calm-ink}', level: 'level-ink' }, edge: 'transparent', icon: 'ink' as never } } },
      },
    },
  },
  variants: { danger: { decision: 'R6', rest: { fill: '{d-fill}', ink: '{d-ink}', edge: '{d-edge}', icon: 'ink' as never } } },
  components: {
    ArenaKnob: { root: { family: 'tone', options: ['calm'], states: 'base', variants: ['danger'] } },
    ArenaPin: { root: { family: 'tone', options: ['calm'], states: 'selectable', edgeChannel: '--arena-emphasis-icon-edge', own: { edge: { calm: '{pin-edge}' } } } },
    ArenaDrawer: { root: { draws: 'ArenaKnob.root', states: 'base' } },
  },
  exceptions: {},
  rings: { 'ArenaKnob.root': 'ground' },
});

test('an icon follows the ink of its own part and state', () => {
  const s = deriveSlots(fixture()).slots;
  assert.equal(s['tone-calm-root-icon-hover']?.default, '{tone-calm-root-ink-hover}');
  assert.equal(s['tone-calm-root-icon-rest']?.level, s['tone-calm-root-ink-rest']?.level);
  assert.equal(s['tone-calm-root-icon-rest']?.level, 'level-ink');
});

test('a fill mixes at pressed, selected-hover and selected-pressed, never at hover', () => {
  const s = deriveSlots(fixture()).slots;
  assert.deepEqual(s['tone-calm-root-fill-pressed']?.derive, { from: 'tone-calm-root-fill-rest', mix: 'mix-pressed' });
  assert.deepEqual(s['tone-calm-root-fill-selected-hover']?.derive, { from: 'tone-calm-root-fill-selected', mix: 'mix-hover' });
  assert.deepEqual(s['tone-calm-root-fill-selected-pressed']?.derive, { from: 'tone-calm-root-fill-selected', mix: 'mix-pressed' });
  assert.deepEqual(s['tone-calm-root-fill-hover']?.derive, { from: 'tone-calm-root-fill-rest' });
});

test('selected takes the declared selected answers', () => {
  const s = deriveSlots(fixture()).slots;
  assert.equal(s['tone-calm-root-fill-selected']?.default, '{fill-selected}');
  assert.equal(s['tone-calm-root-fill-selected']?.level, 'level-sel');
  assert.equal(s['tone-calm-root-edge-selected']?.default, '{edge-selected}');
});

test('disabled states are optional with no default', () => {
  const s = deriveSlots(fixture()).slots;
  for (const n of ['tone-calm-root-fill-disabled', 'tone-calm-root-ink-selected-disabled']) {
    assert.equal(s[n]?.optional, true);
    assert.equal(s[n]?.default, undefined);
    assert.equal(s[n]?.derive, undefined);
  }
});

test('an exception replaces what the rule gives', () => {
  const d = fixture();
  d.exceptions['tone-calm-root-fill-hover'] = { default: '{tone-calm-fill-hover}', decision: 'D19' };
  const slot = deriveSlots(d).slots['tone-calm-root-fill-hover'];
  assert.equal(slot?.default, '{tone-calm-fill-hover}');
  assert.equal(slot?.derive, undefined);
});

test('a component slot falls to the family slot of its option, property and state', () => {
  const s = deriveSlots(fixture()).slots;
  const slot = s['knob-calm-root-ink-pressed'];
  assert.equal(slot?.default, '{tone-calm-root-ink-pressed}');
  assert.equal(slot?.channel, '--arena-emphasis-ink-pressed');
  assert.equal(slot?.on, 'knob-calm-root-fill-pressed');
  assert.equal(s['knob-calm-root-fill-disabled']?.optional, true);
  assert.equal(s['knob-calm-root-fill-disabled']?.default, '{tone-calm-root-fill-disabled}');
});

test('own, variants and draws build their slots', () => {
  const s = deriveSlots(fixture()).slots;
  assert.equal(s['pin-calm-root-edge-rest']?.default, '{pin-edge}');
  assert.equal(s['pin-calm-root-edge-rest']?.channel, '--arena-emphasis-icon-edge');
  assert.equal(s['pin-calm-root-edge-hover']?.derive?.from, 'pin-calm-root-edge-rest');
  assert.equal(s['pin-calm-root-edge-selected']?.default, '{edge-selected}');
  assert.equal(s['knob-danger-root-fill-rest']?.default, '{d-fill}');
  assert.equal(s['knob-danger-root-fill-rest']?.channel, undefined);
  assert.equal(s['drawer-calm-root-ink-hover']?.default, '{knob-calm-root-ink-hover}');
  assert.equal(s['drawer-calm-root-ink-hover']?.draws, 'ArenaKnob.root');
  assert.equal(s['drawer-calm-root-ink-hover']?.on, 'drawer-calm-root-fill-hover');
  assert.equal(s['drawer-calm-root-fill-selected'], undefined);
});

test('an exception naming no slot throws', () => {
  const d = fixture();
  d.exceptions['tone-calm-root-fill-nowhere'] = { default: '{x}', decision: 'D1' };
  assert.throws(() => deriveSlots(d), /tone-calm-root-fill-nowhere/);
});

test('an icon at selected with no declared selected ink throws, naming the slot', () => {
  const d = fixture();
  d.families.tone!.options!.calm!.parts.root = { fill: '{tone-calm-fill}', icon: 'ink' as never };
  delete d.selected.ink;
  assert.throws(() => deriveSlots(d), /tone-calm-root-icon-selected: no selected answer for ink/);
});

test('a component slot whose family target does not exist throws, naming the slot', () => {
  const d = fixture();
  (d.components.ArenaKnob as Record<string, { options: string[] }>).root!.options = ['loud'];
  assert.throws(() => deriveSlots(d), /knob-loud-root-fill-rest/);
});

test('the shipped declarations derive slots in name order with SLOT_KEYS field order', () => {
  const slots = deriveSlots(readSlotDeclarations()).slots;
  const names = Object.keys(slots);
  assert.equal(names.length, 396);
  assert.deepEqual(names, [...names].sort());
  for (const slot of Object.values(slots)) {
    const keys = Object.keys(slot);
    assert.deepEqual(keys, SLOT_KEYS.filter((k) => keys.includes(k)));
  }
});

test('a draws naming a part that builds no slot throws, naming the drawer', () => {
  const d = fixture();
  d.components.ArenaDrawer!.root!.draws = 'ArenaNope.root';
  assert.throws(() => deriveSlots(d), /ArenaDrawer\.root draws ArenaNope\.root, which builds no slot/);
});

test('an option or a component part with no states throws, naming its owner', () => {
  const a = fixture();
  delete (a.families.tone!.options!.calm as { states?: unknown }).states;
  assert.throws(() => deriveSlots(a), /tone-calm: no states/);
  const b = fixture();
  delete (b.components.ArenaKnob!.root as { states?: unknown }).states;
  assert.throws(() => deriveSlots(b), /ArenaKnob\.root: no states/);
});

test('a variant builds an icon only when it declares one', () => {
  const d = fixture();
  delete d.variants.danger!.rest.icon;
  const s = deriveSlots(d).slots;
  assert.equal(s['knob-danger-root-icon-rest'], undefined);
  assert.ok(s['knob-danger-root-ink-rest']);
});
