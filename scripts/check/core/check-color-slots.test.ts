import test from 'node:test';
import assert from 'node:assert/strict';
import { collect, declarationProblems, exceptionProblems, shapeProblems, nameProblems, acceptsProblems, defaultProblems, fallbackProblems, pairProblems, manifestProblems, ringProblems, readProblems, colourRoleSet, slotManifests } from './check-color-slots.ts';
import { readColorSlots, readSlotDeclarations } from '../../lib/core/color-slots.ts';
import type { SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';

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
  const c = edit((x) => { x.slots['button-primary-root-fill-rest']!.state = 'hover'; });
  const lines = nameProblems(c);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /button-primary-root-fill-rest/);
});

test('a key or a value outside the vocabulary is refused', () => {
  assert.ok(shapeProblems(edit((x) => { (x.slots['button-primary-root-fill-rest'] as any).colour = 'x'; })).length > 0);
  assert.ok(shapeProblems(edit((x) => { (x as any).extra = 1; })).length > 0);
  assert.ok(shapeProblems(edit((x) => { (x.slots['button-primary-root-fill-rest'] as any).state = 'active'; })).length > 0);
  assert.ok(shapeProblems(edit((x) => { x.slots['emphasis-primary-root-fill-rest']!.part = 'quiet'; })).length > 0);
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
  const c = edit((x) => { x.slots['emphasis-primary-root-fill-pressed']!.default = '{fill-hover}'; });
  const lines = defaultProblems(c, roles);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /emphasis-primary-root-fill-pressed/);
});

test('a default that is no accepted role, no slot and no transparent is refused', () => {
  assert.equal(defaultProblems(edit((x) => { x.slots['emphasis-primary-root-fill-rest']!.default = '{ink-body}'; }), roles).length, 1);
  assert.equal(defaultProblems(edit((x) => { x.slots['emphasis-primary-root-fill-rest']!.default = '#fff'; }), roles).length, 1);
  assert.equal(defaultProblems(edit((x) => { x.slots['emphasis-primary-root-ink-rest']!.default = 'transparent'; }), roles).length, 1);
});

test('a derive names its own rest slot, optional sits on disabled and mix on a fill', () => {
  assert.equal(defaultProblems(edit((x) => { x.slots['emphasis-primary-root-ink-hover']!.derive = { from: 'emphasis-primary-root-ink-pressed' }; }), roles).length, 1);
  assert.equal(defaultProblems(edit((x) => { x.slots['emphasis-primary-root-ink-hover']!.derive = { from: 'emphasis-primary-root-ink-rest', mix: 'mix-hover' }; }), roles).length, 1);
  assert.equal(defaultProblems(edit((x) => { delete x.slots['emphasis-primary-root-fill-rest']!.default; }), roles).length, 1);
});

test('a chain that returns to itself is refused', () => {
  const c = edit((x) => {
    x.slots['emphasis-ghost-root-icon-rest']!.default = '{emphasis-ghost-root-ink-rest}';
    x.slots['emphasis-ghost-root-ink-rest']!.default = '{emphasis-ghost-root-icon-rest}';
  });
  assert.ok(defaultProblems(c, roles).some((l) => /cycle/.test(l)));
});

test('a component slot must fall to its family slot', () => {
  const c = edit((x) => { x.slots['button-primary-root-fill-rest']!.default = '{emphasis-primary-fill}'; });
  const lines = fallbackProblems(c);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /emphasis-primary-root-fill-rest/);
});

test('copy button falls to icon button, and icon button edges to their role', () => {
  const c = shipped();
  assert.equal(c.slots['copy-button-ghost-root-fill-rest']!.default, '{icon-button-ghost-root-fill-rest}');
  assert.equal(c.slots['icon-button-ghost-root-edge-rest']!.default, '{emphasis-ghost-icon-edge}');
  assert.deepEqual(fallbackProblems(c), []);
});

test('a destructive slot falls to a role, and its hover fill to fill-hover', () => {
  const role = edit((x) => { x.slots['button-destructive-root-fill-rest']!.default = '{emphasis-primary-root-fill-rest}'; });
  assert.equal(fallbackProblems(role).length, 1);
  const hover = edit((x) => { x.slots['button-destructive-root-fill-hover']!.default = '{fill-selected}'; });
  assert.equal(fallbackProblems(hover).length, 1);
  assert.deepEqual(fallbackProblems(shipped()), []);
});

test('an icon slot at rest falls to its own ink and keeps its level', () => {
  assert.equal(fallbackProblems(edit((x) => { x.slots['emphasis-ghost-root-icon-rest']!.default = '{emphasis-ghost-root-ink-selected}'; })).length, 1);
  assert.equal(fallbackProblems(edit((x) => { delete x.slots['emphasis-ghost-root-icon-rest']!.level; })).length, 1);
});

