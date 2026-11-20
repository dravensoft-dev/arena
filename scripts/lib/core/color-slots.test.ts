import test from 'node:test';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
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
    ArenaChip: { group: 'actions', parts: { root: 'series', label: null } },
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
  assert.deepEqual([...new Set(slots.map((slot) => slot.group))].sort(), ['actions', 'choices', 'data', 'feedback', 'fields', 'marks', 'menus', 'meters', 'navigation', 'overlays', 'steps', 'surfaces', 'text']);
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
  assert.equal(c.members['ArenaChip.root'], undefined, 'a series member part enters no catalogue member');
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

test('menus, the disclosure and the link derive their slots', () => {
  const c = deriveSlots(readSlotDeclarations());
  const names = Object.keys(c.slots);
  const of = (prefix: string) => names.filter((n) => n.startsWith(prefix));
  const item = ['rest', 'hover', 'pressed', 'selected', 'disabled', 'selected-disabled'];
  assert.deepEqual(of('menus-').sort(), ['plain', 'destructive'].flatMap((o) => ['fill', 'ink', 'icon'].flatMap((p) => item.filter((s) => o === 'plain' || !s.startsWith('selected')).map((s) => `menus-${o}-item-${p}-${s}`))).sort());
  const base = ['rest', 'hover', 'pressed', 'disabled'];
  assert.deepEqual(of('navigation-disclosure-').sort(), ['fill', 'ink'].flatMap((p) => base.map((s) => `navigation-disclosure-${p}-${s}`)).sort());
  assert.deepEqual(of('navigation-quiet-link-').concat(of('navigation-plain-link-')).sort(), ['quiet', 'plain'].flatMap((o) => ['rest', 'hover'].map((s) => `navigation-${o}-link-ink-${s}`)).sort());
  assert.equal(c.slots['menus-destructive-item-ink-rest']?.default, '{hue-danger-ink}');
  assert.equal(c.slots['menus-plain-item-ink-rest']?.default, '{ink-body}');
  assert.equal(c.slots['menus-plain-item-ink-rest']?.level, 'level-ink-body');
  for (const o of ['plain', 'destructive']) assert.equal(c.slots[`menus-${o}-item-fill-hover`]?.default, '{fill-hover}', `${o}: the hover fill is the group's exception (D19)`);
  assert.equal(c.slots['navigation-disclosure-fill-hover']?.default, '{fill-hover}');
  assert.equal(c.slots['navigation-disclosure-ink-rest']?.default, '{ink-body}');
  assert.equal(c.slots['navigation-quiet-link-ink-rest']?.default, '{ink-muted}');
  assert.equal(c.slots['navigation-quiet-link-ink-hover']?.default, '{ink-body}');
  assert.equal(c.slots['navigation-quiet-link-ink-hover']?.level, 'level-ink-body');
  assert.equal(c.slots['navigation-plain-link-ink-rest']?.default, '{ink-link}');
  assert.equal(c.slots['navigation-plain-link-ink-hover']?.default, '{ink-heading}');
  assert.deepEqual(c.members['ArenaBreadcrumbs.crumb']?.hoverIn, { axis: 'linked', value: 'true' });
  assert.equal(c.members['ArenaAccordion.trigger']?.disabledModifier, 'aria-disabled:');
  assert.deepEqual(c.members['ArenaCombobox.option']?.selectedBy, { axis: 'active', value: 'true' });
  assert.deepEqual(c.members['ArenaMenu.item']?.optionBy, { axis: 'destructive', values: { false: 'plain', true: 'destructive' } });
});

