import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_KEYS, deriveSlots, readSlotDeclarations } from './color-slots.ts';
import type { SlotDeclarations } from './color-slots.ts';
import { SLOT_STATES } from '../../generate/core/arena-cli/slots.ts';

const fixture = (): SlotDeclarations => ({
  accepts: { fill: ['f-*', 'transparent'], ink: ['i-*'], edge: ['e-*', 'transparent'], icon: ['i-*'] },
  refused: [],
  states: [...SLOT_STATES],
  stateSets: {
    base: ['rest', 'hover', 'pressed', 'disabled'],
    selectable: ['rest', 'hover', 'pressed', 'disabled', 'selected', 'selected-hover', 'selected-pressed', 'selected-disabled'],
  },
  selected: { fill: { role: '{fill-selected}', level: 'level-sel' }, ink: { role: '{ink-selected}' }, edge: { role: '{edge-selected}' } },
  groups: {
    actions: {
      parts: {
        root: {
          properties: ['fill', 'ink', 'edge', 'icon'],
          channel: '--arena-tone-{property}',
          options: {
            calm: { states: 'selectable', rest: { fill: '{tone-calm-fill}', ink: { role: '{tone-calm-ink}', level: 'level-ink' }, edge: 'transparent', icon: 'ink' } },
            danger: { states: 'base', channel: null, decision: 'R6', rest: { fill: '{d-fill}', ink: '{d-ink}', edge: '{d-edge}', icon: 'ink' } },
          },
        },
        dismiss: { properties: ['fill', 'ink', 'icon'], states: 'base', channel: '--arena-dismiss-{property}', rest: { fill: 'transparent', ink: '{i-quiet}', icon: 'ink' } },
        close: { properties: ['fill', 'ink'], states: 'base' },
      },
    },
  },
  members: {
    ArenaKnob: { group: 'actions', parts: { root: { to: 'actions.root', options: ['calm', 'danger'], states: 'base' } } },
    ArenaPin: {
      group: 'actions',
      parts: { root: { to: 'actions.root', options: ['calm'], states: 'selectable', channels: { edge: '--arena-pin-edge' }, defaults: { 'actions-calm-root-edge-rest': '{pin-edge}' }, decision: 'D21' } },
    },
    ArenaChip: { group: 'actions', parts: { root: 'actions.close', label: null } },
  },
  exceptions: {},
  rings: { 'ArenaKnob.root': 'ground' },
});

test('an icon follows the ink of its own part and state', () => {
  const s = deriveSlots(fixture()).slots;
  assert.equal(s['actions-calm-root-icon-hover']?.default, '{actions-calm-root-ink-hover}');
  assert.equal(s['actions-calm-root-icon-rest']?.level, s['actions-calm-root-ink-rest']?.level);
  assert.equal(s['actions-calm-root-icon-rest']?.level, 'level-ink');
});

test('a fill mixes at pressed, selected-hover and selected-pressed, never at hover', () => {
  const s = deriveSlots(fixture()).slots;
  assert.deepEqual(s['actions-calm-root-fill-pressed']?.derive, { from: 'actions-calm-root-fill-rest', mix: 'mix-pressed' });
  assert.deepEqual(s['actions-calm-root-fill-selected-hover']?.derive, { from: 'actions-calm-root-fill-selected', mix: 'mix-hover' });
  assert.deepEqual(s['actions-calm-root-fill-selected-pressed']?.derive, { from: 'actions-calm-root-fill-selected', mix: 'mix-pressed' });
  assert.deepEqual(s['actions-calm-root-fill-hover']?.derive, { from: 'actions-calm-root-fill-rest' });
});

test('selected takes the declared selected answers', () => {
  const s = deriveSlots(fixture()).slots;
  assert.equal(s['actions-calm-root-fill-selected']?.default, '{fill-selected}');
  assert.equal(s['actions-calm-root-fill-selected']?.level, 'level-sel');
  assert.equal(s['actions-calm-root-edge-selected']?.default, '{edge-selected}');
});

test('disabled states are optional with no default', () => {
  const s = deriveSlots(fixture()).slots;
  for (const n of ['actions-calm-root-fill-disabled', 'actions-calm-root-ink-selected-disabled']) {
    assert.equal(s[n]?.optional, true);
    assert.equal(s[n]?.default, undefined);
    assert.equal(s[n]?.derive, undefined);
  }
});

test('an exception replaces what the rule gives', () => {
  const d = fixture();
  d.exceptions['actions-calm-root-fill-hover'] = { default: '{tone-calm-fill-hover}', decision: 'D19' };
  const slot = deriveSlots(d).slots['actions-calm-root-fill-hover'];
  assert.equal(slot?.default, '{tone-calm-fill-hover}');
  assert.equal(slot?.derive, undefined);
});

test('a group slot carries its group, option, part and channel, and an option with a null channel carries none', () => {
  const s = deriveSlots(fixture()).slots;
  assert.deepEqual(s['actions-calm-root-ink-pressed'], {
    group: 'actions', option: 'calm', part: 'root', property: 'ink', state: 'pressed', channel: '--arena-tone-ink-pressed', accepts: 'ink',
    on: 'actions-calm-root-fill-pressed', derive: { from: 'actions-calm-root-ink-rest' },
  });
  assert.equal(s['actions-danger-root-fill-rest']?.default, '{d-fill}');
  assert.equal(s['actions-danger-root-fill-rest']?.channel, undefined);
  assert.equal(s['actions-danger-root-fill-selected'], undefined, 'a base option builds no selected slot');
});

