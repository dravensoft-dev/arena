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

test('actions derives 124 slots and no component slot', () => {
  const c = deriveSlots(readSlotDeclarations());
  const slots = Object.values(c.slots);
  assert.equal(slots.filter((slot) => slot.group === 'actions').length, 124);
  assert.deepEqual([...new Set(slots.map((slot) => slot.group))].sort(), ['actions', 'choices', 'fields']);
  for (const slot of slots) {
    for (const key of ['scope', 'family', 'component', 'draws']) assert.equal(Object.hasOwn(slot, key), false, key);
  }
  assert.equal(Object.hasOwn(c, 'families'), false);
  for (const key of ['ArenaButton.root', 'ArenaFileInput.trigger', 'ArenaIconButton.root', 'ArenaSplitButton.caret', 'ArenaSplitButton.primary']) assert.ok(c.members[key], key);
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

test('a part may declare its own selected answers', () => {
  const d = fixture();
  d.groups!.actions!.parts.dismiss!.states = 'selectable';
  d.groups!.actions!.parts.dismiss!.selected = { fill: { role: '{own-fill}', level: 'level-own' }, ink: '{own-ink}' };
  const s = deriveSlots(d).slots;
  assert.equal(s['actions-dismiss-fill-selected']?.default, '{own-fill}');
  assert.equal(s['actions-dismiss-fill-selected']?.level, 'level-own');
  assert.equal(s['actions-dismiss-ink-selected']?.default, '{own-ink}');
  assert.equal(s['actions-dismiss-icon-selected']?.default, '{actions-dismiss-ink-selected}');
  assert.deepEqual(s['actions-dismiss-fill-selected-hover']?.derive, { from: 'actions-dismiss-fill-selected', mix: 'mix-hover' });
  assert.equal(s['actions-calm-root-fill-selected']?.default, '{fill-selected}', 'the top-level answer is the fallback');
});

test('an exception may carry a level', () => {
  const d = fixture();
  d.exceptions['actions-calm-root-ink-hover'] = { default: '{ink-body}', decision: 'D19', level: 'level-ink-body' };
  d.exceptions['actions-calm-root-ink-rest'] = { default: '{ink-quiet}', decision: 'D19' };
  const s = deriveSlots(d).slots;
  assert.equal(s['actions-calm-root-ink-hover']?.default, '{ink-body}');
  assert.equal(s['actions-calm-root-ink-hover']?.level, 'level-ink-body');
  assert.equal(s['actions-calm-root-ink-rest']?.level, undefined, 'an exception with no level takes none');
  assert.equal(s['actions-calm-root-icon-rest']?.level, undefined, 'its icon follows');
  assert.equal(s['actions-calm-root-icon-hover']?.level, 'level-ink-body', 'the icon carries its ink level');
});

test('a part with no fill sits its ink and icon on the ground, and a part with on sits its fill on its sibling and its glyph on its own fill', () => {
  const d = fixture();
  d.groups!.actions!.parts.close = { properties: ['ink', 'icon'], states: 'base', rest: { ink: '{i-quiet}', icon: 'ink' } };
  d.groups!.actions!.parts.dismiss!.on = 'root';
  const s = deriveSlots(d).slots;
  assert.equal(s['actions-close-ink-rest']?.on, 'ground');
  assert.equal(s['actions-close-icon-hover']?.on, 'ground');
  assert.equal(s['actions-dismiss-ink-hover']?.on, 'actions-dismiss-fill-hover', 'a glyph sits on its own part\'s fill (D69)');
  assert.equal(s['actions-dismiss-fill-hover']?.on, 'actions-root-fill-hover');
});

test('a halo and a member axis enter the catalogue', () => {
  const d = fixture();
  (d.groups!.actions!.parts.root!.options as Record<string, { halo?: string }>).calm!.halo = 'level-halo';
  (d.members!.ArenaKnob!.parts.root as { optionBy?: unknown; selectedBy?: unknown }).optionBy = { axis: 'state', values: { danger: 'danger' } };
  (d.members!.ArenaKnob!.parts.root as { optionBy?: unknown; selectedBy?: unknown }).selectedBy = { axis: 'on', value: 'true' };
  const c = deriveSlots(d);
  assert.deepEqual(c.halos, { 'actions-calm-root': 'level-halo' });
  assert.deepEqual(c.members['ArenaKnob.root']?.optionBy, { axis: 'state', values: { danger: 'danger' } });
  assert.deepEqual(c.members['ArenaKnob.root']?.selectedBy, { axis: 'on', value: 'true' });
  assert.equal(Object.hasOwn(deriveSlots(fixture()), 'halos'), false, 'no halo, no key');
});

test('actions.dismiss derives its slots with no option segment', () => {
  const c = deriveSlots(readSlotDeclarations());
  const names = Object.keys(c.slots).filter((n) => n.startsWith('actions-dismiss-'));
  assert.equal(names.length, 12);
  assert.ok(names.every((n) => /^actions-dismiss-(fill|ink|icon)-(rest|hover|pressed|disabled)$/.test(n)), names.join(', '));
  const hover = c.slots['actions-dismiss-ink-hover'] as { default?: string; level?: string; derive?: unknown };
  assert.equal(hover.default, '{ink-body}');
  assert.equal(hover.level, 'level-ink-body');
  assert.equal(hover.derive, undefined);
  assert.equal((c.slots['actions-dismiss-icon-hover'] as { level?: string }).level, 'level-ink-body');
  assert.deepEqual(c.members['ArenaAlert.close'], { to: 'actions.dismiss', options: [], states: ['rest', 'hover', 'pressed', 'disabled'] });
  assert.equal(c.members['ArenaCalendar.nav']?.inline, true);
  assert.deepEqual(c.members['ArenaConfirmDialog.confirm']?.optionBy, { axis: 'destructive', values: { true: 'destructive', false: 'primary' } });
});

test('choices derives its slots', () => {
  const c = deriveSlots(readSlotDeclarations());
  const names = Object.keys(c.slots).filter((n) => n.startsWith('choices-'));
  const toggle = ['rest', 'selected', 'disabled', 'selected-disabled'];
  const segment = ['rest', 'hover', 'pressed', 'selected', 'selected-hover', 'selected-pressed'];
  const want = [
    ...['fill', 'edge'].flatMap((p) => toggle.map((s) => `choices-box-${p}-${s}`)),
    'choices-mark-ink-selected',
    ...['fill', 'ink', 'edge'].flatMap((p) => ['rest', 'selected'].map((s) => `choices-knob-${p}-${s}`)),
    ...['fill', 'ink'].flatMap((p) => segment.map((s) => `choices-segment-${p}-${s}`)),
    'choices-track-fill-rest', 'choices-track-edge-rest',
  ];
  assert.deepEqual([...names].sort(), [...want].sort());
  assert.equal(c.slots['choices-box-fill-selected']?.on, 'choices-box-fill-rest');
  assert.equal(c.slots['choices-box-fill-selected']?.default, '{fill-control-on}');
  assert.equal(c.slots['choices-box-edge-selected']?.default, 'transparent');
  assert.equal(c.slots['choices-knob-fill-rest']?.on, 'choices-box-fill-rest');
  assert.equal(c.slots['choices-knob-fill-rest']?.default, '{fill-knob-off}');
  assert.equal(c.slots['choices-knob-fill-selected']?.default, '{fill-knob}');
  assert.equal(c.slots['choices-mark-ink-selected']?.on, 'choices-box-fill-selected');
  assert.equal(c.slots['choices-knob-ink-rest']?.on, 'choices-knob-fill-rest', 'a glyph sits on its own part\'s fill (D69)');
  assert.equal(c.slots['choices-knob-ink-selected']?.on, 'choices-knob-fill-selected');
  assert.equal(c.slots['choices-knob-edge-selected']?.on, 'choices-box-fill-selected');
  assert.equal(c.slots['choices-mark-ink-selected-disabled'], undefined, 'the mark fades with its box (D72)');
  assert.equal(c.slots['choices-knob-fill-disabled'], undefined, 'the knob fades with its track (D72)');
  const hover = c.slots['choices-segment-ink-hover'];
  assert.equal(hover?.default, '{ink-body}');
  assert.equal(hover?.level, 'level-ink-body');
  assert.equal(c.slots['choices-segment-ink-rest']?.level, 'level-ink-muted');
  assert.deepEqual(c.members['ArenaSlider.fill'], { to: 'choices.box', options: [], states: ['selected'] });
  assert.deepEqual(c.members['ArenaCheckbox.box']?.selectedBy, { axis: 'checked', value: 'true' });
  assert.deepEqual(c.members['ArenaCheckbox.box']?.disabledBy, { axis: 'disabled', value: 'true' }, 'a span reads its disabled states in the disabled branch (D71)');
  assert.equal(c.members['ArenaSwitch.track']?.disabledBy, undefined, 'a native control reads them under disabled:');
  assert.deepEqual(c.members['ArenaCheckbox.check']?.states, ['selected']);
  assert.equal(c.members['ArenaSlider.track'], undefined, 'the track paints no colour');
  assert.deepEqual(c.members['ArenaSwitch.icon']?.to, 'choices.knob');
});

test('fields derives its slots', () => {
  const c = deriveSlots(readSlotDeclarations());
  const names = Object.keys(c.slots).filter((n) => n.startsWith('fields-'));
  const field = ['rest', 'hover', 'disabled'];
  const base = ['rest', 'hover', 'pressed', 'disabled'];
  const want = [
    ...['neutral', 'error', 'valid'].flatMap((o) => ['fill', 'edge'].flatMap((p) => field.map((s) => `fields-${o}-field-${p}-${s}`))),
    ...['rest', 'disabled'].map((s) => `fields-readonly-field-fill-${s}`),
    'fields-value-fill-rest', 'fields-value-ink-rest', 'fields-required-ink-rest',
    'fields-error-status-ink-rest', 'fields-valid-status-ink-rest', 'fields-error-ink-rest',
    'fields-neutral-counter-ink-rest', 'fields-warning-counter-ink-rest',
    ...['fill', 'edge', 'ink'].flatMap((p) => base.map((s) => `fields-stepper-${p}-${s}`)),
  ];
  assert.deepEqual([...names].sort(), [...want].sort());
  assert.equal(c.slots['fields-neutral-field-fill-rest']?.default, '{fill-field}');
  assert.equal(c.slots['fields-neutral-field-edge-rest']?.default, '{edge-field}');
  assert.equal(Object.values(c.slots).some((s) => s.part === 'field' && s.property === 'ink'), false, 'every field text reads fields.value (D74)');
  assert.equal(c.slots['fields-readonly-field-fill-hover'], undefined, 'a readonly field does not hover (D73)');
  assert.equal(c.slots['fields-error-field-edge-rest']?.default, '{edge-invalid}');
  assert.equal(c.slots['fields-valid-field-edge-rest']?.default, '{hue-success-edge}');
  assert.equal(c.slots['fields-readonly-field-fill-rest']?.default, '{fill-surface}');
  assert.deepEqual(c.halos, { 'fields-error-field': 'level-hue-soft-danger', 'fields-valid-field': 'level-hue-soft-success' });
  for (const o of ['neutral', 'error', 'valid']) assert.equal(c.slots[`fields-${o}-field-fill-hover`]?.default, '{fill-hover}', `${o}: the hover fill is the group's exception (D19)`);
  assert.equal(c.slots['fields-neutral-field-edge-hover']?.derive?.from, 'fields-neutral-field-edge-rest');
  assert.equal(c.slots['fields-required-ink-rest']?.default, '{accent-primary-ink}');
  assert.equal(c.slots['fields-required-ink-rest']?.on, 'ground', 'an ink with no fill sits on the ground');
  assert.equal(c.slots['fields-valid-status-ink-rest']?.default, '{hue-success-ink}');
  assert.equal(c.slots['fields-warning-counter-ink-rest']?.default, '{hue-warning-ink}');
  assert.equal(c.slots['fields-neutral-counter-ink-rest']?.level, 'level-ink-muted');
  assert.equal(c.slots['fields-stepper-ink-hover']?.default, '{ink-body}');
  assert.equal(c.slots['fields-stepper-ink-hover']?.level, 'level-ink-body');
  assert.equal(c.slots['fields-stepper-fill-hover']?.default, '{fill-hover}');
  assert.equal(c.slots['fields-value-ink-disabled'], undefined, 'a value fades with its field (D72)');
  assert.equal(Object.values(c.slots).some((s) => s.group === 'fields' && s.channel !== undefined), false, 'no fields part declares a channel');
  assert.deepEqual(Object.keys(c.members).filter((k) => c.members[k]!.to.startsWith('fields.')).length, 34);
  assert.deepEqual(c.members['ArenaInput.field']?.optionBy, [
    { axis: 'state', values: { neutral: 'neutral', error: 'error', valid: 'valid' } }, { axis: 'readOnly', values: { true: 'readonly' } },
  ]);
  for (const key of ['ArenaSelect.field', 'ArenaTextarea.field', 'ArenaPinInput.cell', 'ArenaConfirmDialog.input']) assert.equal(c.members[key]?.inkFrom, 'fields.value', `${key} reads its text from fields.value (D74)`);
  assert.deepEqual(c.members['ArenaFileInput.zone']?.onlyBy, { axis: 'droppable', value: 'true' }, 'the zone paints its field only where it is droppable');
  assert.deepEqual(c.members['ArenaFileInput.zone']?.optionBy, { axis: 'state', values: { neutral: 'neutral', error: 'error' } });
  assert.deepEqual(c.members['ArenaInput.field']?.disabledBy, { axis: 'disabled', value: 'true' }, 'a div field reads its disabled states in its branch (D71)');
  assert.equal(c.members['ArenaTextarea.field']?.disabledBy, undefined, 'a native textarea reads them under disabled:');
  assert.deepEqual(c.members['ArenaFileInput.zone']?.hoverBy, { axis: 'dragging', value: 'true' }, 'dragging over the zone is the field\'s hover (D68)');
  assert.deepEqual(c.members['ArenaCommandPalette.search']?.properties, ['edge']);
  assert.deepEqual(c.members['ArenaConfirmDialog.input']?.optionBy, { axis: 'invalid', values: { false: 'neutral', true: 'error' } });
  assert.deepEqual(c.members['ArenaTextarea.counter']?.optionBy, { axis: 'near', values: { false: 'neutral', true: 'warning' } });
});