test('navigation item and badge derive their slots', () => {
  const c = deriveSlots(readSlotDeclarations());
  const names = Object.keys(c.slots);
  const selectable = ['rest', 'hover', 'pressed', 'disabled', 'selected', 'selected-hover', 'selected-pressed', 'selected-disabled'];
  assert.deepEqual(names.filter((n) => n.startsWith('navigation-item-')).sort(), ['fill', 'ink', 'edge', 'icon'].flatMap((p) => selectable.map((s) => `navigation-item-${p}-${s}`)).sort());
  assert.deepEqual(names.filter((n) => n.startsWith('navigation-badge-')).sort(), ['fill', 'ink'].flatMap((p) => ['rest', 'selected'].map((s) => `navigation-badge-${p}-${s}`)).sort());
  assert.equal(c.slots['navigation-item-edge-selected']?.default, '{edge-tab-selected}');
  assert.equal(c.slots['navigation-item-fill-selected']?.default, '{fill-selected}');
  assert.equal(c.slots['navigation-item-fill-selected']?.level, 'level-accent-soft-primary');
  assert.equal(c.slots['navigation-item-ink-selected']?.default, '{ink-selected}');
  assert.equal(c.slots['navigation-item-ink-rest']?.default, '{ink-muted}');
  assert.equal(c.slots['navigation-item-ink-rest']?.level, 'level-ink-muted');
  assert.equal(c.slots['navigation-item-fill-hover']?.default, '{fill-hover}');
  assert.equal(c.slots['navigation-item-ink-hover']?.default, '{ink-body}');
  assert.equal(c.slots['navigation-item-ink-hover']?.level, 'level-ink-body');
  assert.equal(c.slots['navigation-badge-fill-rest']?.default, '{fill-marker}');
  assert.equal(c.slots['navigation-badge-ink-rest']?.default, '{ink-body}');
  assert.equal(c.slots['navigation-badge-fill-selected']?.default, '{emphasis-primary-fill}');
  assert.equal(c.slots['navigation-badge-ink-selected']?.default, '{emphasis-primary-ink}');
  assert.equal(Object.values(c.slots).some((slot) => slot.group === 'navigation' && slot.part === 'root'), false, 'no slot names the skip link\'s part');
  assert.equal(c.members['ArenaSkipLink.root']?.to, 'actions.root');
  assert.deepEqual(c.members['ArenaSkipLink.root']?.options, ['secondary']);
  assert.equal(c.members['ArenaTabs.tab']?.edgeAs, 'rule');
  assert.equal(c.members['ArenaBottomNav.item']?.disabledModifier, 'aria-disabled:');
  assert.deepEqual(c.members['ArenaStepper.trigger']?.hoverIn, { axis: 'reachable', value: 'true' });
  assert.deepEqual(c.members['ArenaTreeView.item']?.disabledBy, { axis: 'disabled', value: 'true' });
  assert.deepEqual(c.members['ArenaSideNav.dot']?.states, ['selected']);
});

test('a selected hover and pressed edge follow the fill\'s mix', () => {
  const c = deriveSlots(readSlotDeclarations());
  const edges = Object.entries(c.slots).filter(([, slot]) => slot.property === 'edge' && slot.derive !== undefined);
  assert.ok(edges.length > 0);
  for (const [name, slot] of edges) {
    const fill = c.slots[name.replace('-edge-', '-fill-')];
    if (slot.state === 'selected-hover' || slot.state === 'selected-pressed') {
      assert.equal(slot.derive?.mix, slot.state === 'selected-hover' ? 'mix-hover' : 'mix-pressed', name);
      assert.equal(slot.derive?.mix, fill?.derive?.mix, `${name}: the edge takes the fill's blend (D85)`);
    } else assert.equal(slot.derive?.mix, undefined, `${name}: only a selected hover or pressed edge mixes`);
  }
  assert.deepEqual(edges.filter(([, slot]) => slot.derive?.mix !== undefined).map(([name]) => name).sort(), ['actions-ghost', 'actions-solid', 'navigation']
    .flatMap((stem) => ['hover', 'pressed'].map((state) => `${stem}${stem === 'navigation' ? '-item' : '-root'}-edge-selected-${state}`)).sort());
});