test('an ink slot sits on its own fill', () => {
  const ground = edit((x) => { x.slots['button-primary-root-ink-rest']!.on = 'ground'; });
  assert.equal(pairProblems(ground).length, 1);
  const reader = edit((x) => { x.slots['emphasis-primary-root-ink-rest']!.on = 'reader'; });
  assert.equal(pairProblems(reader).length, 1);
  assert.equal(pairProblems(edit((x) => { x.slots['button-primary-root-fill-rest']!.on = 'reader'; })).length, 1);
  assert.deepEqual(pairProblems(shipped()), []);
});

test('a focusable slotted part declares its ring', () => {
  const c = edit((x) => { delete x.rings['ArenaButton.root']; });
  assert.equal(ringProblems(c, manifests).length, 1);
  assert.equal(ringProblems(edit((x) => { x.rings['ArenaButton.root'] = 'button-primary-root-fill-nothing'; }), manifests).length, 1);
});

test('a ring that names a fill is measured over each of its states, and a disabled fill is no ground', () => {
  assert.deepEqual(ringProblems(edit((x) => { x.rings['ArenaButton.root'] = 'button-primary-root-fill-rest'; }), manifests), []);
  const disabled = ringProblems(edit((x) => { x.rings['ArenaButton.root'] = 'button-primary-root-fill-disabled'; }), manifests);
  assert.equal(disabled.length, 1);
  assert.match(disabled[0] ?? '', /rings\.ArenaButton\.root is button-primary-root-fill-disabled, a fill the focus ring is never measured over/);
});

test('a slot on a part or option its manifest lacks is refused', () => {
  const c = edit((x) => { x.slots['button-primary-root-fill-rest']!.option = 'solid'; });
  assert.ok(manifestProblems(c, manifests).some((l) => /solid/.test(l)));
  const gone = edit((x) => { for (const k of Object.keys(x.slots)) if (k.startsWith('split-button-') && k.includes('-caret-')) delete x.slots[k]; });
  assert.ok(manifestProblems(gone, manifests).some((l) => /caret/.test(l)));
});

