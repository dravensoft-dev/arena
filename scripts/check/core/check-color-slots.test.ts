import test from 'node:test';
import assert from 'node:assert/strict';
import { collect, shapeProblems, nameProblems, acceptsProblems, defaultProblems, fallbackProblems, pairProblems, manifestProblems, ringProblems, colourRoleSet, slotManifests } from './check-color-slots.ts';
import { readColorSlots } from '../../lib/core/color-slots.ts';
import type { SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';

const shipped = () => structuredClone(readColorSlots());
const roles = colourRoleSet();
const manifests = slotManifests();
const edit = (fn: (c: SlotCatalogue) => void) => { const c = shipped(); fn(c); return c; };

test('the shipped contract is clean', () => {
  assert.deepEqual(collect(), []);
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

test('a slot on a part or option its manifest lacks is refused', () => {
  const c = edit((x) => { x.slots['button-primary-root-fill-rest']!.option = 'solid'; });
  assert.ok(manifestProblems(c, manifests).some((l) => /solid/.test(l)));
  const gone = edit((x) => { for (const k of Object.keys(x.slots)) if (k.startsWith('split-button-') && k.includes('-caret-')) delete x.slots[k]; });
  assert.ok(manifestProblems(gone, manifests).some((l) => /caret/.test(l)));
});

test('the contract counts', () => {
  const slots = Object.values(shipped().slots);
  assert.equal(slots.length, 415);
  const by = (key: (s: (typeof slots)[number]) => string) => {
    const n: Record<string, number> = {};
    for (const s of slots) n[key(s)] = (n[key(s)] ?? 0) + 1;
    return n;
  };
  assert.deepEqual(by((s) => s.component ?? s.family ?? ''), {
    ArenaButton: 64, ArenaCopyButton: 32, ArenaFileInput: 24, ArenaIconButton: 56, ArenaSplitButton: 128,
    accent: 13, emphasis: 78, hue: 20,
  });
  assert.deepEqual(by((s) => s.state), { rest: 120, disabled: 79, hover: 87, pressed: 87, selected: 14, 'selected-hover': 14, 'selected-pressed': 14 });
  assert.equal(slots.filter((s) => s.optional).length, 79);
  assert.equal(slots.filter((s) => s.derive?.mix === 'mix-pressed').length, 9);
  assert.equal(slots.filter((s) => s.derive?.mix === 'mix-hover').length, 2);
});