test('steps derives its slots', () => {
  const c = deriveSlots(readSlotDeclarations());
  const names = Object.keys(c.slots);
  assert.deepEqual(names.filter((n) => n.startsWith('steps-')).sort(), [
    ...['complete', 'current', 'upcoming', 'error'].flatMap((o) => ['fill', 'edge', 'ink'].map((p) => `steps-${o}-marker-${p}-rest`)),
    ...['complete', 'current', 'upcoming'].map((o) => `steps-${o}-label-ink-rest`),
  ].sort());
  assert.equal(c.slots['steps-upcoming-marker-edge-rest']?.default, '{edge-control}');
  assert.equal(c.slots['steps-complete-marker-edge-rest']?.default, '{edge-control-quiet}');
  assert.equal(c.slots['steps-current-marker-fill-rest']?.default, '{emphasis-primary-fill}');
  assert.equal(c.slots['steps-current-marker-edge-rest']?.default, '{emphasis-primary-edge}');
  assert.equal(c.slots['steps-current-marker-ink-rest']?.default, '{emphasis-primary-ink}');
  assert.equal(c.slots['steps-error-marker-edge-rest']?.default, '{hue-danger-edge}');
  assert.equal(c.slots['steps-error-marker-ink-rest']?.default, '{hue-danger-ink}');
  assert.equal(c.slots['steps-upcoming-marker-ink-rest']?.level, 'level-ink-muted');
  assert.equal(c.slots['steps-complete-label-ink-rest']?.default, '{ink-body}');
  assert.equal(c.slots['steps-current-label-ink-rest']?.default, '{ink-heading}');
  assert.equal(c.slots['steps-upcoming-label-ink-rest']?.default, '{ink-muted}');
  for (const o of ['complete', 'current', 'upcoming']) assert.equal(c.slots[`steps-${o}-label-ink-rest`]?.on, 'ground', `${o}: the label is measured over the ground`);
  assert.deepEqual(c.members['ArenaStepper.marker']?.options, ['complete', 'current', 'upcoming', 'error']);
  assert.deepEqual(c.members['ArenaStepper.marker']?.optionBy, [{ axis: 'error', values: { true: 'error' } }, { axis: 'state', values: { complete: 'complete', current: 'current', upcoming: 'upcoming' } }]);
  assert.deepEqual(c.members['ArenaOnboarding.dot']?.options, ['upcoming', 'current']);
  assert.deepEqual(c.members['ArenaOnboarding.dot']?.properties, ['fill', 'edge']);
  assert.deepEqual(c.members['ArenaOnboarding.dot']?.optionBy, { axis: 'current', values: { false: 'upcoming', true: 'current' } });
});

const banner = () => ({
  properties: ['fill', 'edge'],
  options: {
    neutral: { states: 'base', rest: { fill: '{f-surface}', edge: '{e-surface}' } },
    info: { states: 'base', rest: { fill: '{f-info}', edge: '{e-info}' } },
  },
});

test('a part on a sibling with options sits on the same option', () => {
  const d = fixture();
  d.groups!.feedback = {
    parts: {
      banner: banner(),
      icon: { properties: ['ink'], on: 'banner', options: { info: { states: 'base', rest: { ink: '{i-info}' } }, gold: { states: 'base', rest: { ink: '{i-gold}' } } } },
      action: { properties: ['fill', 'ink'], over: 'banner', options: { info: { states: 'base', rest: { fill: 'transparent', ink: '{i-action}' } } } },
      dot: {
        properties: ['fill', 'edge', 'ink'], mark: true, options: {
          info: { states: 'base', properties: ['fill', 'ink'], rest: { fill: '{f-info}', ink: '{i-info}' } },
          gold: { states: 'base', properties: ['ink'], rest: { ink: '{i-gold}' } },
          done: { states: 'base', rest: { fill: '{f-info}', edge: 'transparent', ink: '{i-info}' } },
          ringed: { states: 'base', rest: { fill: '{f-surface}', edge: '{e-info}', ink: '{i-info}' } },
        },
      },
    },
  };
  const s = deriveSlots(d).slots;
  assert.equal(s['feedback-info-icon-ink-hover']?.on, 'feedback-info-banner-fill-hover', 'the icon sits on the banner of its own option');
  assert.equal(s['feedback-gold-icon-ink-rest']?.on, 'feedback-banner-fill-rest', 'an option the banner lacks sits on the banner with no option');
  assert.equal(s['feedback-info-action-ink-rest']?.on, 'feedback-info-banner-fill-rest', 'a part over a sibling sits its ink on the sibling, not on its own fill');
  assert.equal(s['feedback-info-action-fill-pressed']?.on, 'feedback-info-banner-fill-pressed');
  assert.equal(s['feedback-info-action-ink-rest']?.pair, 'own', 'an over part keeps its property floor');
  assert.equal(s['feedback-info-icon-ink-rest']?.pair, undefined);
  assert.equal(s['feedback-info-dot-ink-rest']?.on, 'feedback-info-dot-fill-rest', 'a mark sits on its own fill');
  assert.equal(s['feedback-gold-dot-ink-rest']?.on, 'ground', 'a mark with no fill sits on the ground');
  assert.equal(s['feedback-gold-dot-ink-rest']?.pair, 'mark');
  assert.equal(s['feedback-info-dot-fill-rest']?.pair, 'mark');
  assert.equal(s['feedback-info-dot-fill-rest']?.on, 'ground', 'a mark part\'s fill is a mark over the ground (D92)');
  assert.equal(s['feedback-done-dot-fill-rest']?.on, 'ground', 'a mark whose edge is transparent is told by its fill');
  assert.equal(s['feedback-ringed-dot-fill-rest']?.on, undefined, 'a mark with an opaque edge is told by its ring, so its fill is no pair');
  assert.equal(s['feedback-ringed-dot-ink-rest']?.on, 'feedback-ringed-dot-fill-rest', 'its glyph still sits on its fill');
  assert.equal(s['feedback-info-banner-fill-rest']?.pair, undefined, 'a part with no over and no mark carries no pair');
});