test('the contract counts', () => {
  const slots = Object.values(shipped().slots);
  assert.equal(slots.length, 396);
  const by = (key: (s: (typeof slots)[number]) => string) => {
    const n: Record<string, number> = {};
    for (const s of slots) n[key(s)] = (n[key(s)] ?? 0) + 1;
    return n;
  };
  assert.deepEqual(by((s) => s.component ?? s.family ?? ''), {
    ArenaButton: 64, ArenaCopyButton: 32, ArenaFileInput: 24, ArenaIconButton: 64, ArenaSplitButton: 128,
    emphasis: 84,
  });
  assert.deepEqual(by((s) => s.state), { rest: 87, disabled: 79, hover: 87, pressed: 87, selected: 14, 'selected-hover': 14, 'selected-pressed': 14, 'selected-disabled': 14 });
  assert.equal(slots.filter((s) => s.optional).length, 93);
  assert.equal(slots.filter((s) => s.derive?.mix === 'mix-pressed').length, 9);
  assert.equal(slots.filter((s) => s.derive?.mix === 'mix-hover').length, 2);
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

test('a family slot no part reads is refused', () => {
  const c = edit((x) => { x.slots['emphasis-primary-root-fill-rest']!.channel = '--arena-emphasis-fill-nobody'; });
  assert.ok(readProblems(c, manifests).some((line) => /emphasis-primary-root-fill-rest.*--arena-emphasis-fill-nobody/.test(line)));
});

test('a selected disabled slot is optional, falls to selected, and is read under disabled: in the pressed branch', () => {
  const c = shipped();
  assert.equal(c.slots['icon-button-ghost-root-ink-selected-disabled']!.optional, true);
  const lost = structuredClone(manifests) as Map<string, any>;
  const root = lost.get('ArenaIconButton').variants.pressed.true;
  const read = 'disabled:text-[color:var(--arena-emphasis-ink-selected-disabled)]';
  assert.ok(root.root.includes(read));
  root.root = root.root.replace(read, 'text-[color:var(--arena-emphasis-ink-selected-disabled)]');
  const lines = readProblems(c, lost);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /ArenaIconButton\.root.*--arena-emphasis-ink-selected-disabled.*disabled:/);
  const orphan = edit((x) => { delete x.slots['emphasis-ghost-root-ink-selected']; });
  assert.ok(shapeProblems(orphan).concat(defaultProblems(orphan, roles)).some((l) => /emphasis-ghost-root-ink-selected-disabled.*falls to emphasis-ghost-root-ink-selected/.test(l)));
});

test('an icon slot falls to the ink slot of its own part and state, in every state', () => {
  assert.deepEqual(fallbackProblems(shipped()), []);
  const c = shipped();
  assert.equal(c.slots['emphasis-ghost-root-icon-hover']!.default, '{emphasis-ghost-root-ink-hover}');
  assert.equal(c.slots['button-destructive-root-icon-pressed']!.default, '{button-destructive-root-ink-pressed}');
  assert.equal(c.slots['emphasis-solid-root-icon-selected-pressed']!.default, '{emphasis-solid-root-ink-selected-pressed}');
  const back = edit((x) => { delete x.slots['emphasis-ghost-root-icon-hover']!.derive; x.slots['emphasis-ghost-root-icon-hover']!.default = '{emphasis-ghost-root-icon-rest}'; });
  assert.equal(fallbackProblems(back).length, 1);
});

test('a disabled and a selected disabled icon slot fall to the ink of their own state, and keep optional', () => {
  const c = shipped();
  for (const [icon, ink] of [['emphasis-ghost-root-icon-disabled', 'emphasis-ghost-root-ink-disabled'],
    ['emphasis-ghost-root-icon-selected-disabled', 'emphasis-ghost-root-ink-selected-disabled'],
    ['button-destructive-root-icon-disabled', 'button-destructive-root-ink-disabled']] as const) {
    assert.equal(c.slots[icon]!.optional, true);
    assert.equal(c.slots[icon]!.default, `{${ink}}`);
  }
  const rest = edit((x) => { x.slots['emphasis-ghost-root-icon-disabled']!.default = '{emphasis-ghost-root-ink-rest}'; });
  assert.deepEqual(fallbackProblems(rest), ['emphasis-ghost-root-icon-disabled: it falls to {emphasis-ghost-root-ink-rest} and must fall to emphasis-ghost-root-ink-disabled']);
  const none = edit((x) => { delete x.slots['emphasis-ghost-root-icon-selected-disabled']!.default; });
  assert.deepEqual(fallbackProblems(none), ['emphasis-ghost-root-icon-selected-disabled: an icon slot falls to the ink slot of its own part and state, and this one names no default']);
});

test('a slot draws a part that carries slots of its own option, which is the part a channel read in it falls to', () => {
  assert.deepEqual(manifestProblems(shipped(), manifests), []);
  const lost = edit((x) => { for (const [name, slot] of Object.entries(x.slots)) if (slot.component === 'ArenaIconButton' && slot.option === 'solid') delete x.slots[name]; });
  assert.ok(manifestProblems(lost, manifests).some((line) => /^copy-button-solid-root-fill-rest: draws ArenaIconButton\.root, a part with no solid slots of its own/.test(line)));
});

const declared = () => structuredClone(readSlotDeclarations());

test('an exception the rule already produces is refused', () => {
  const d = declared();
  d.exceptions['emphasis-primary-root-fill-rest'] = { default: '{emphasis-primary-fill}', decision: 'D19' };
  const lines = exceptionProblems(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /emphasis-primary-root-fill-rest/);
  assert.match(lines[0] ?? '', /the rule already gives/);
});

test('an exception with no decision is refused', () => {
  const d = declared();
  d.exceptions['emphasis-ghost-root-fill-hover'] = { default: '{emphasis-ghost-fill-hover}' } as never;
  const lines = exceptionProblems(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /carries no decision/);
});

test('an exception naming no slot is refused', () => {
  const d = declared();
  d.exceptions['emphasis-nothing-root-fill-hover'] = { default: '{fill-hover}', decision: 'D19' };
  const lines = exceptionProblems(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /names no slot/);
});

test('an unknown declaration key is refused', () => {
  const d = declared();
  (d as any).extra = 1;
  (d.families.emphasis as any).colour = 1;
  (d.components.ArenaButton!.root as any).tone = 1;
  (d.variants.destructive as any).why = 1;
  (Object.values(d.exceptions)[0] as any).note = 1;
  (d.families.emphasis!.options!.primary as any).mood = 1;
  assert.equal(declarationProblems(d).length, 6);
});

test('a state set or family that is not declared is refused', () => {
  const d = declared();
  d.components.ArenaButton!.root!.states = 'nowhere';
  d.components.ArenaButton!.root!.family = 'nothing';
  assert.equal(declarationProblems(d).length, 2);
});

test('an undeclared state set on an option or an object-form part is refused', () => {
  const d = declared();
  d.families.emphasis!.options!.primary!.states = 'nowhere';
  assert.equal(declarationProblems(d).length, 1);
  const e = declared();
  (e.components.ArenaButton!.root as any).states = { '*': 'nowhere' };
  assert.equal(declarationProblems(e).length, 1);
  const f = declared();
  f.components.ArenaFileInput!.trigger!.states = ['rest', 'sparkle'];
  assert.equal(declarationProblems(f).length, 1);
});

test('an exception is compared with the rule without that entry alone, and a missing decision is named', () => {
  const d = declared();
  d.exceptions['emphasis-primary-root-fill-rest'] = { default: '{emphasis-primary-fill}', decision: 'D19' };
  d.exceptions['emphasis-ghost-root-fill-hover'] = { default: '{emphasis-ghost-fill-hover}' } as never;
  const lines = exceptionProblems(d);
  assert.equal(lines.length, 2);
  assert.ok(lines.some((l) => /carries no decision/.test(l) && !/undefined/.test(l)));
});

test('a redundant exception and one naming no slot are both reported, and nothing throws', () => {
  const d = declared();
  d.exceptions['emphasis-primary-root-fill-rest'] = { default: '{emphasis-primary-fill}', decision: 'D19' };
  d.exceptions['emphasis-nothing-root-fill-hover'] = { default: '{fill-hover}', decision: 'D19' };
  let lines: string[] = [];
  assert.doesNotThrow(() => { lines = exceptionProblems(d); });
  assert.equal(lines.length, 2);
  assert.ok(lines.some((l) => /emphasis-primary-root-fill-rest.*the rule already gives/.test(l)));
  assert.ok(lines.some((l) => /emphasis-nothing-root-fill-hover.*names no slot/.test(l)));
});

test('an object-form states value that is not a set name is refused', () => {
  const d = declared();
  (d.components.ArenaButton!.root as any).states = { '*': ['rest'] };
  const lines = declarationProblems(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /names a state set/);
});

test('the shipped declarations are clean', () => {
  const d = declared();
  assert.deepEqual(declarationProblems(d), []);
  assert.deepEqual(exceptionProblems(d), []);
});

test('a draws naming an undeclared part or a part that itself draws is refused', () => {
  const d = declared();
  d.components.ArenaCopyButton!.root!.draws = 'ArenaNope.root';
  const lines = declarationProblems(d);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /draws ArenaNope\.root/);
  const e = declared();
  e.components.ArenaCopyButton!.root!.draws = 'ArenaCopyButton.root';
  assert.equal(declarationProblems(e).length, 1);
  const f = declared();
  f.components.ArenaButton!.root = { draws: 'ArenaCopyButton.root', states: 'base' } as never;
  assert.equal(declarationProblems(f).length, 1);
});