test('actions derives 112 slots and no component slot', () => {
  const c = deriveSlots(readSlotDeclarations());
  const slots = Object.values(c.slots);
  assert.equal(slots.length, 112);
  for (const slot of slots) {
    assert.equal(slot.group, 'actions');
    for (const key of ['scope', 'family', 'component', 'draws']) assert.equal(Object.hasOwn(slot, key), false, key);
  }
  assert.equal(Object.hasOwn(c, 'families'), false);
  assert.deepEqual(Object.keys(c.members).sort(), ['ArenaButton.root', 'ArenaFileInput.trigger', 'ArenaIconButton.root', 'ArenaSplitButton.caret', 'ArenaSplitButton.primary']);
  assert.deepEqual(c.members['ArenaIconButton.root']?.defaults, { 'actions-ghost-root-edge-rest': '{emphasis-ghost-icon-edge}' });
  assert.deepEqual(c.members['ArenaFileInput.trigger']?.states, ['rest', 'hover', 'pressed']);
});

test('a group part with no rest answers derives no slot', () => {
  const s = deriveSlots(fixture()).slots;
  assert.deepEqual(Object.keys(s).filter((n) => n.startsWith('actions-close-')), []);
  const c = deriveSlots(fixture());
  assert.deepEqual(c.groups.actions?.parts, ['root', 'dismiss', 'close']);
  assert.equal(c.members['ArenaChip.root'], undefined, 'a member part mapped as a string enters no catalogue member');
});

test('an option with no axis drops its segment', () => {
  const s = deriveSlots(fixture()).slots;
  const slot = s['actions-dismiss-ink-hover'];
  assert.ok(slot, Object.keys(s).filter((n) => n.includes('dismiss')).join(' '));
  assert.equal(slot.option, undefined);
  assert.equal(slot.on, 'actions-dismiss-fill-hover');
  assert.equal(slot.channel, '--arena-dismiss-ink-hover');
  assert.equal(s['actions-dismiss-icon-rest']?.default, '{actions-dismiss-ink-rest}');
});

test('a member part enters the catalogue with its resolved states, channels and defaults', () => {
  const c = deriveSlots(fixture());
  assert.deepEqual(c.members['ArenaPin.root'], {
    to: 'actions.root', options: ['calm'], states: ['rest', 'hover', 'pressed', 'disabled', 'selected', 'selected-hover', 'selected-pressed', 'selected-disabled'],
    channels: { edge: '--arena-pin-edge' }, defaults: { 'actions-calm-root-edge-rest': '{pin-edge}' },
  });
});

test('a member default naming no slot the group builds throws, naming the member', () => {
  const d = fixture();
  (d.members!.ArenaPin!.parts.root as { defaults: Record<string, string> }).defaults = { 'actions-calm-root-edge-nowhere': '{pin-edge}' };
  assert.throws(() => deriveSlots(d), /ArenaPin\.root: its default actions-calm-root-edge-nowhere names no slot/);
});

test('an exception naming no slot throws', () => {
  const d = fixture();
  d.exceptions['actions-calm-root-fill-nowhere'] = { default: '{x}', decision: 'D1' };
  assert.throws(() => deriveSlots(d), /actions-calm-root-fill-nowhere/);
});

test('an icon at selected with no declared selected ink throws, naming the slot', () => {
  const d = fixture();
  const root = d.groups!.actions!.parts.root!;
  (root.options as Record<string, { rest: Record<string, unknown> }>).calm!.rest = { fill: '{tone-calm-fill}', icon: 'ink' };
  delete d.selected.ink;
  assert.throws(() => deriveSlots(d), /actions-calm-root-icon-selected: no selected answer for ink/);
});

test('the shipped declarations derive slots in name order with SLOT_KEYS field order', () => {
  const slots = deriveSlots(readSlotDeclarations()).slots;
  const names = Object.keys(slots);
  assert.deepEqual(names, [...names].sort());
  for (const slot of Object.values(slots)) {
    const keys = Object.keys(slot);
    assert.deepEqual(keys, SLOT_KEYS.filter((k) => keys.includes(k)));
  }
});

test('an option or a group part with rest answers and no states throws, naming its owner', () => {
  const a = fixture();
  delete ((a.groups!.actions!.parts.root!.options as Record<string, { states?: unknown }>).calm as { states?: unknown }).states;
  assert.throws(() => deriveSlots(a), /actions-calm-root: no states/);
  const b = fixture();
  delete (b.groups!.actions!.parts.dismiss as { states?: unknown }).states;
  assert.throws(() => deriveSlots(b), /actions-dismiss: no states/);
});

test('an option builds an icon only when it declares one', () => {
  const d = fixture();
  delete (d.groups!.actions!.parts.root!.options as Record<string, { rest: Record<string, unknown> }>).danger!.rest.icon;
  const s = deriveSlots(d).slots;
  assert.equal(s['actions-danger-root-icon-rest'], undefined);
  assert.ok(s['actions-danger-root-ink-rest']);
});