test('feedback derives its banner, icon and action', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['feedback-success-action-ink-rest']?.default, '{ink-action}');
  assert.equal(c.slots['feedback-success-action-ink-rest']?.level, 'level-ink-full');
  assert.equal(c.slots['feedback-neutral-icon-ink-rest']?.default, '{ink-muted}');
  assert.equal(c.slots['feedback-neutral-icon-ink-rest']?.level, 'level-ink-muted');
  assert.equal(c.slots['feedback-info-icon-ink-rest']?.on, 'feedback-info-banner-fill-rest');
  assert.equal(c.slots['feedback-info-action-ink-rest']?.on, 'feedback-info-banner-fill-rest');
  assert.equal(c.slots['feedback-info-action-ink-rest']?.pair, 'own');
  assert.equal(c.slots['feedback-danger-banner-fill-rest']?.default, '{hue-danger-fill-soft}');
  assert.equal(c.slots['feedback-neutral-banner-edge-rest']?.default, '{edge-surface-floating}');
  assert.equal(c.slots['feedback-gold-banner-edge-rest']?.default, '{accent-gold-side-edge}');
  assert.equal(c.slots['feedback-gold-banner-edge-rest']?.channel, '--arena-accent-feedback-banner-edge');
  assert.equal(c.slots['feedback-plain-banner-edge-rest']?.default, '{accent-plain-side-edge}');
  assert.equal(c.slots['feedback-plain-banner-fill-rest'], undefined, 'plain and gold derive the edge alone');
  assert.deepEqual(c.members['ArenaToast.root']?.options, ['plain', 'gold', 'success', 'danger']);
  assert.equal(c.members['ArenaToast.root']?.edgeAs, 'stripe');
  assert.deepEqual(c.members['ArenaAlert.action']?.options, ['neutral', 'info', 'success', 'warning', 'danger']);
});

test('meters, data, the page and the tip derive their slots', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['meters-success-track-ink-rest']?.default, '{hue-success-ink}');
  assert.equal(c.slots['meters-success-track-fill-rest']?.default, '{fill-track}');
  assert.equal(c.slots['meters-muted-track-ink-rest']?.level, 'level-ink-muted');
  assert.equal(c.slots['meters-primary-track-ink-rest']?.channel, '--arena-accent-meters-track-ink');
  assert.equal(c.slots['meters-primary-track-fill-rest']?.channel, '--arena-accent-meters-track-fill');
  assert.equal(Object.keys(c.slots).some((name) => /^meters-.*-track-edge-/.test(name)), false, 'no member paints a meter track edge');
  assert.equal(Object.keys(c.slots).some((name) => /^meters-plain-track-|^meters-ink-track-/.test(name)), false, 'plain and ink derive nothing');
  assert.equal(c.slots['data-now-fill-rest']?.default, '{emphasis-primary-fill}');
  assert.equal(c.slots['data-now-edge-rest']?.default, '{emphasis-primary-edge}');
  assert.equal(c.slots['data-today-ink-rest']?.default, '{accent-primary-ink}');
  assert.equal(c.slots['surfaces-page-fill-rest']?.default, '{fill-page}');
  assert.equal(c.slots['overlays-tip-fill-rest']?.default, '{fill-tip}');
  assert.equal(c.slots['overlays-tip-ink-rest']?.default, '{ink-tip}');
  assert.equal(c.members['ArenaProgressBar.ringTrack']?.fillAs, 'stroke');
  assert.equal(c.members['ArenaTooltip.bubble']?.to, 'overlays.tip');
});

