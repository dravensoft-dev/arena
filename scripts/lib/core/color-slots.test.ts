import test from 'node:test';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
import assert from 'node:assert/strict';
import { SLOT_KEYS, deriveSlots, readSlotDeclarations } from './color-slots.ts';
import type { MemberDecl, SlotDeclarations } from './color-slots.ts';
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

test('actions derives slots and no component slot', () => {
  const c = deriveSlots(readSlotDeclarations());
  const slots = Object.values(c.slots);
  assert.ok(slots.filter((slot) => slot.group === 'actions').length > 0);
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

test('deriveSlots carries groundPart onto the member', () => {
  const d = fixture();
  (d.members!.ArenaKnob!.parts.root as MemberDecl).groundPart = 'root';
  assert.equal(deriveSlots(d).members['ArenaKnob.root']?.groundPart, 'root');
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
  assert.equal(s['actions-dismiss-ink-hover']?.on, 'actions-dismiss-fill-hover', 'a glyph sits on its own part\'s fill');
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
  assert.ok(names.length > 0);
  assert.ok(names.every((n) => /^actions-dismiss-(fill|ink|icon)-(rest|hover|pressed|disabled)$/.test(n)), names.join(', '));
  const hover = c.slots['actions-dismiss-ink-hover'] as { derive?: unknown };
  assert.equal(hover.derive, undefined);
});

test('choices derives a glyph on its own part\'s fill, and no slot for what fades with its box or its track', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['choices-knob-ink-rest']?.on, 'choices-knob-fill-rest', 'a glyph sits on its own part\'s fill');
  assert.equal(c.slots['choices-mark-ink-selected-disabled'], undefined, 'the mark fades with its box');
  assert.equal(c.slots['choices-knob-fill-disabled'], undefined, 'the knob fades with its track');
  assert.deepEqual(c.members['ArenaCheckbox.box']?.disabledBy, { axis: 'disabled', value: 'true' }, 'a span reads its disabled states in the disabled branch');
  assert.equal(c.members['ArenaSwitch.track']?.disabledBy, undefined, 'a native control reads them under disabled:');
  assert.equal(c.members['ArenaSlider.track'], undefined, 'the track paints no colour');
});

test('fields derives no ink for a field and no hover for a readonly one, and its members read text and disabled states where the contract says', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(Object.values(c.slots).some((s) => s.part === 'field' && s.property === 'ink'), false, 'every field text reads fields.value');
  assert.equal(c.slots['fields-readonly-field-fill-hover'], undefined, 'a readonly field does not hover');
  for (const o of ['neutral', 'error', 'valid']) assert.equal(c.slots[`fields-${o}-field-fill-hover`]?.default, '{fill-hover}', `${o}: the hover fill is the group's exception`);
  assert.equal(c.slots['fields-required-ink-rest']?.on, 'ground', 'an ink with no fill sits on the ground');
  assert.equal(c.slots['fields-value-ink-disabled'], undefined, 'a value fades with its field');
  assert.equal(Object.values(c.slots).some((s) => s.group === 'fields' && s.channel !== undefined), false, 'no fields part declares a channel');
  for (const key of ['ArenaSelect.field', 'ArenaTextarea.field', 'ArenaPinInput.cell', 'ArenaConfirmDialog.input']) assert.equal(c.members[key]?.inkFrom, 'fields.value', `${key} reads its text from fields.value`);
  assert.deepEqual(c.members['ArenaFileInput.zone']?.onlyBy, { axis: 'droppable', value: 'true' }, 'the zone paints its field only where it is droppable');
  assert.deepEqual(c.members['ArenaInput.field']?.disabledBy, { axis: 'disabled', value: 'true' }, 'a div field reads its disabled states in its branch');
  assert.equal(c.members['ArenaTextarea.field']?.disabledBy, undefined, 'a native textarea reads them under disabled:');
  assert.deepEqual(c.members['ArenaFileInput.zone']?.hoverBy, { axis: 'dragging', value: 'true' }, 'dragging over the zone is the field\'s hover');
});

test('every menu item option takes the hover fill as the group\'s exception', () => {
  const c = deriveSlots(readSlotDeclarations());
  for (const o of ['plain', 'destructive']) assert.equal(c.slots[`menus-${o}-item-fill-hover`]?.default, '{fill-hover}', `${o}: the hover fill is the group's exception`);
});

test('no navigation slot names the skip link\'s part', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(Object.values(c.slots).some((slot) => slot.group === 'navigation' && slot.part === 'root'), false, 'no slot names the skip link\'s part');
});

