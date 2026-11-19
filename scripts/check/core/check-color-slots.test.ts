import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { collect, mapProblems, declarationProblems, exceptionProblems, memberDefaultProblems, shapeProblems, nameProblems, acceptsProblems, defaultProblems, fallbackProblems, pairProblems, manifestProblems, ringProblems, readProblems, memberReadProblems, fadeProblems, familyProblems, colourRoleSet, slotManifests, EMPHASIS_FAMILY } from './check-color-slots.ts';
import { deriveSlots, readColorSlots, readSlotDeclarations } from '../../lib/core/color-slots.ts';
import type { GroupOption, MemberDecl, SlotDeclarations } from '../../lib/core/color-slots.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { colouredParts } from '../../lib/core/color-slot-map.ts';
import type { SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';
import { haloValue, memberValue } from '../../generate/core/arena-cli/slots.ts';
import { fixtureManifests, slotFixture } from '../../lib/core/color-slots-fixture.ts';

const shipped = () => structuredClone(readColorSlots());
const roles = colourRoleSet();
const manifests = slotManifests();
const edit = (fn: (c: SlotCatalogue) => void) => { const c = shipped(); fn(c); return c; };

test('the shipped contract is clean', () => {
  assert.deepEqual(collect(), []);
});

test('no hue or accent family slot is derived', () => {
  const named = Object.keys(shipped().slots).filter((n) => n.startsWith('hue-') || n.startsWith('accent-'));
  assert.deepEqual(named, []);
});

test('a slot whose name disagrees with its fields is refused', () => {
  const c = edit((x) => { x.slots['actions-primary-root-fill-rest']!.state = 'hover'; });
  const lines = nameProblems(c);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /actions-primary-root-fill-rest/);
});

test('a key or a value outside the vocabulary is refused', () => {
  assert.ok(shapeProblems(edit((x) => { (x.slots['actions-primary-root-fill-rest'] as any).colour = 'x'; })).length > 0);
  assert.ok(shapeProblems(edit((x) => { (x as any).extra = 1; })).length > 0);
  assert.ok(shapeProblems(edit((x) => { (x.slots['actions-primary-root-fill-rest'] as any).state = 'active'; })).length > 0);
  assert.ok(shapeProblems(edit((x) => { x.slots['actions-primary-root-fill-rest']!.part = 'quiet'; })).length > 0);
  assert.ok(shapeProblems(edit((x) => { x.slots['actions-primary-root-fill-rest']!.group = 'loud'; })).some((l) => /group "loud" is not declared/.test(l)));
});

test('a fill slot accepting an ink role is refused', () => {
  const lines = acceptsProblems(edit((x) => { x.accepts.fill.push('ink-*'); }), roles);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /ink-\*/);
});

test('an accepts pattern matching no colour role is refused', () => {
  assert.equal(acceptsProblems(edit((x) => { x.accepts.edge.push('edge-nothing-*'); }), roles).length, 1);
});

test('a pressed slot carrying both a default and a derive is refused', () => {
  const c = edit((x) => { x.slots['actions-primary-root-fill-pressed']!.default = '{fill-hover}'; });
  const lines = defaultProblems(c, roles);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /actions-primary-root-fill-pressed/);
});

test('a default that is no accepted role, no slot and no transparent is refused', () => {
  assert.equal(defaultProblems(edit((x) => { x.slots['actions-primary-root-fill-rest']!.default = '{ink-body}'; }), roles).length, 1);
  assert.equal(defaultProblems(edit((x) => { x.slots['actions-primary-root-fill-rest']!.default = '#fff'; }), roles).length, 1);
  assert.equal(defaultProblems(edit((x) => { x.slots['actions-primary-root-ink-rest']!.default = 'transparent'; }), roles).length, 1);
});

test('a derive names its own rest slot, optional sits on disabled and mix on a fill', () => {
  assert.equal(defaultProblems(edit((x) => { x.slots['actions-primary-root-ink-hover']!.derive = { from: 'actions-primary-root-ink-pressed' }; }), roles).length, 1);
  assert.equal(defaultProblems(edit((x) => { x.slots['actions-primary-root-ink-hover']!.derive = { from: 'actions-primary-root-ink-rest', mix: 'mix-hover' }; }), roles).length, 1);
  assert.equal(defaultProblems(edit((x) => { delete x.slots['actions-primary-root-fill-rest']!.default; }), roles).length, 1);
});

test('a chain that returns to itself is refused', () => {
  const c = edit((x) => {
    x.slots['actions-ghost-root-icon-rest']!.default = '{actions-ghost-root-ink-rest}';
    x.slots['actions-ghost-root-ink-rest']!.default = '{actions-ghost-root-icon-rest}';
  });
  assert.ok(defaultProblems(c, roles).some((l) => /cycle/.test(l)));
});

test('a group slot falls to a role, never to another slot, and the destructive hover fill is the R6 exception', () => {
  const lines = fallbackProblems(edit((x) => { x.slots['actions-destructive-root-fill-rest']!.default = '{actions-primary-root-fill-rest}'; }));
  assert.deepEqual(lines, ['actions-destructive-root-fill-rest: a group slot falls to a role, and {actions-primary-root-fill-rest} is a slot']);
  const c = shipped();
  assert.equal(c.slots['actions-destructive-root-fill-hover']!.default, '{fill-hover}');
  assert.equal(c.slots['actions-destructive-root-fill-hover']!.derive, undefined);
  assert.equal(c.slots['actions-ghost-root-edge-rest']!.default, 'transparent', 'the IconButton edge is a member default, never the group default');
  assert.deepEqual(fallbackProblems(c), []);
});

test('an icon slot at rest falls to its own ink and keeps its level', () => {
  assert.equal(fallbackProblems(edit((x) => { x.slots['actions-ghost-root-icon-rest']!.default = '{actions-ghost-root-ink-selected}'; })).length, 1);
  assert.equal(fallbackProblems(edit((x) => { delete x.slots['actions-ghost-root-icon-rest']!.level; })).length, 1);
});

test('an ink slot sits on its own fill', () => {
  const ground = edit((x) => { x.slots['actions-primary-root-ink-rest']!.on = 'ground'; });
  assert.equal(pairProblems(ground).length, 1);
  assert.equal(pairProblems(edit((x) => { x.slots['actions-primary-root-fill-rest']!.on = 'reader'; })).length, 1);
  assert.deepEqual(pairProblems(shipped()), []);
});

test('each pair rule holds on its own, read from the declarations and never from the derived catalogue', () => {
  const at = (name: string, on: string | undefined) => pairProblems(edit((x) => {
    if (on === undefined) delete x.slots[name]!.on; else x.slots[name]!.on = on;
  }));
  const one = (lines: string[], name: string, sits: string, want: string) => {
    assert.deepEqual(lines, [`${name}: it sits on ${sits} and the declarations give ${want}`]);
  };
  one(at('actions-primary-root-ink-rest', 'ground'), 'actions-primary-root-ink-rest', 'ground', 'actions-primary-root-fill-rest');
  one(at('choices-mark-ink-selected', 'ground'), 'choices-mark-ink-selected', 'ground', 'choices-box-fill-selected');
  one(at('fields-required-ink-rest', 'fields-value-fill-rest'), 'fields-required-ink-rest', 'fields-value-fill-rest', 'ground');
  one(at('choices-knob-fill-rest', undefined), 'choices-knob-fill-rest', 'nothing', 'choices-box-fill-rest');
  one(at('choices-box-fill-selected', undefined), 'choices-box-fill-selected', 'nothing', 'choices-box-fill-rest');
  one(at('actions-primary-root-fill-rest', 'actions-dismiss-fill-rest'), 'actions-primary-root-fill-rest', 'actions-dismiss-fill-rest', 'nothing');
  one(at('choices-knob-edge-rest', 'choices-knob-fill-rest'), 'choices-knob-edge-rest', 'choices-knob-fill-rest', 'choices-box-fill-rest');
  one(at('fields-neutral-field-edge-rest', undefined), 'fields-neutral-field-edge-rest', 'nothing', 'fields-neutral-field-fill-rest');
  const d = declared();
  delete d.groups!.choices!.parts.knob!.on;
  const lines = pairProblems(shipped(), d);
  assert.ok(lines.includes('choices-knob-fill-rest: it sits on choices-box-fill-rest and the declarations give nothing'), lines.join('\n'));
});

test('a focusable member part declares its ring', () => {
  const c = edit((x) => { delete x.rings['ArenaButton.root']; });
  assert.equal(ringProblems(c, manifests).length, 1);
  assert.equal(ringProblems(edit((x) => { x.rings['ArenaButton.root'] = 'actions-primary-root-fill-nothing'; }), manifests).length, 1);
  assert.deepEqual(ringProblems(edit((x) => { x.rings['ArenaCopyButton.root'] = 'ground'; }), manifests), ['rings names ArenaCopyButton.root, which is no focusable member part of a group']);
});