test('marks derives its dot and tile', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['marks-muted-dot-ink-rest']?.default, '{ink-muted}');
  assert.equal(c.slots['marks-muted-dot-ink-rest']?.level, 'level-presence');
  assert.equal(c.slots['marks-muted-dot-ink-rest']?.on, 'ground', 'a dot with no fill is a mark over the ground (D92)');
  assert.equal(c.slots['marks-muted-dot-ink-rest']?.pair, 'mark');
  assert.equal(c.slots['marks-neutral-complete-dot-edge-rest']?.default, 'transparent', 'a border painted its own fill takes transparent (D91)');
  assert.equal(c.slots['marks-neutral-complete-dot-fill-rest']?.default, '{fill-mark}');
  assert.equal(c.slots['marks-neutral-complete-dot-ink-rest']?.default, '{ink-on-mark}');
  assert.equal(c.slots['marks-neutral-current-dot-edge-rest']?.default, '{edge-mark}');
  assert.equal(c.slots['marks-primary-dot-ink-rest']?.channel, '--arena-accent-marks-dot-ink');
  assert.equal(c.slots['marks-primary-dot-fill-rest'], undefined, 'an accent dot derives its ink alone');
  assert.equal(c.slots['marks-tile-fill-rest']?.default, '{fill-tile}');
  assert.equal(c.slots['marks-tile-edge-rest']?.default, '{edge-marker}');
  assert.equal(c.slots['marks-tile-ink-rest']?.level, 'level-ink-body');
  const dots = Object.values(c.slots).filter((slot) => slot.group === 'marks' && slot.part === 'dot');
  assert.equal(dots.some((slot) => /^identity-/.test(slot.option ?? '')), false, 'a series dot follows its hues channel (D75, D76)');
  assert.equal(c.members['ArenaBoard.dot'], undefined, 'Board.dot is a series part, outside the slot tier');
  assert.deepEqual(c.members['ArenaAvatar.status']?.options, ['success', 'danger', 'warning', 'muted']);
  assert.equal(c.members['ArenaTimeline.dot']?.options.length, 15);
});

test('no group named charts and the readout is the overlay part every tooltip reads', () => {
  const d = readSlotDeclarations();
  assert.equal(d.groups!.charts, undefined);
  assert.deepEqual(d.groups!.overlays!.parts.readout, { properties: ['fill', 'edge'], states: 'static', rest: { fill: '{fill-surface-raised}', edge: '{edge-surface-floating}' } });
  const listed = (readJson(join(repoRoot, 'frameworks/Components.json')) as Record<string, string[]>).charts!;
  assert.equal(listed.length, 12, 'the charts category lists Bar, ChartCard, Doughnut, Funnel, Gauge, Heatmap, HorizontalBar, Line, Pyramid, Radar, Scatter and Sparkline');
  const charts = listed.map((name) => [name, d.members![name]] as const);
  for (const [name, m] of charts) assert.ok(m, `${name} is a chart and declares its members`);
  for (const [name, m] of charts as [string, NonNullable<(typeof charts)[number][1]>][]) {
    assert.equal(m.group, null, name);
    for (const to of Object.values(m.parts)) assert.ok(to === null || typeof to !== 'string' || !to.startsWith('charts.'), `${name}: ${to}`);
    if ('tooltip' in m.parts) assert.deepEqual(m.parts.tooltip, { to: 'overlays.readout', options: [], states: 'static', inline: true }, name);
  }
  const c = deriveSlots(d);
  assert.deepEqual(Object.keys(c.slots).filter((key) => key.startsWith('charts-')), [], 'a chart declares no group of its own');
  assert.deepEqual(Object.keys(c.slots).filter((key) => key.startsWith('overlays-readout-')), ['overlays-readout-edge-rest', 'overlays-readout-fill-rest'], 'a readout derives its fill and its edge');
});