test('a missing states on an option or a component part is refused and named', () => {
  const d = declared();
  delete (d.families.emphasis!.options!.primary as any).states;
  delete (d.components.ArenaButton!.root as any).states;
  const lines = declarationProblems(d);
  assert.equal(lines.length, 2);
  assert.ok(lines.some((l) => /families\.emphasis\.options\.primary.*no states/.test(l)));
  assert.ok(lines.some((l) => /components\.ArenaButton\.root.*no states/.test(l)));
});

test('an own key, an own row key or an own decision outside the declaration is refused', () => {
  const a = declared();
  (a.components.ArenaIconButton!.root!.own as any).edges = { ghost: 'transparent', decision: 'D21' };
  assert.equal(declarationProblems(a).length, 1);
  const b = declared();
  (b.components.ArenaIconButton!.root!.own!.edge as any).loud = 'transparent';
  assert.equal(declarationProblems(b).length, 1);
  const c = declared();
  c.components.ArenaIconButton!.root!.own!.edge!.decision = 'because';
  assert.equal(declarationProblems(c).length, 1);
  const e = declared();
  delete e.components.ArenaIconButton!.root!.own!.edge!.decision;
  assert.equal(declarationProblems(e).length, 1);
});

test('a template or optionsFrom key on a family, a selected key outside fill, ink and edge, and an ink answer off icon are refused', () => {
  const a = declared();
  (a.families.emphasis as any).template = { mark: { ink: '{x}' } };
  assert.match(declarationProblems(a).join('\n'), /families\.emphasis: unknown key "template"/);
  (a.families.emphasis as any).optionsFrom = ['danger'];
  assert.equal(declarationProblems(a).length, 2);
  const b = declared();
  (b.selected as any).icon = 'ink';
  assert.equal(declarationProblems(b).length, 1);
  const c = declared();
  (c.families.emphasis!.options!.ghost!.parts.root as any).edge = 'ink';
  assert.equal(declarationProblems(c).length, 1);
  const e = declared();
  (e.variants.destructive!.rest as any).edge = 'ink';
  assert.equal(declarationProblems(e).length, 1);
});