test('a selected hover and pressed edge follow the fill\'s mix', () => {
  const c = deriveSlots(readSlotDeclarations());
  const edges = Object.entries(c.slots).filter(([, slot]) => slot.property === 'edge' && slot.derive !== undefined);
  assert.ok(edges.length > 0);
  for (const [name, slot] of edges) {
    const fill = c.slots[name.replace('-edge-', '-fill-')];
    if (slot.state === 'selected-hover' || slot.state === 'selected-pressed') {
      assert.equal(slot.derive?.mix, slot.state === 'selected-hover' ? 'mix-hover' : 'mix-pressed', name);
      assert.equal(slot.derive?.mix, fill?.derive?.mix, `${name}: the edge takes the fill's blend`);
    } else assert.equal(slot.derive?.mix, undefined, `${name}: only a selected hover or pressed edge mixes`);
  }
  assert.deepEqual(edges.filter(([, slot]) => slot.derive?.mix !== undefined).map(([name]) => name).sort(), ['actions-ghost', 'actions-solid', 'navigation']
    .flatMap((stem) => ['hover', 'pressed'].map((state) => `${stem}${stem === 'navigation' ? '-item' : '-root'}-edge-selected-${state}`)).sort());
});

test('a step label is measured over the ground', () => {
  const c = deriveSlots(readSlotDeclarations());
  for (const o of ['complete', 'current', 'upcoming']) assert.equal(c.slots[`steps-${o}-label-ink-rest`]?.on, 'ground', `${o}: the label is measured over the ground`);
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
  assert.equal(s['feedback-info-dot-fill-rest']?.on, 'ground', 'a mark part\'s fill is a mark over the ground');
  assert.equal(s['feedback-done-dot-fill-rest']?.on, 'ground', 'a mark whose edge is transparent is told by its fill');
  assert.equal(s['feedback-ringed-dot-fill-rest']?.on, undefined, 'a mark with an opaque edge is told by its ring, so its fill is no pair');
  assert.equal(s['feedback-ringed-dot-ink-rest']?.on, 'feedback-ringed-dot-fill-rest', 'its glyph still sits on its fill');
  assert.equal(s['feedback-info-banner-fill-rest']?.pair, undefined, 'a part with no over and no mark carries no pair');
});

test('plain and gold feedback derive the edge alone', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['feedback-plain-banner-fill-rest'], undefined, 'plain and gold derive the edge alone');
});

test('meters derive no track edge and no slot for the plain and ink options', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(Object.keys(c.slots).some((name) => /^meters-.*-track-edge-/.test(name)), false, 'no member paints a meter track edge');
  assert.equal(Object.keys(c.slots).some((name) => /^meters-plain-track-|^meters-ink-track-/.test(name)), false, 'plain and ink derive nothing');
});

test('marks derives a dot over the ground, a transparent ring on a bordered fill and no slot for a series or an accent fill', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['marks-muted-dot-ink-rest']?.on, 'ground', 'a dot with no fill is a mark over the ground');
  assert.equal(c.slots['marks-neutral-complete-dot-edge-rest']?.default, 'transparent', 'a border painted its own fill takes transparent');
  assert.equal(c.slots['marks-primary-dot-fill-rest'], undefined, 'an accent dot derives its ink alone');
  const dots = Object.values(c.slots).filter((slot) => slot.group === 'marks' && slot.part === 'dot');
  assert.equal(dots.some((slot) => /^identity-/.test(slot.option ?? '')), false, 'a series dot follows its hues channel');
  assert.equal(c.members['ArenaBoard.dot'], undefined, 'Board.dot is a series part, outside the slot tier');
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

test('marks derives no series mark, no wash edge and no outline state, and the upcoming ring carries the presence level', () => {
  const c = deriveSlots(readSlotDeclarations());
  const marks = Object.entries(c.slots).filter(([, slot]) => slot.group === 'marks');
  assert.deepEqual(marks.filter(([, slot]) => /^identity-/.test(slot.option ?? '')).map(([name]) => name), [], 'a series mark follows its hues channel');
  assert.deepEqual(marks.filter(([name]) => /^marks-.+-soft-edge-/.test(name)).map(([name]) => name), [], 'a wash draws no edge');
  assert.deepEqual(marks.filter(([, slot]) => slot.part === 'outline' && slot.state !== 'rest').map(([name]) => name), [], 'an outline mark is static');
  assert.equal(c.slots['marks-neutral-upcoming-dot-edge-rest']?.level, 'level-presence', 'the upcoming ring is told from its disc at 3:1');
});

test('the data header keeps its track fill under hover, the media wash keeps its level, and no info standing is derived', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['data-header-fill-hover']?.default, '{fill-track}', 'the header keeps its track fill under hover');
  assert.equal(c.slots['surfaces-media-fill-rest']?.level, 'level-media', 'the media wash keeps 72 % through a named level');
  assert.deepEqual(Object.keys(c.slots).filter((n) => /^meters-info-standing-/.test(n)), [], 'no member reads an info standing');
});

test('the scrim keeps 60 % through a named level', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.equal(c.slots['overlays-scrim-fill-rest']?.level, 'level-scrim', 'the scrim keeps 60 % through a named level');
});

test('text derives six parts, the key with an ink and an edge, and a member that left text.key stays out of it', () => {
  const c = deriveSlots(readSlotDeclarations());
  assert.deepEqual(Object.keys(c.slots).filter((name) => name.startsWith('text-')).length, 7, 'six parts, the key with an ink and an edge');
  assert.deepEqual(readSlotDeclarations().members!.ArenaCombobox!.parts.more, { to: 'marks.outline', options: ['neutral'], states: 'static' }, 'a member that left text.key stays out of it');
});