test('a ring that names a fill is measured over each of its states, and a disabled fill is no ground', () => {
  assert.deepEqual(ringProblems(edit((x) => { x.rings['ArenaButton.root'] = 'actions-primary-root-fill-rest'; }), manifests), []);
  const disabled = ringProblems(edit((x) => { x.rings['ArenaButton.root'] = 'actions-primary-root-fill-disabled'; }), manifests);
  assert.equal(disabled.length, 1);
  assert.match(disabled[0] ?? '', /rings\.ArenaButton\.root is actions-primary-root-fill-disabled, a fill the focus ring is never measured over/);
});

test('a member part on an option its manifest lacks, or a part its manifest lacks, is refused', () => {
  const c = edit((x) => { x.members['ArenaButton.root']!.options.push('solid'); });
  assert.ok(manifestProblems(c, manifests).some((l) => /members\.ArenaButton\.root: ArenaButton answers no emphasis solid/.test(l)));
  const gone = edit((x) => { delete x.members['ArenaSplitButton.caret']; });
  assert.ok(manifestProblems(gone, manifests).some((l) => /ArenaSplitButton\.caret reads an --arena-emphasis-\* channel and is no member part/.test(l)));
  const missing = edit((x) => { x.members['ArenaButton.label'] = { ...x.members['ArenaButton.root']! }; });
  assert.ok(manifestProblems(missing, manifests).some((l) => /members\.ArenaButton\.label: ArenaButton has no slot label/.test(l)));
});

test('the contract counts', () => {
  const slots = Object.values(shipped().slots);
  assert.equal(slots.length, 235);
  const by = (key: (s: (typeof slots)[number]) => string) => {
    const n: Record<string, number> = {};
    for (const s of slots) n[key(s)] = (n[key(s)] ?? 0) + 1;
    return n;
  };
  assert.deepEqual(by((s) => s.option ?? ''), { '': 65, primary: 16, secondary: 16, ghost: 32, solid: 32, destructive: 28, neutral: 7, error: 7, valid: 7, readonly: 2, warning: 1, plain: 20, quiet: 2 });
  assert.deepEqual(by((s) => s.state), { rest: 60, disabled: 43, hover: 44, pressed: 36, selected: 19, 'selected-hover': 10, 'selected-pressed': 10, 'selected-disabled': 13 });
  assert.equal(slots.filter((s) => s.optional).length, 56);
  assert.equal(slots.filter((s) => s.derive?.mix === 'mix-pressed').length, 14);
  assert.equal(slots.filter((s) => s.derive?.mix === 'mix-hover').length, 3);
  assert.equal(slots.filter((s) => s.channel === undefined).length, 139, 'the destructive option, the dismiss part and the choices, fields, menus and navigation groups carry no channel (R6)');
});

test('every slot of the five buttons reaches its part under its state', () => {
  const c = shipped();
  assert.deepEqual(readProblems(c, manifests), []);
  const dropped = structuredClone(manifests) as Map<string, any>;
  const root = dropped.get('ArenaButton').variants.destructive.false;
  const pressed = 'active:bg-[color:var(--arena-emphasis-fill-pressed)]';
  assert.ok(root.root.includes(pressed), 'the shipped Button reads the pressed fill under active:');
  root.root = root.root.replace(pressed, 'bg-[color:var(--arena-emphasis-fill-pressed)]');
  const lines = readProblems(c, dropped);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /ArenaButton\.root.*--arena-emphasis-fill-pressed.*active:/);
});

test('a destructive slot is read as its full chain, and the IconButton edge through its member channel', () => {
  const lost = structuredClone(manifests) as Map<string, any>;
  const button = lost.get('ArenaButton').variants.destructive.true;
  button.root = button.root.replace('var(--actions-destructive-root-fill-rest,var(--hue-danger-fill-strong))', 'var(--hue-danger-fill-strong)');
  assert.ok(readProblems(shipped(), lost).some((l) => /^ArenaButton\.root does not read its full chain under no variant: actions-destructive-root-fill-rest/.test(l)));
  const icon = structuredClone(manifests) as Map<string, any>;
  const slot = icon.get('ArenaIconButton').slots;
  slot.root = slot.root.replace('border-[color:var(--arena-emphasis-icon-edge)]', 'border-[color:var(--arena-emphasis-edge)]');
  assert.ok(readProblems(shipped(), icon).some((l) => /^ArenaIconButton\.root does not read --arena-emphasis-icon-edge under no variant: actions-ghost-root-edge-rest, actions-solid-root-edge-rest/.test(l)));
});

test('a group slot no member part reads is refused', () => {
  const c = edit((x) => { x.members['ArenaIconButton.root']!.options = ['ghost']; });
  assert.ok(readProblems(c, manifests).some((line) => line === 'actions-solid-root-fill-rest: no member part reads it'));
});

test('a selected disabled slot is optional, falls to selected, and is read under disabled: in the pressed branch', () => {
  const c = shipped();
  assert.equal(c.slots['actions-ghost-root-ink-selected-disabled']!.optional, true);
  const lost = structuredClone(manifests) as Map<string, any>;
  const root = lost.get('ArenaIconButton').variants.pressed.true;
  const read = 'disabled:text-[color:var(--arena-emphasis-ink-selected-disabled)]';
  assert.ok(root.root.includes(read));
  root.root = root.root.replace(read, 'text-[color:var(--arena-emphasis-ink-selected-disabled)]');
  const lines = readProblems(c, lost);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /ArenaIconButton\.root.*--arena-emphasis-ink-selected-disabled.*disabled:/);
  const orphan = edit((x) => { delete x.slots['actions-ghost-root-ink-selected']; });
  assert.ok(shapeProblems(orphan).concat(defaultProblems(orphan, roles)).some((l) => /actions-ghost-root-ink-selected-disabled.*falls to actions-ghost-root-ink-selected/.test(l)));
});

test('an icon slot falls to the ink slot of its own part and state, in every state', () => {
  assert.deepEqual(fallbackProblems(shipped()), []);
  const c = shipped();
  assert.equal(c.slots['actions-ghost-root-icon-hover']!.default, '{actions-ghost-root-ink-hover}');
  assert.equal(c.slots['actions-destructive-root-icon-pressed']!.default, '{actions-destructive-root-ink-pressed}');
  assert.equal(c.slots['actions-solid-root-icon-selected-pressed']!.default, '{actions-solid-root-ink-selected-pressed}');
  const back = edit((x) => { x.slots['actions-ghost-root-icon-hover']!.default = '{actions-ghost-root-icon-rest}'; });
  assert.equal(fallbackProblems(back).length, 1);
});

test('a disabled and a selected disabled icon slot fall to the ink of their own state, and keep optional', () => {
  const c = shipped();
  for (const [icon, ink] of [['actions-ghost-root-icon-disabled', 'actions-ghost-root-ink-disabled'],
    ['actions-ghost-root-icon-selected-disabled', 'actions-ghost-root-ink-selected-disabled'],
    ['actions-destructive-root-icon-disabled', 'actions-destructive-root-ink-disabled']] as const) {
    assert.equal(c.slots[icon]!.optional, true);
    assert.equal(c.slots[icon]!.default, `{${ink}}`);
  }
  const rest = edit((x) => { x.slots['actions-ghost-root-icon-disabled']!.default = '{actions-ghost-root-ink-rest}'; });
  assert.deepEqual(fallbackProblems(rest), ['actions-ghost-root-icon-disabled: it falls to {actions-ghost-root-ink-rest} and must fall to actions-ghost-root-ink-disabled']);
  const none = edit((x) => { delete x.slots['actions-ghost-root-icon-selected-disabled']!.default; });
  assert.deepEqual(fallbackProblems(none), ['actions-ghost-root-icon-selected-disabled: an icon slot falls to the ink slot of its own part and state, and this one names no default']);
});