test('a member part carries its ground, toBy, seriesBy, wrappedBy and a fill-drawn edge into the catalogue', () => {
  const d = fixture();
  const keys = {
    ground: 'fill-surface-raised', toBy: { axis: 'numeric', values: { false: 'actions.dismiss' } }, seriesBy: 'colorId',
    wrappedBy: '--arena-mark-{property}', edgeAs: 'fill' as const,
  };
  d.members!.ArenaKnob!.parts.root = { to: 'actions.root', options: ['calm', 'danger'], states: 'base', ...keys };
  const m = deriveSlots(d).members['ArenaKnob.root'];
  assert.deepEqual({ ground: m?.ground, toBy: m?.toBy, seriesBy: m?.seriesBy, wrappedBy: m?.wrappedBy, edgeAs: m?.edgeAs }, keys);
  assert.equal(Object.hasOwn(deriveSlots(fixture()).members['ArenaKnob.root'] ?? {}, 'ground'), false, 'a member with none carries none');
});

test('marks derives its soft, outline and label parts', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['marks-plain-soft-ink-rest']?.default, '{ink-body}');
  assert.equal(c.slots['marks-plain-soft-ink-rest']?.level, 'level-ink-body');
  assert.equal(c.slots['marks-plain-soft-fill-rest']?.channel, '--arena-accent-marks-soft-fill');
  assert.equal(c.slots['marks-neutral-outline-edge-rest']?.default, '{edge-marker}');
  assert.equal(c.slots['marks-plain-outline-ink-rest']?.channel, '--arena-accent-marks-outline-ink');
  assert.equal(c.slots['marks-neutral-label-ink-rest']?.default, '{ink-heading}');
  assert.equal(c.slots['marks-gold-label-ink-rest']?.channel, '--arena-accent-marks-label-ink');
  const marks = Object.entries(c.slots).filter(([, slot]) => slot.group === 'marks');
  assert.deepEqual(marks.filter(([, slot]) => /^identity-/.test(slot.option ?? '')).map(([name]) => name), [], 'a series mark follows its hues channel (D75, D76)');
  assert.deepEqual(marks.filter(([name]) => /^marks-.+-soft-edge-/.test(name)).map(([name]) => name), [], 'a wash draws no edge');
  assert.deepEqual(marks.filter(([, slot]) => slot.part === 'outline' && slot.state !== 'rest').map(([name]) => name), [], 'an outline mark is static');
  assert.equal(c.slots['marks-neutral-upcoming-dot-edge-rest']?.default, '{edge-mark}');
  assert.equal(c.slots['marks-neutral-upcoming-dot-edge-rest']?.level, 'level-presence', 'the upcoming ring is told from its disc at 3:1 (D97)');
});

test('data and surfaces derive their parts', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['data-header-fill-hover']?.default, '{fill-track}', 'the header keeps its track fill under hover (D19)');
  assert.equal(c.slots['data-header-ink-hover']?.default, '{ink-body}');
  assert.equal(c.slots['data-row-fill-hover']?.default, '{fill-hover}');
  assert.equal(c.slots['data-current-fill-selected']?.default, '{fill-surface-sunken}');
  assert.equal(c.slots['surfaces-floating-bar-edge-rest']?.default, '{edge-surface-floating}');
  assert.equal(c.slots['surfaces-page-bar-fill-rest']?.default, '{fill-surface}');
  assert.equal(c.slots['surfaces-media-sunken-ink-rest']?.default, '{ink-eyebrow}');
  assert.equal(c.slots['surfaces-plain-sunken-ink-rest']?.default, '{ink-muted}');
  assert.equal(c.slots['surfaces-media-fill-rest']?.default, '{overlay-media}');
  assert.equal(c.slots['surfaces-media-fill-rest']?.level, 'level-media', 'the media wash keeps 72 % through a named level (D106)');
  assert.equal(c.slots['surfaces-separator-edge-rest']?.default, '{edge-separator}');
  assert.equal(c.slots['surfaces-primary-card-edge-rest']?.channel, '--arena-accent-surfaces-card-edge');
  assert.equal(c.slots['meters-success-standing-ink-rest']?.default, '{hue-success-ink}');
  assert.deepEqual(Object.keys(c.slots).filter((n) => /^meters-info-standing-/.test(n)), [], 'no member reads an info standing');
});

test('overlays derive their scrim, panel, section, readout and eyebrow', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['overlays-scrim-fill-rest']?.default, '{overlay-scrim}');
  assert.equal(c.slots['overlays-scrim-fill-rest']?.level, 'level-scrim', 'the scrim keeps 60 % through a named level (D105)');
  assert.equal(c.slots['overlays-panel-fill-rest']?.default, '{fill-surface-floating}');
  assert.equal(c.slots['overlays-panel-edge-rest']?.default, '{edge-surface-floating}');
  assert.equal(c.slots['overlays-panel-ink-rest']?.default, '{ink-body}');
  assert.equal(c.slots['overlays-section-fill-rest']?.default, '{fill-surface-floating}');
  assert.equal(c.slots['overlays-readout-fill-rest']?.default, '{fill-surface-raised}');
  assert.equal(c.slots['overlays-readout-edge-rest']?.default, '{edge-surface-floating}');
  assert.equal(c.slots['overlays-plain-eyebrow-ink-rest']?.default, '{ink-eyebrow}');
  assert.equal(c.slots['overlays-destructive-eyebrow-ink-rest']?.default, '{hue-danger-ink}');
});

test('text derives its six parts', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['text-heading-ink-rest']?.default, '{ink-heading}');
  assert.equal(c.slots['text-body-ink-rest']?.default, '{ink-body}');
  assert.equal(c.slots['text-body-ink-rest']?.level, 'level-ink-body');
  assert.equal(c.slots['text-muted-ink-rest']?.default, '{ink-muted}');
  assert.equal(c.slots['text-muted-ink-rest']?.level, 'level-ink-muted');
  assert.equal(c.slots['text-eyebrow-ink-rest']?.default, '{ink-eyebrow}');
  assert.equal(c.slots['text-figure-ink-rest']?.default, '{ink-figure}');
  assert.equal(c.slots['text-figure-ink-rest']?.level, 'level-ink-full');
  assert.equal(c.slots['text-key-ink-rest']?.default, '{ink-key}');
  assert.equal(c.slots['text-key-ink-rest']?.level, 'level-ink-muted');
  assert.equal(c.slots['text-key-edge-rest']?.default, '{edge-control-quiet}');
  assert.equal(c.slots['text-key-edge-rest']?.level, undefined);
  assert.deepEqual(Object.keys(c.slots).filter((name) => name.startsWith('text-')).length, 7, 'six parts, the key with an ink and an edge');
  const ground = (key: string) => c.members[key]?.ground;
  assert.equal(ground('ArenaBarChart.tooltipLabel'), 'fill-surface-raised');
  assert.equal(ground('ArenaBarChart.tooltipValue'), 'fill-surface-raised');
  assert.equal(c.members['ArenaBarChart.tooltipValue']?.to, 'text.figure');
  assert.equal(c.members['ArenaBulkActionBar.count']?.to, 'text.figure');
  assert.deepEqual(c.members['ArenaTable.td']?.toBy, { axis: 'numeric', values: { false: 'text.body' } });
  assert.deepEqual(c.members['ArenaTable.cardValue']?.toBy, { axis: 'numeric', values: { false: 'text.body' } });
  assert.deepEqual(c.members['ArenaProgressBar.value']?.toBy, { axis: 'shape', values: { radial: 'text.body' } });
  assert.equal(c.members['ArenaProgressBar.value']?.to, 'text.muted');
  for (const key of ['ArenaKbd.separator', 'ArenaMenu.shortcut', 'ArenaCommandPalette.shortcut']) assert.deepEqual(c.members[key]?.properties, ['ink'], key);
  assert.deepEqual(readSlotDeclarations().members!.ArenaCombobox!.parts.more, { to: 'marks.outline', options: ['neutral'], states: 'static' }, 'a member that left text.key (D102) stays out of it');
});