test('the Emphasis family writes each actions chain its options carry (R7)', () => {
  const family = readJson(join(repoRoot, EMPHASIS_FAMILY)) as { variants: Record<string, string> };
  assert.deepEqual(familyProblems(shipped(), family), []);
  const stale = structuredClone(family);
  stale.variants['arena-emphasis-primary'] = stale.variants['arena-emphasis-primary']!.replace('var(--actions-primary-root-fill-rest,', 'var(--emphasis-primary-root-fill-rest,');
  assert.ok(familyProblems(shipped(), stale).some((l) => /arena-emphasis-primary writes --arena-emphasis-fill as var\(--emphasis-primary-root-fill-rest,.*and the chain of actions-primary-root-fill-rest is/.test(l)));
  const silent = structuredClone(family);
  silent.variants['arena-emphasis-primary'] = silent.variants['arena-emphasis-primary']!.replace(/\[--arena-emphasis-edge:[^\]]*\] /, '');
  assert.ok(familyProblems(shipped(), silent).some((l) => l.endsWith('arena-emphasis-primary writes no --arena-emphasis-edge, and actions-primary-root-edge-rest is read through it')));
  const unread = structuredClone(family);
  unread.variants['arena-emphasis-solid'] += ' [--arena-emphasis-edge:var(--actions-solid-root-edge-rest,transparent)]';
  assert.ok(familyProblems(shipped(), unread).some((l) => l.endsWith('arena-emphasis-solid writes --arena-emphasis-edge, and every member part reads actions-solid-root-edge-rest through a channel of its own')));
  const fade = structuredClone(family);
  fade.variants['arena-emphasis-ghost'] = fade.variants['arena-emphasis-ghost']!.replace('var(--actions-ghost-root-fade-disabled,', 'var(--emphasis-ghost-root-fade-disabled,');
  assert.ok(familyProblems(shipped(), fade).some((l) => /arena-emphasis-ghost writes --arena-emphasis-fade-disabled without var\(--actions-ghost-root-fade-disabled,/.test(l)));
});

const declared = () => structuredClone(readSlotDeclarations());
const actionsRoot = (d: SlotDeclarations) => d.groups!.actions!.parts.root!;
const optionOf = (d: SlotDeclarations, opt: string) => (actionsRoot(d).options as Record<string, GroupOption>)[opt]!;

test('an exception the rule already produces is refused', () => {
  const d = declared();
  d.exceptions['actions-primary-root-fill-rest'] = { default: '{emphasis-primary-fill}', decision: 'D19' };
  const lines = exceptionProblems(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /actions-primary-root-fill-rest/);
  assert.match(lines[0] ?? '', /the rule already gives/);
});

test('an exception with no decision is refused', () => {
  const d = declared();
  d.exceptions['actions-ghost-root-fill-hover'] = { default: '{emphasis-ghost-fill-hover}' } as never;
  const lines = exceptionProblems(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /carries no decision/);
});

test('an exception naming no slot is refused', () => {
  const d = declared();
  d.exceptions['actions-nothing-root-fill-hover'] = { default: '{fill-hover}', decision: 'D19' };
  const lines = exceptionProblems(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /names no slot/);
});

test('an unknown declaration key is refused', () => {
  const d = declared();
  (d as any).extra = 1;
  (d.groups!.actions as any).colour = 1;
  (actionsRoot(d) as any).tone = 1;
  (optionOf(d, 'primary') as any).mood = 1;
  (Object.values(d.exceptions)[0] as any).note = 1;
  (d.members!.ArenaButton!.parts.root as any).why = 1;
  assert.equal(declarationProblems(d).length, 6, declarationProblems(d).join('\n'));
});

test('a state set or state that is not declared is refused, on an option, a part or a member part', () => {
  const d = declared();
  optionOf(d, 'primary').states = 'nowhere';
  assert.deepEqual(declarationProblems(d), ['groups.actions.parts.root.options.primary: state set "nowhere" is not declared in stateSets']);
  const e = declared();
  (e.members!.ArenaFileInput!.parts.trigger as MemberDecl).states = ['rest', 'sparkle'];
  assert.deepEqual(declarationProblems(e), ['members.ArenaFileInput.parts.trigger: state "sparkle" is not declared in states']);
  const f = declared();
  (f.members!.ArenaButton!.parts.root as any).states = { '*': 'base' };
  assert.match(declarationProblems(f).join('\n'), /members\.ArenaButton\.parts\.root: its states name a state set or list states/);
});

test('an exception is compared with the rule without that entry alone, and a missing decision is named', () => {
  const d = declared();
  d.exceptions['actions-primary-root-fill-rest'] = { default: '{emphasis-primary-fill}', decision: 'D19' };
  d.exceptions['actions-ghost-root-fill-hover'] = { default: '{emphasis-ghost-fill-hover}' } as never;
  const lines = exceptionProblems(d);
  assert.equal(lines.length, 2);
  assert.ok(lines.some((l) => /carries no decision/.test(l) && !/undefined/.test(l)));
});

test('a redundant exception and one naming no slot are both reported, and nothing throws', () => {
  const d = declared();
  d.exceptions['actions-primary-root-fill-rest'] = { default: '{emphasis-primary-fill}', decision: 'D19' };
  d.exceptions['actions-nothing-root-fill-hover'] = { default: '{fill-hover}', decision: 'D19' };
  let lines: string[] = [];
  assert.doesNotThrow(() => { lines = exceptionProblems(d); });
  assert.equal(lines.length, 2);
  assert.ok(lines.some((l) => /actions-primary-root-fill-rest.*the rule already gives/.test(l)));
  assert.ok(lines.some((l) => /actions-nothing-root-fill-hover.*names no slot/.test(l)));
});

test('the shipped declarations are clean', () => {
  const d = declared();
  assert.deepEqual(declarationProblems(d), []);
  assert.deepEqual(exceptionProblems(d), []);
  assert.deepEqual(memberReadProblems(shipped(), manifests), []);
});

test('a missing states on an option of a part with no states of its own is refused and named', () => {
  const d = declared();
  delete optionOf(d, 'primary').states;
  assert.deepEqual(declarationProblems(d), ['groups.actions.parts.root.options.primary: no states']);
});

test('an option missing its rest answers or a property, a rest on a part with options, a selected key outside fill, ink and edge, and an ink answer off icon are refused', () => {
  const a = declared();
  delete (optionOf(a, 'solid') as Partial<GroupOption>).rest;
  assert.deepEqual(declarationProblems(a), ['groups.actions.parts.root.options.solid: an option of a part that derives slots declares its rest answers (D45)']);
  const b = declared();
  delete optionOf(b, 'solid').rest.edge;
  assert.deepEqual(declarationProblems(b), ['groups.actions.parts.root.options.solid.rest: it answers no edge, and a part that derives slots answers every property it paints (D45)']);
  const c = declared();
  actionsRoot(c).rest = { fill: '{fill-surface}' };
  assert.match(declarationProblems(c).join('\n'), /groups\.actions\.parts\.root: a part with options answers its rest per option/);
  const e = declared();
  (e.selected as any).icon = 'ink';
  assert.equal(declarationProblems(e).length, 1);
  const f = declared();
  optionOf(f, 'ghost').rest.edge = 'ink';
  assert.deepEqual(declarationProblems(f), ['groups.actions.parts.root.options.ghost.rest.edge: the answer "ink" belongs to icon only']);
  const g = declared();
  optionOf(g, 'destructive').channel = 'arena-danger';
  assert.deepEqual(declarationProblems(g), ['groups.actions.parts.root.options.destructive.channel: "arena-danger" is neither null nor a custom property']);
});

test('a group part that answers its rest with no options drops the segment and passes the gate', () => {
  const d = declared();
  const dismiss = d.groups!.actions!.parts.dismiss!;
  dismiss.rest = { fill: 'transparent', ink: '{ink-muted}', icon: 'ink' };
  assert.deepEqual(declarationProblems(d), []);
  assert.ok(Object.hasOwn(deriveSlots(d).slots, 'actions-dismiss-ink-hover'));
});

const coloured = colouredParts();
const mapped = () => structuredClone(readSlotDeclarations());
const mapLines = (d = mapped()) => mapProblems(d, coloured, manifests);

test('the shipped map is clean', () => {
  assert.deepEqual(mapLines(), []);
});

test('a coloured part mapped nowhere is refused', () => {
  const d = mapped();
  delete d.members!.ArenaAlert!.parts.icon;
  const lines = mapLines(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /ArenaAlert\.icon/);
});

test('a null part that paints a role is refused', () => {
  const d = mapped();
  d.members!.ArenaAlert!.parts.icon = null;
  const lines = mapLines(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /ArenaAlert\.icon/);
});

test('a mapping to an undeclared group part is refused', () => {
  const d = mapped();
  d.members!.ArenaAlert!.parts.icon = 'feedback.nothing';
  assert.match(mapLines(d).join('\n'), /ArenaAlert\.icon.*feedback\.nothing/);
  d.members!.ArenaAlert!.parts.icon = 'nowhere.icon';
  assert.match(mapLines(d).join('\n'), /nowhere/);
});

test('a property the group part does not paint is refused', () => {
  const d = mapped();
  d.groups!.feedback!.parts.icon!.properties = ['edge'];
  assert.match(mapLines(d).join('\n'), /ArenaAlert\.icon.*paints/);
});

test('an option the group part does not list, an undeclared home group and a part the manifest lacks are refused', () => {
  const d = mapped();
  d.members!.ArenaCalendar!.parts.nav = 'actions.root@loud';
  assert.match(mapLines(d).join('\n'), /ArenaCalendar\.nav.*loud/);
  const e = mapped();
  e.members!.ArenaAlert!.group = 'nowhere';
  assert.match(mapLines(e).join('\n'), /ArenaAlert.*nowhere/);
  const f = mapped();
  f.members!.ArenaAlert!.parts.ghost = 'feedback.icon';
  assert.match(mapLines(f).join('\n'), /ArenaAlert\.ghost/);
  const g = mapped();
  delete g.members!.ArenaAlert;
  assert.match(mapLines(g).join('\n'), /ArenaAlert/);
});

test('a group part no member part maps onto is refused', () => {
  const d = mapped();
  d.groups!.feedback!.parts.orphan = { properties: ['fill'], states: 'static' };
  assert.match(mapLines(d).join('\n'), /feedback\.parts\.orphan/);
});

test('the map ships its stateSets and its declarations are known keys', () => {
  const d = mapped();
  for (const s of ['static', 'static-disabled', 'toggle']) assert.ok(d.stateSets[s]);
  assert.deepEqual(declarationProblems(d), []);
});

test('an orphan group part without paintedBy is refused, and paintedBy on a mapped part or at a missing path is refused', () => {
  const d = mapped();
  delete (d.groups!.charts!.parts.heat as any).paintedBy;
  assert.match(mapLines(d).join('\n'), /charts\.parts\.heat/);
  const e = mapped();
  (e.groups!.feedback!.parts.icon as any).paintedBy = 'frameworks/react/DataVisuals.ts';
  assert.match(mapLines(e).join('\n'), /feedback\.parts\.icon.*paintedBy/);
  const f = mapped();
  (f.groups!.charts!.parts.heat as any).paintedBy = 'frameworks/nowhere.ts';
  assert.match(mapLines(f).join('\n'), /charts\.parts\.heat.*nowhere/);
});

test('paintedBy may be a list, and each path of it must exist', () => {
  const d = mapped();
  (d.groups!.charts!.parts.heat as any).paintedBy = ['frameworks/react/DataVisuals.ts', 'frameworks/angular/DataVisuals.ts'];
  assert.deepEqual(mapLines(d), []);
  (d.groups!.charts!.parts.heat as any).paintedBy = ['frameworks/react/DataVisuals.ts', 'frameworks/nowhere.ts'];
  assert.match(mapLines(d).join('\n'), /charts\.parts\.heat.*nowhere/);
  (d.groups!.charts!.parts.heat as any).paintedBy = [];
  assert.match(mapLines(d).join('\n'), /charts\.parts\.heat/);
  (d.groups!.charts!.parts.heat as any).paintedBy = '';
  assert.match(mapLines(d).join('\n'), /charts\.parts\.heat.*no file/);
  (d.groups!.charts!.parts.heat as any).paintedBy = ['frameworks/react'];
  assert.match(mapLines(d).join('\n'), /charts\.parts\.heat.*no file/);
});

test('a null part on a part that paints no colour at all is refused', () => {
  const d = mapped();
  d.members!.ArenaAlert!.parts.body = null;
  assert.match(mapLines(d).join('\n'), /ArenaAlert\.body.*paints no colour/);
});

test('every shipped paintedBy path names a file that paints the part', () => {
  const read = (p: string) => readFileSync(p, 'utf8').split('\n').filter((l) => !/^\s*import\b/.test(l)).join('\n');
  const needle: Record<string, RegExp> = { heat: /arenaHeatFill\(/, tick: /ARENA_INK_MUTED/, axis: /--edge-axis/, grid: /--edge-separator/, halo: /--fill-surface/, track: /--fill-track/ };
  for (const [part, re] of Object.entries(needle)) {
    const by = mapped().groups!.charts!.parts[part]!.paintedBy;
    const paths = typeof by === 'string' ? [by] : by ?? [];
    assert.ok(paths.length > 0, part);
    for (const p of paths) assert.match(read(p), re, `${part}: ${p}`);
  }
});

test('a component-scoped slot is refused', () => {
  const withComponents = { ...declared(), components: { ArenaButton: { root: { family: 'emphasis', options: ['primary'], states: 'base' } } } };
  assert.ok(declarationProblems(withComponents as never).some((line) => /unknown key "components"/.test(line)));
  const withFamilies = { ...declared(), families: { emphasis: { channel: '--arena-emphasis-{property}' } } };
  assert.ok(declarationProblems(withFamilies as never).some((line) => /unknown key "families"/.test(line)));
  for (const key of ['component', 'family', 'draws'] as const) {
    const c = edit((x) => { (x.slots['actions-primary-root-fill-rest'] as Record<string, unknown>)[key] = key === 'draws' ? 'ArenaIconButton.root' : 'ArenaButton'; });
    assert.ok(shapeProblems(c).some((line) => line.startsWith(`actions-primary-root-fill-rest: a slot belongs to a group and names no ${key}`)), `${key}: ${shapeProblems(c).join('\n')}`);
  }
});

test('a member default with no decision is refused', () => {
  const d = declared();
  delete (d.members!.ArenaIconButton!.parts.root as { decision?: string }).decision;
  const lines = declarationProblems(d);
  assert.ok(lines.some((line) => line === 'members.ArenaIconButton.parts.root: it declares defaults and carries no decision, and needs D<n> or R<n>'), lines.join('\n'));
  const e = declared();
  (e.members!.ArenaIconButton!.parts.root as { decision?: string }).decision = 'because';
  assert.ok(declarationProblems(e).some((line) => /members\.ArenaIconButton\.parts\.root: its decision "because" is neither D<n> nor R<n>/.test(line)));
});

const withDefault = (name: string, value: string) => edit((c) => { c.members['ArenaIconButton.root']!.defaults = { [name]: value }; });
const GHOST_EDGE = 'actions-ghost-root-edge-rest';

test('the shipped member default is clean', () => {
  assert.deepEqual(memberDefaultProblems(shipped(), roles), []);
});

test('a member default whose value is not a role its slot accepts is refused', () => {
  assert.ok(memberDefaultProblems(withDefault(GHOST_EDGE, '{ink-body}'), roles).some((l) => /ink-body/.test(l) && /edge accepts/.test(l)));
  assert.ok(memberDefaultProblems(withDefault(GHOST_EDGE, '{edge-focus}'), roles).some((l) => /edge-focus/.test(l)));
  assert.ok(memberDefaultProblems(withDefault(GHOST_EDGE, '#ff0000'), roles).some((l) => /#ff0000/.test(l)));
});

test('a member default on a slot of another part or an option the member does not list is refused', () => {
  const lines = memberDefaultProblems(withDefault('actions-primary-root-fill-rest', '{emphasis-primary-fill}'), roles);
  assert.ok(lines.some((l) => /actions-primary-root-fill-rest/.test(l) && /option primary/.test(l)), lines.join('\n'));
  const other = edit((c) => { c.members['ArenaIconButton.root']!.to = 'actions.other'; c.members['ArenaIconButton.root']!.defaults = { [GHOST_EDGE]: '{emphasis-ghost-icon-edge}' }; });
  assert.ok(memberDefaultProblems(other, roles).some((l) => /actions-ghost-root-edge-rest/.test(l) && /actions\.other/.test(l)));
});

test('a member default on a slot whose state the member does not list is refused', () => {
  const c = withDefault(GHOST_EDGE, '{emphasis-ghost-icon-edge}');
  c.members['ArenaIconButton.root']!.states = ['hover', 'pressed'] as never;
  assert.ok(memberDefaultProblems(c, roles).some((l) => /actions-ghost-root-edge-rest/.test(l) && /state rest/.test(l)));
});

test('a member default on a slot that derives is refused', () => {
  const lines = memberDefaultProblems(withDefault('actions-ghost-root-edge-hover', '{emphasis-ghost-icon-edge}'), roles);
  assert.ok(lines.some((l) => /actions-ghost-root-edge-hover/.test(l) && /rest/.test(l)), lines.join('\n'));
});

test('a member default equal to the group default is refused as redundant', () => {
  const lines = memberDefaultProblems(withDefault(GHOST_EDGE, 'transparent'), roles);
  assert.ok(lines.some((l) => /actions-ghost-root-edge-rest/.test(l) && /already/.test(l)), lines.join('\n'));
});

const boxDeclared = (): SlotDeclarations => slotFixture({
  box: { properties: ['fill'], states: 'light', rest: { fill: '{fill-control}' } },
  field: {
    properties: ['edge'],
    states: 'plain',
    options: { plain: { rest: { edge: '{edge-control}' } }, error: { rest: { edge: '{edge-danger}' }, halo: 'level-hue-soft-danger' } },
  },
  fill: { properties: ['fill'], states: 'on', rest: { fill: '{fill-control}' } },
  calm: { properties: ['fill'], states: 'plain', options: { only: { rest: { fill: '{fill-control}' } } } },
}, {
  ArenaBox: { group: 'choices', parts: { box: { to: 'choices.box', options: [], states: 'light', selectedBy: { axis: 'checked', value: 'true' } } } },
  ArenaField: {
    group: 'choices',
    parts: { field: { to: 'choices.field', options: ['plain', 'error'], states: 'plain', optionBy: { axis: 'state', values: { error: 'error' } } } },
  },
  ArenaRange: { group: 'choices', parts: { fill: { to: 'choices.fill', options: [], states: 'on', selectedBy: { axis: 'checked', value: 'true' } } } },
  ArenaCalm: { group: 'choices', parts: { calm: { to: 'choices.calm', options: ['only'], states: 'plain' } } },
}, 'choices');

const boxManifest = (c: SlotCatalogue) => fixtureManifests(c);

test('a fixed-option member and an axis member are accepted', () => {
  const c = deriveSlots(boxDeclared());
  const m = boxManifest(c);
  assert.deepEqual(declarationProblems(boxDeclared()), []);
  assert.deepEqual(manifestProblems(c, m), []);
  assert.deepEqual(pairProblems(c, boxDeclared()), []);
  const noAxis = structuredClone(c);
  noAxis.members['ArenaField.field']!.optionBy = { axis: 'state', values: { error: 'nothing' } };
  assert.ok(manifestProblems(noAxis, m).some((l) => /ArenaField\.field/.test(l)));
  const gone = structuredClone(c);
  gone.members['ArenaBox.box']!.selectedBy = { axis: 'toggled', value: 'true' };
  assert.ok(manifestProblems(gone, m).some((l) => /ArenaBox\.box: ArenaBox declares no variant toggled=true/.test(l)));
});

test('a member read that differs from its chain is refused', () => {
  const c = deriveSlots(boxDeclared());
  const m = boxManifest(c);
  assert.deepEqual(memberReadProblems(c, m), []);
  const swapped = boxManifest(c);
  const box = swapped.get('ArenaBox') as unknown as { slots: { box: string } };
  box.slots.box = box.slots.box.replace('hover:bg-[color:', 'hover:text-[color:');
  assert.deepEqual(memberReadProblems(c, swapped), ['ArenaBox.box: choices-box-fill-hover is not read as hover:bg-[color:' + memberValue(c, 'ArenaBox.box', 'choices-box-fill-hover', 'tailwind') + '] in the base class']);
  const wrongBranch = boxManifest(c);
  (wrongBranch.get('ArenaField') as { variants: Record<string, Record<string, Record<string, string>>> }).variants.state!.error!.field = '';
  const lines = memberReadProblems(c, wrongBranch);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => /^ArenaField\.field: choices-error-field-edge-(rest|hover) is not read as .* in the state=error branch$/.test(l)), lines.join('\n'));
  const noRest = boxManifest(c);
  (noRest.get('ArenaRange') as unknown as { slots: { fill: string } }).slots.fill = '';
  assert.equal(memberReadProblems(c, noRest).length, 1, 'a member with no rest paints its first state with no branch');
  const channelled = structuredClone(c);
  channelled.members['ArenaBox.box']!.channels = { fill: '--arena-box-fill' };
  assert.deepEqual(memberReadProblems(channelled, new Map()), [], 'a member with channels is readProblems\'s');
});

test('a member that is no native control reads its disabled states in its disabled=true branch (D71)', () => {
  const spanOf = (disabledBy?: { axis: string; value: string }) => slotFixture(
    { box: { properties: ['fill'], states: ['rest', 'disabled'], rest: { fill: '{fill-control}' } } },
    { ArenaSpan: { group: 'choices', parts: { box: { to: 'choices.box', options: [], states: ['rest', 'disabled'], ...(disabledBy ? { disabledBy } : {}) } } } },
    'choices',
  );
  const d = spanOf({ axis: 'disabled', value: 'true' });
  assert.deepEqual(declarationProblems(d), []);
  const c = deriveSlots(d);
  const value = (state: string) => `bg-[color:${memberValue(c, 'ArenaSpan.box', `choices-box-fill-${state}`, 'tailwind')}]`;
  const manifest = (base: string, branch?: string) => new Map([['ArenaSpan', {
    component: 'ArenaSpan', slots: { box: base }, variants: branch === undefined ? {} : { disabled: { true: { box: branch }, false: {} } },
  } as never]]);
  assert.deepEqual(memberReadProblems(c, manifest(value('rest'), value('disabled'))), []);
  assert.deepEqual(manifestProblems(c, manifest(value('rest'), value('disabled'))), []);
  assert.deepEqual(memberReadProblems(c, manifest(`${value('rest')} disabled:${value('disabled')}`, '')),
    [`ArenaSpan.box: choices-box-fill-disabled is not read as ${value('disabled')} in the disabled=true branch`]);
  assert.ok(manifestProblems(c, manifest(value('rest'))).some((l) => /members\.ArenaSpan\.box: ArenaSpan declares no variant disabled=true/.test(l)));
  const native = deriveSlots(spanOf());
  const nativeValue = (state: string) => `bg-[color:${memberValue(native, 'ArenaSpan.box', `choices-box-fill-${state}`, 'tailwind')}]`;
  assert.deepEqual(memberReadProblems(native, manifest(`${nativeValue('rest')} disabled:${nativeValue('disabled')}`)), [], 'a native control reads them under disabled:');
  const shared = spanOf({ axis: 'disabled', value: 'true' });
  (shared.members!.ArenaSpan!.parts.box as MemberDecl).selectedBy = { axis: 'disabled', value: 'true' };
  assert.match(declarationProblems(shared).join('\n'), /ArenaSpan\.parts\.box\.disabledBy: it shares the axis disabled with selectedBy/);
});

test('an exception level, a halo, an on and a member axis are checked as declarations', () => {
  const d = boxDeclared();
  d.exceptions['choices-calm-only-fill-hover'] = { default: '{fill-surface}', decision: 'D1', level: 'nope' };
  assert.match(declarationProblems(d).join('\n'), /exceptions\.choices-calm-only-fill-hover\.level: "nope" is no level/);
  const e = boxDeclared();
  (e.groups!.choices!.parts.field!.options as Record<string, GroupOption>).error!.halo = 'soft';
  assert.match(declarationProblems(e).join('\n'), /options\.error\.halo: "soft" is no level/);
  const f = boxDeclared();
  f.groups!.choices!.parts.box!.on = 'field';
  assert.match(declarationProblems(f).join('\n'), /parts\.box\.on: "field" is no part of choices that paints a fill/);
  const g = boxDeclared();
  (g.groups!.choices!.parts.box as any).selectedOn = 'hover';
  assert.match(declarationProblems(g).join('\n'), /parts\.box\.selectedOn: "hover" is not "rest"/);
  const h = boxDeclared();
  (h.members!.ArenaField!.parts.field as MemberDecl).optionBy = { axis: 'state', values: { error: 'missing' } };
  assert.match(declarationProblems(h).join('\n'), /ArenaField\.parts\.field\.optionBy: "missing" is not an option the member lists/);
  const i = boxDeclared();
  i.groups!.choices!.parts.field!.states = 'base';
  (i.groups!.choices!.parts.field as any).selected = { edge: '{x}' };
  assert.match(declarationProblems(i).join('\n'), /parts\.field\.selected: .* no selected state/);
  const j = boxDeclared();
  ((j.groups!.choices!.parts.field!.options as Record<string, GroupOption>).error as Record<string, unknown>).selected = { edge: '{edge-selected}' };
  assert.match(declarationProblems(j).join('\n'), /options\.error: unknown key "selected"/, 'an option declares no selected answers; the part and the top level do');
});

test('an exception whose level alone differs is an exception', () => {
  const d = boxDeclared();
    d.groups!.choices!.parts.calm!.options = { only: { rest: { fill: { role: '{fill-control}', level: 'level-a' } } } };
  const base = deriveSlots(d).slots['choices-only-calm-fill-rest']!;
  d.exceptions['choices-only-calm-fill-rest'] = { default: base.default as string, decision: 'D1' };
  assert.deepEqual(exceptionProblems(d), [], 'dropping the level changes the slot');
  d.exceptions['choices-only-calm-fill-rest'] = { default: base.default as string, decision: 'D1', level: 'level-a' };
  assert.match(exceptionProblems(d).join('\n'), /the rule already gives/);
});

test('a slot sits on what the declarations give, no looser', () => {
  const d = boxDeclared();
  const calm = d.groups!.choices!.parts.calm!;
  calm.properties = ['fill', 'ink'];
  (calm.options as Record<string, GroupOption>).only!.rest.ink = '{ink-body}';
  calm.on = 'box';
  const c = deriveSlots(d);
  assert.equal(c.slots['choices-only-calm-ink-rest']?.on, 'choices-only-calm-fill-rest', 'a glyph sits on its own part\'s fill (D69)');
  assert.equal(c.slots['choices-only-calm-fill-rest']?.on, 'choices-box-fill-rest');
  assert.deepEqual(pairProblems(c, d), []);
  const sibling = structuredClone(c);
  sibling.slots['choices-only-calm-ink-rest']!.on = 'choices-box-fill-rest';
  assert.match(pairProblems(sibling, d).join('\n'), /choices-only-calm-ink-rest: it sits on choices-box-fill-rest and the declarations give choices-only-calm-fill-rest/);
  const e = boxDeclared();
  const sel = deriveSlots(e);
  sel.slots['choices-box-fill-selected']!.on = 'choices-box-fill-rest';
  assert.match(pairProblems(sel, e).join('\n'), /choices-box-fill-selected: it sits on choices-box-fill-rest and the declarations give nothing/);
});

test('the dismiss and string members read their chains', () => {
  const c = shipped();
  assert.deepEqual(memberReadProblems(c, manifests), []);
  for (const key of ['ArenaAlert.close', 'ArenaCombobox.clear', 'ArenaCalendar.nav', 'ArenaCalendar.today', 'ArenaPagination.nav', 'ArenaBulkActionBar.action', 'ArenaConfirmDialog.confirm', 'ArenaOnboarding.next']) {
    assert.ok(c.members[key], `${key} is a member part object`);
  }
  const old = structuredClone(manifests.get('ArenaCalendar')) as unknown as { slots: { nav: string } };
  old.slots.nav = 'inline-flex items-center justify-center h-ctl-h-sm min-w-ctl-h-sm bg-transparent border-[length:var(--bw-control)] border-edge-control-quiet rounded-control text-ink-body/(--level-ink-body)';
  const lines = memberReadProblems(c, new Map([...manifests, ['ArenaCalendar', old as never]]));
  assert.ok(lines.length > 0 && lines.every((l) => l.startsWith('ArenaCalendar.nav: ')), lines.join('\n'));
  assert.ok(lines.some((l) => /actions-secondary-nav-fill-rest|actions-secondary-root-fill-rest/.test(l)), lines.join('\n'));
});

test('an inline member reads its chains and a channelled one reads its channel', () => {
  const c = shipped();
  assert.equal(c.members['ArenaCalendar.nav']?.inline, true);
  assert.deepEqual(readProblems(c, manifests), []);
  const channelled = structuredClone(c);
  delete channelled.members['ArenaCalendar.nav']!.inline;
  assert.ok(readProblems(channelled, manifests).some((l) => l.startsWith('ArenaCalendar.nav does not read --arena-emphasis-')));
  assert.deepEqual(memberReadProblems(channelled, manifests), [], 'a channelled member is readProblems\'s');
});

test('the ring of an error or valid field reads the halo of its edge', () => {
  const c = readColorSlots();
  const ring = (comp: string, part: string, option: string) => {
    const axis = [c.members[`${comp}.${part}`]!.optionBy].flat().find((one) => Object.values(one!.values).includes(option))!;
    const value = Object.entries(axis.values).find(([, o]) => o === option)![0];
    const text = (manifests.get(comp)!.variants as Record<string, Record<string, Record<string, string>>>)[axis.axis]![value]![part]!;
    return text.split(/\s+/).includes(`ring-[color:${haloValue(c, `${comp}.${part}`, option)}]`);
  };
  for (const [comp, part, options] of [
    ['ArenaInput', 'field', ['error', 'valid']], ['ArenaCombobox', 'field', ['error', 'valid']], ['ArenaNumberField', 'field', ['error', 'valid']],
    ['ArenaPinInput', 'cell', ['error', 'valid']], ['ArenaSelect', 'field', ['error', 'valid']], ['ArenaTextarea', 'field', ['error']],
  ] as const) for (const option of options) assert.ok(ring(comp, part, option), `${comp}.${part} ${option}: the ring reads haloValue`);
});

const fieldDeclared = (members: NonNullable<SlotDeclarations['members']>): SlotDeclarations => slotFixture({
  field: {
    properties: ['fill', 'edge'], states: 'plain',
    options: {
      plain: { rest: { fill: '{fill-field}', edge: '{edge-field}' } },
      error: { rest: { fill: '{fill-field}', edge: '{edge-danger}' } },
      readonly: { properties: ['fill'], rest: { fill: '{fill-surface}' } },
    },
  },
}, members, 'choices');

const fieldMember = (extra: Partial<MemberDecl>): NonNullable<SlotDeclarations['members']> => ({
  ArenaField: { group: 'choices', parts: { field: { to: 'choices.field', options: ['plain', 'error', 'readonly'], states: 'plain', ...extra } } },
});

const fieldManifest = (variants: Record<string, unknown>, base = '') => new Map([['ArenaField', {
  component: 'ArenaField', slots: { field: base }, variants,
} as never]]);

const reads = (c: SlotCatalogue, option: string, property: 'fill' | 'edge') => ['rest', 'hover'].map((state) => {
  const name = `choices-${option}-field-${property}-${state}`;
  return `${state === 'hover' ? 'hover:' : ''}${property === 'fill' ? 'bg-[color:' : 'border-[color:'}${memberValue(c, 'ArenaField.field', name, 'tailwind')}]`;
}).join(' ');

test('a member may paint a subset of its part\'s properties and name a second option axis', () => {
  const d = fieldDeclared(fieldMember({
    properties: ['fill', 'edge'],
    optionBy: [{ axis: 'state', values: { plain: 'plain', error: 'error' } }, { axis: 'readOnly', values: { true: 'readonly' } }],
  }));
  assert.deepEqual(declarationProblems(d), []);
  const c = deriveSlots(d);
  const m = fieldManifest({
    state: { plain: { field: `${reads(c, 'plain', 'fill')} ${reads(c, 'plain', 'edge')}` }, error: { field: `${reads(c, 'error', 'fill')} ${reads(c, 'error', 'edge')}` } },
    readOnly: { true: { field: reads(c, 'readonly', 'fill') } },
  });
  assert.deepEqual(memberReadProblems(c, m), []);
  assert.deepEqual(manifestProblems(c, m), []);
  const noReadOnly = fieldManifest({ state: (m.get('ArenaField') as unknown as { variants: Record<string, unknown> }).variants.state, readOnly: { true: { field: '' } } });
  assert.equal(memberReadProblems(c, noReadOnly).length, 2);
  assert.ok(memberReadProblems(c, noReadOnly).every((l) => /choices-readonly-field-fill-(rest|hover) is not read as .* in the readOnly=true branch$/.test(l)));
  const wrongProperty = fieldDeclared(fieldMember({ properties: ['ink'] }));
  assert.match(declarationProblems(wrongProperty).join('\n'), /ArenaField\.parts\.field\.properties: "ink" is a property choices\.field does not paint/);
  const sameAxis = fieldDeclared(fieldMember({ optionBy: [{ axis: 'state', values: { error: 'error' } }, { axis: 'state', values: { true: 'readonly' } }] }));
  assert.match(declarationProblems(sameAxis).join('\n'), /optionBy: the axis state is named twice/);
});

test('a member may read its hover inside a branch (D68)', () => {
  const d = fieldDeclared(fieldMember({
    options: ['plain'], states: ['rest', 'hover'], properties: ['fill'], hoverBy: { axis: 'dragging', value: 'true' },
  }));
  assert.deepEqual(declarationProblems(d), []);
  const c = deriveSlots(d);
  const rest = `bg-[color:${memberValue(c, 'ArenaField.field', 'choices-plain-field-fill-rest', 'tailwind')}]`;
  const hover = `bg-[color:${memberValue(c, 'ArenaField.field', 'choices-plain-field-fill-hover', 'tailwind')}]`;
  const m = (branch: string, base = rest) => new Map([['ArenaField', {
    component: 'ArenaField', slots: { field: base }, variants: { dragging: { true: { field: branch }, false: {} } },
  } as never]]);
  assert.deepEqual(memberReadProblems(c, m(hover)), []);
  assert.deepEqual(manifestProblems(c, m(hover)), []);
  assert.deepEqual(memberReadProblems(c, m(`hover:${hover}`)),
    [`ArenaField.field: choices-plain-field-fill-hover is not read as ${hover} in the dragging=true branch`]);
  assert.ok(manifestProblems(c, new Map([['ArenaField', { component: 'ArenaField', slots: { field: rest }, variants: {} } as never]]))
    .some((l) => /ArenaField declares no variant dragging=true/.test(l)));
  const shared = fieldDeclared(fieldMember({ options: ['plain'], states: ['rest', 'hover'], hoverBy: { axis: 'dragging', value: 'true' }, selectedBy: { axis: 'dragging', value: 'true' } }));
  assert.match(declarationProblems(shared).join('\n'), /hoverBy: it shares the axis dragging with selectedBy/);
});

test('a member may paint only where an axis holds, and read its text from another group part', () => {
  const ok = fieldDeclared(fieldMember({ options: ['plain', 'error'], states: ['rest'], properties: ['edge'], optionBy: { axis: 'state', values: { plain: 'plain', error: 'error' } }, onlyBy: { axis: 'droppable', value: 'true' } }));
  assert.deepEqual(declarationProblems(ok), []);
  const c = deriveSlots(ok);
  const edge = (option: string) => `border-[color:${memberValue(c, 'ArenaField.field', `choices-${option}-field-edge-rest`, 'tailwind')}]`;
  const m = (error: string) => new Map([['ArenaField', {
    component: 'ArenaField', slots: { field: '' }, variants: { state: { plain: {}, error: {} }, droppable: { true: {} } },
    compoundVariants: [{ droppable: true, state: 'plain', class: { field: edge('plain') } }, { droppable: true, state: 'error', class: { field: error } }],
  } as never]]);
  assert.deepEqual(memberReadProblems(c, m(edge('error'))), []);
  assert.deepEqual(manifestProblems(c, m(edge('error'))), []);
  assert.deepEqual(memberReadProblems(c, m('')), [`ArenaField.field: choices-error-field-edge-rest is not read as ${edge('error')} in the droppable=true branch and the state=error branch`]);
  const sameAxis = fieldDeclared(fieldMember({ options: ['plain'], onlyBy: { axis: 'state', value: 'true' }, optionBy: { axis: 'state', values: { plain: 'plain' } } }));
  assert.match(declarationProblems(sameAxis).join('\n'), /onlyBy: it shares the axis state with optionBy/);
});

test('the shipped fields read their text from fields.value, and a missing read is refused (D74)', () => {
  const c = readColorSlots();
  assert.deepEqual(memberReadProblems(c, manifests), []);
  const dropped = structuredClone(manifests) as Map<string, any>;
  dropped.get('ArenaSelect').slots.field = dropped.get('ArenaSelect').slots.field.replace(/text-\[color:var\(--fields-value-ink-rest[^\s]*/, '');
  assert.match(memberReadProblems(c, dropped).join('\n'), /ArenaSelect\.field: its ink is not read from fields\.value/);
});

test('a field fades and hovers by its own option, and the compounds that carry them are ordered (I1, I2, m1)', () => {
  const c = readColorSlots();
  const compounds = (comp: string) => (manifests.get(comp) as any).compoundVariants as { class: Record<string, string>; [key: string]: unknown }[];
  for (const comp of ['ArenaInput', 'ArenaNumberField']) {
    const last = compounds(comp).at(-1)!;
    assert.deepEqual([last.readOnly, last.disabled], [true, true], `${comp}: the readonly and disabled compound comes last, so it wins the fade of a valid field`);
  }
  for (const comp of ['ArenaInput', 'ArenaNumberField', 'ArenaCombobox']) {
    for (const cv of compounds(comp)) {
      if (cv.class.field === undefined) continue;
      const tokens = cv.class.field.split(/\s+/);
      for (const t of tokens.filter((one) => /^(border|bg)-\[color:/.test(one))) assert.ok(tokens.includes(`hover:${t}`), `${comp}: a disabled read has a hover twin, so a hovered disabled field keeps its answer`);
    }
  }
  const zone = compounds('ArenaFileInput');
  for (const cv of zone) assert.ok(typeof cv.state === 'string' && cv.droppable === true, 'a zone compound names its state, so an error zone never takes a neutral compound');
  for (const state of ['neutral', 'error']) {
    const kinds = zone.filter((cv) => cv.state === state).map((cv) => (cv.disabled ? 'disabled' : cv.dragging ? 'dragging' : 'rest'));
    assert.deepEqual(kinds, ['rest', 'dragging', 'disabled'], `${state}: where() carries no specificity, so the rest compound comes first and a drag or a disable overrides it`);
  }
  assert.equal(c.members['ArenaFileInput.zone']?.onlyBy?.axis, 'droppable');
});

const twinDeclared = () => {
  const d = fieldDeclared(fieldMember({ optionBy: [{ axis: 'state', values: { plain: 'plain', error: 'error' } }, { axis: 'readOnly', values: { true: 'readonly' } }] }));
  (d.groups!.choices!.parts.field!.options as Record<string, GroupOption>).readonly!.states = ['rest'];
  return d;
};
const twinRead = (c: SlotCatalogue, name: string, hover: boolean) =>
  `${hover ? 'hover:' : ''}${name.includes('-fill-') ? 'bg-[color:' : 'border-[color:'}${memberValue(c, 'ArenaField.field', name, 'tailwind')}]`;
const twinManifest = (c: SlotCatalogue, readonly: string, compound: (option: string) => string) => new Map([['ArenaField', {
  component: 'ArenaField', slots: { field: '' },
  variants: {
    state: { plain: { field: `${reads(c, 'plain', 'fill')} ${reads(c, 'plain', 'edge')}` }, error: { field: `${reads(c, 'error', 'fill')} ${reads(c, 'error', 'edge')}` } },
    readOnly: { true: { field: readonly } },
  },
  compoundVariants: ['plain', 'error'].map((option) => ({ readOnly: true, state: option, class: { field: compound(option) } })),
} as never]]);

test('an option that derives no hover holds its rest under hover, and the edge it does not paint holds the other option\'s rest (D73)', () => {
  const d = twinDeclared();
  assert.deepEqual(declarationProblems(d), []);
  const c = deriveSlots(d);
  assert.equal(c.slots['choices-readonly-field-fill-hover'], undefined, 'the readonly option derives no hover');
  const rest = twinRead(c, 'choices-readonly-field-fill-rest', false);
  const fill = twinRead(c, 'choices-readonly-field-fill-rest', true);
  const edge = (option: string) => twinRead(c, `choices-${option}-field-edge-rest`, true);
  assert.deepEqual(memberReadProblems(c, twinManifest(c, `${rest} ${fill}`, edge)), []);
  assert.deepEqual(memberReadProblems(c, twinManifest(c, rest, edge)),
    [`ArenaField.field: choices-readonly-field-fill-rest is not held as ${fill} in the readOnly=true branch, so a hovered readonly field takes another option's hover (D73)`]);
  assert.deepEqual(memberReadProblems(c, twinManifest(c, `${rest} ${fill}`, (option) => (option === 'error' ? '' : edge(option)))),
    [`ArenaField.field: choices-error-field-edge-rest is not held as ${edge('error')} in the readOnly=true branch and the state=error branch, so a hovered readonly field takes another option's hover (D73)`]);
  const hovering = fieldDeclared(fieldMember({ optionBy: [{ axis: 'state', values: { plain: 'plain', error: 'error' } }, { axis: 'readOnly', values: { true: 'readonly' } }] }));
  const h = deriveSlots(hovering);
  assert.ok(memberReadProblems(h, twinManifest(h, `${twinRead(h, 'choices-readonly-field-fill-rest', false)} ${twinRead(h, 'choices-readonly-field-fill-hover', true)}`, () => ''))
    .every((l) => !/held as/.test(l)), 'an option that derives its own hover needs no twin');
});

test('the shipped readonly fields hold their rest under hover (D73)', () => {
  const c = readColorSlots();
  for (const comp of ['ArenaInput', 'ArenaNumberField', 'ArenaTextarea']) {
    const branch = (manifests.get(comp) as any).variants.readOnly.true.field as string;
    const want = `hover:bg-[color:${memberValue(c, `${comp}.field`, 'fields-readonly-field-fill-rest', 'tailwind')}]`;
    assert.ok(branch.split(/\s+/).includes(want), `${comp}: the readOnly=true branch holds ${want}`);
  }
  const dropped = structuredClone(manifests) as Map<string, any>;
  const input = dropped.get('ArenaInput').variants.readOnly.true;
  input.field = input.field.split(/\s+/).filter((t: string) => !t.startsWith('hover:')).join(' ');
  assert.match(memberReadProblems(c, dropped).join('\n'), /ArenaInput\.field: fields-readonly-field-fill-rest is not held as hover:/);
});

test('a channel-less member that reads a disabled slot and fades carries that slot\'s marker fade (D8)', () => {
  const c = readColorSlots();
  assert.deepEqual(fadeProblems(c, manifests), []);
  const plain = (comp: string, at: (m: any) => Record<string, string>, part: string) => {
    const broken = structuredClone(manifests) as Map<string, any>;
    const where = at(broken.get(comp));
    where[part] = where[part]!.replace(/opacity-\[var\(--[a-z0-9-]+-fade-disabled,var\(--fade-disabled\)\)\]/, 'opacity-[var(--fade-disabled)]');
    return fadeProblems(c, broken);
  };
  assert.deepEqual(plain('ArenaPagination', (m) => m.slots, 'nav'),
    ['ArenaPagination.nav: it reads actions-secondary-root-edge-disabled and fades, and no class of the base class or a branch under it carries opacity-[var(--actions-secondary-root-fade-disabled,var(--fade-disabled))], so an answered disabled slot never stops the fade (D8)']);
  assert.deepEqual(plain('ArenaConfirmDialog', (m) => m.variants.destructive.true, 'confirm'),
    ['ArenaConfirmDialog.confirm: it reads actions-destructive-root-edge-disabled and fades, and no class of the destructive=true branch or a branch under it carries opacity-[var(--actions-destructive-root-fade-disabled,var(--fade-disabled))], so an answered disabled slot never stops the fade (D8)']);
  assert.match(plain('ArenaTag', (m) => m.variants.disabled.true, 'close').join('\n'), /^ArenaTag\.close: it reads actions-dismiss-[a-z]+-disabled and fades, .*--actions-dismiss-fade-disabled/);
  const still = structuredClone(manifests) as Map<string, any>;
  still.get('ArenaPagination').slots.nav = still.get('ArenaPagination').slots.nav.split(/\s+/).filter((t: string) => !t.includes('opacity-')).join(' ');
  assert.deepEqual(fadeProblems(c, still), [], 'a member that never fades has no fade an answer could stop');
});

test('ArenaTag.close is no native control and reads its disabled states in its disabled=true branch (D71)', () => {
  const c = readColorSlots();
  assert.deepEqual(c.members['ArenaTag.close']?.disabledBy, { axis: 'disabled', value: 'true' });
  const close = (manifests.get('ArenaTag') as any).slots.close as string;
  assert.ok(!/(^|\s)disabled:/.test(close), 'the close carries aria-disabled, so a disabled: read never matches');
  const branch = (manifests.get('ArenaTag') as any).variants.disabled.true.close as string;
  for (const token of branch.split(/\s+/).filter((t) => /^(bg|text)-\[color:|^\[--arena-icon-ink:/.test(t))) {
    for (const modifier of ['hover:', 'active:']) assert.ok(branch.split(/\s+/).includes(`${modifier}${token}`), `${modifier}${token}: a hovered or pressed disabled close keeps its disabled answer`);
  }
});

test('Switch.icon paints the knob ink alone, inside the knob that paints its fill and edge', () => {
  const c = readColorSlots();
  assert.deepEqual(c.members['ArenaSwitch.icon']?.properties, ['ink']);
  const sw = manifests.get('ArenaSwitch') as any;
  for (const text of [sw.slots.icon, sw.variants.state.true.icon] as string[]) assert.ok(!/(^|\s)(bg|border)-\[color:/.test(text), text);
});

const crumbDeclared = (extra: Partial<MemberDecl>, properties: ('fill' | 'ink' | 'edge')[] = ['fill'], states: string[] = ['rest', 'hover']) => slotFixture({
  box: { properties, states, rest: Object.fromEntries(properties.map((p) => [p, p === 'ink' ? '{ink-body}' : p === 'edge' ? '{edge-control}' : '{fill-control}'])) },
}, { ArenaCrumb: { group: 'choices', parts: { box: { to: 'choices.box', options: [], states, ...extra } } } }, 'choices');
const crumbManifest = (base: string, branches: Record<string, Record<string, Record<string, string>>> = {}) => new Map([['ArenaCrumb', {
  component: 'ArenaCrumb', slots: { box: base }, variants: branches,
} as never]]);
const crumbValue = (c: SlotCatalogue, name: string) => memberValue(c, 'ArenaCrumb.box', name, 'tailwind');

test('a hover inside one branch is read there and rest stays in the base class', () => {
  const d = crumbDeclared({ hoverIn: { axis: 'linked', value: 'true' } });
  assert.deepEqual(declarationProblems(d), []);
  const c = deriveSlots(d);
  assert.deepEqual(c.members['ArenaCrumb.box']?.hoverIn, { axis: 'linked', value: 'true' });
  const rest = `bg-[color:${crumbValue(c, 'choices-box-fill-rest')}]`;
  const hover = `hover:bg-[color:${crumbValue(c, 'choices-box-fill-hover')}]`;
  const branch = (text: string) => ({ linked: { true: { box: text }, false: {} } });
  assert.deepEqual(memberReadProblems(c, crumbManifest(rest, branch(hover))), []);
  assert.deepEqual(manifestProblems(c, crumbManifest(rest, branch(hover))), []);
  assert.deepEqual(memberReadProblems(c, crumbManifest(`${rest} ${hover}`, branch(''))),
    [`ArenaCrumb.box: choices-box-fill-hover is not read as ${hover} in the linked=true branch`]);
  assert.ok(manifestProblems(c, crumbManifest(rest)).some((l) => /ArenaCrumb declares no variant linked=true/.test(l)));
});

test('an edge drawn as a rule is read inside the inset shadow', () => {
  const d = crumbDeclared({ edgeAs: 'rule' }, ['edge'], ['rest']);
  assert.deepEqual(declarationProblems(d), []);
  const c = deriveSlots(d);
  assert.equal(c.members['ArenaCrumb.box']?.edgeAs, 'rule');
  const rule = `shadow-[inset_0_calc(var(--bw-strong)*-1)_0_${crumbValue(c, 'choices-box-edge-rest')}]`;
  assert.deepEqual(memberReadProblems(c, crumbManifest(rule)), []);
  assert.deepEqual(memberReadProblems(c, crumbManifest(`border-[color:${crumbValue(c, 'choices-box-edge-rest')}]`)),
    [`ArenaCrumb.box: choices-box-edge-rest is not read as ${rule} in the base class`]);
  assert.match(declarationProblems(crumbDeclared({ edgeAs: 'rule' }, ['fill'], ['rest'])).join('\n'), /ArenaCrumb\.parts\.box\.edgeAs: choices\.box paints no edge/);
  assert.match(declarationProblems(crumbDeclared({ edgeAs: 'line' as 'rule' }, ['edge'], ['rest'])).join('\n'), /edgeAs: "line" is not "rule"/);
});

test('an aria-disabled member reads its disabled states under aria-disabled:', () => {
  const d = crumbDeclared({ disabledModifier: 'aria-disabled:' }, ['fill'], ['rest', 'disabled']);
  assert.deepEqual(declarationProblems(d), []);
  const c = deriveSlots(d);
  const value = `bg-[color:${crumbValue(c, 'choices-box-fill-disabled')}]`;
  const rest = `bg-[color:${crumbValue(c, 'choices-box-fill-rest')}]`;
  assert.deepEqual(memberReadProblems(c, crumbManifest(`${rest} aria-disabled:${value}`)), []);
  assert.deepEqual(memberReadProblems(c, crumbManifest(`${rest} disabled:${value}`)),
    [`ArenaCrumb.box: choices-box-fill-disabled is not read as aria-disabled:${value} in the base class`]);
  const marker = 'opacity-[var(--choices-box-fade-disabled,var(--fade-disabled))]';
  assert.deepEqual(fadeProblems(c, crumbManifest(`${rest} aria-disabled:${value} aria-disabled:${marker}`)), []);
  assert.equal(fadeProblems(c, crumbManifest(`${rest} aria-disabled:${value} disabled:${marker}`)).length, 1, 'a marker under disabled: no longer carries the fade');
  assert.match(declarationProblems(crumbDeclared({ disabledModifier: 'disabled:' as 'aria-disabled:' }, ['fill'], ['rest', 'disabled'])).join('\n'), /disabledModifier: "disabled:" is not "aria-disabled:"/);
  assert.match(declarationProblems(crumbDeclared({ disabledModifier: 'aria-disabled:', disabledBy: { axis: 'disabled', value: 'true' } }, ['fill'], ['rest', 'disabled'])).join('\n'), /disabledModifier: it stands beside disabledBy/);
});

test('a rest hover that can beat a selected hover is refused', () => {
  const states = ['rest', 'hover', 'selected', 'selected-hover'];
  const d = crumbDeclared({ selectedBy: { axis: 'current', value: 'true' }, properties: ['fill'] }, ['fill', 'ink'], states);
  assert.deepEqual(declarationProblems(d), []);
  const c = deriveSlots(d);
  const v = (name: string) => crumbValue(c, name);
  const rest = `bg-[color:${v('choices-box-fill-rest')}]`;
  const hover = `hover:bg-[color:${v('choices-box-fill-hover')}]`;
  const selected = `bg-[color:${v('choices-box-fill-selected')}] hover:bg-[color:${v('choices-box-fill-selected-hover')}]`;
  const manifest = (base: string, unselected = '') => crumbManifest(base, { current: { true: { box: selected }, false: { box: unselected } } });
  assert.deepEqual(memberReadProblems(c, manifest(`${rest} ${hover}`)),
    ['ArenaCrumb.box: choices-box-fill-hover is read under hover: in the base class and choices-box-fill-selected-hover under hover: in the current=true branch, and a selected part matches both with no rule for their order (R4): read choices-box-fill-hover in the current=false branch']);
  assert.deepEqual(memberReadProblems(c, manifest(rest, hover)), []);
});

test('hoverIn beside hoverBy or onlyBy is refused', () => {
  const hoverIn = { axis: 'linked', value: 'true' };
  assert.match(declarationProblems(crumbDeclared({ hoverIn, hoverBy: { axis: 'dragging', value: 'true' } })).join('\n'), /hoverIn: it stands beside hoverBy/);
  assert.match(declarationProblems(crumbDeclared({ hoverIn, onlyBy: { axis: 'dragging', value: 'true' } })).join('\n'), /hoverIn: it stands beside onlyBy/);
  assert.match(declarationProblems(crumbDeclared({ hoverIn: { axis: 'linked', value: 'true' }, selectedBy: { axis: 'linked', value: 'true' } }, ['fill'], ['rest', 'hover', 'selected'])).join('\n'), /hoverIn: it shares the axis linked with selectedBy/);
});

test('a member state the group does not derive is refused', () => {
  const d = crumbDeclared({ states: ['rest', 'selected-disabled'] }, ['fill'], ['rest', 'hover']);
  assert.match(declarationProblems(d).join('\n'), /members\.ArenaCrumb\.parts\.box\.states: "selected-disabled" is a state none of choices\.box derives/);
  assert.deepEqual(declarationProblems(crumbDeclared({ states: ['rest'] }, ['fill'], ['rest', 'hover'])), [], 'a subset of the derived states is allowed');
});
