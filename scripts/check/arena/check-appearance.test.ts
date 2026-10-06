/* The classifier is the whole gate, so it is driven here by value rather than by the tree:
 * a property whose every branch is a literal is appearance somebody typed out, and one that
 * reads an identifier or an interpolation is a computation the manifest cannot hold. The two
 * one map left is asserted by name for the reason every map in this tree is: EXEMPT is empty,
 * and that emptiness is the claim that every literal still standing is a computation. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXEMPT, adoptionProblems, angularRendersManifest, collect, literalStyleProblems,
  reactRendersManifest, styleObjectBodies, valueIsLiteral,
} from './check-appearance.ts';

const at = (path: string, text: string) => literalStyleProblems(text, path).map((p) => `${p.key}=${p.value}`);

test('a quoted string, a number and a keyword are literals', () => {
  assert.equal(valueIsLiteral("'var(--crimson)'"), true);
  assert.equal(valueIsLiteral('0.45'), true);
  assert.equal(valueIsLiteral("'none'"), true);
  assert.equal(valueIsLiteral('`inline-flex`'), true);
  assert.equal(valueIsLiteral('undefined'), true);
});

test('anything reading an identifier or an interpolation is a computation', () => {
  assert.equal(valueIsLiteral('color'), false);
  assert.equal(valueIsLiteral('`${rawH}px`'), false);
  assert.equal(valueIsLiteral("`color-mix(in oklab, ${color} 16%, var(--surface-card))`"), false);
  assert.equal(valueIsLiteral('tracks()'), false);
});

test('a ternary is literal only where every branch is', () => {
  assert.equal(valueIsLiteral("disabled ? 0.45 : 1"), true);
  assert.equal(valueIsLiteral("accent ? 'var(--crimson)' : 'var(--color-base-300)'"), true);
  assert.equal(valueIsLiteral("hover ? tint : 'transparent'"), false);
});

test('THE CORE CLAIM: an inline style property made only of literals is hand-written appearance', () => {
  assert.deepEqual(at('X.tsx', "<i style={{ background: 'var(--crimson)' }} />"),
    ["background='var(--crimson)'"]);
  assert.deepEqual(at('X.tsx', '<i style={{ opacity: disabled ? 0.45 : 1 }} />'),
    ['opacity=disabled ? 0.45 : 1']);
});

test('and a property computed at runtime is not, which is the line the migration draws', () => {
  assert.deepEqual(at('X.tsx', '<i style={{ borderLeftColor: color }} />'), []);
  assert.deepEqual(at('X.tsx', '<i style={{ height: `${rawH}px` }} />'), []);
  assert.deepEqual(at('X.tsx', '<i style={{ ...box }} />'), []);
  assert.deepEqual(at('X.tsx', '<i style={{ ...box, top: y(slot.start) }} />'), []);
});

test('a ternary inside a value is not mistaken for another property', () => {
  assert.deepEqual(at('X.tsx', "<i style={{ background: live && hover ? bg : 'transparent' }} />"), []);
});

test('a module constant annotated React.CSSProperties is a style object too', () => {
  assert.deepEqual(at('X.tsx', "const BAR: React.CSSProperties = { display: 'flex', gap: 'var(--sp-1)' };"),
    ["display='flex'", "gap='var(--sp-1)'"]);
});

test('and so is an object a function annotated React.CSSProperties returns', () => {
  const src = [
    'export function rowStyle({ depth }: Options): React.CSSProperties {',
    "  return { display: 'flex', paddingInlineStart: arenaIndentFor(depth) };",
    '}',
  ].join('\n');
  assert.deepEqual(at('X.tsx', src), ["display='flex'"]);
});

test('an ordinary object that is not a style object is out of reach, and that is the scope', () => {
  assert.deepEqual(at('X.tsx', "const TONES = { neutral: 'var(--color-base-300)' };"), []);
});

test('a custom property set to a literal is hand-written appearance as much as a named one', () => {
  assert.deepEqual(at('X.tsx', "<i style={{ '--ring': 'var(--crimson)' }} />"), ["--ring='var(--crimson)'"]);
});

test('styleObjectBodies finds each region once, and nothing outside one', () => {
  const src = "const A = { x: 1 };\n<i style={{ top: 0 }} />\nconst B: React.CSSProperties = { left: 0 };";
  const bodies = styleObjectBodies(src);
  assert.equal(bodies.length, 2);
  assert.match(bodies[0]?.text ?? '', /top: 0/);
  assert.match(bodies[1]?.text ?? '', /left: 0/);
});

test('a comment is not a style object, whatever it quotes', () => {
  assert.deepEqual(at('X.tsx', "// style={{ background: 'var(--crimson)' }}\nconst x = 1;"), []);
});

test('EXEMPT is empty, and that is a claim: every literal left standing is a computation', () => {
  assert.equal(EXEMPT.size, 0);
});

test('adoption reads the manifest a component has to render, its own or its parent\'s', () => {
  assert.deepEqual(adoptionProblems('ArenaTag'), [], 'ArenaTag renders its own manifest in both layers');
  assert.deepEqual(adoptionProblems('ArenaTableCell'), [], 'ArenaTableCell renders ArenaTable\'s');
});

test('a source that renders no manifest is what the adoption half reads for', () => {
  const drawn = "import { arenaStyles } from '../../../ArenaStyles.generated.ts';\nimport m from './ArenaBadge.classes.generated.ts';";
  assert.equal(reactRendersManifest(drawn, 'ArenaBadge'), true);
  assert.equal(reactRendersManifest(drawn, 'ArenaCard'), false, 'it has to be THIS component\'s manifest');
  assert.equal(reactRendersManifest("const S = { background: 'var(--crimson)' };", 'ArenaBadge'), false);

  assert.equal(angularRendersManifest("import { arenaBadgeStyles } from './ArenaBadge.variants';"), true);
  assert.equal(angularRendersManifest("import { Component } from '@angular/core';"), false);
});

test('a hand-drawn component that owns a manifest is held to rendering it, layer by layer', () => {
  const problems = adoptionProblems('ArenaBarChart');
  assert.ok(problems.every((p) => p.startsWith('ArenaBarChart')));
  assert.ok(problems.every((p) => !p.includes('HAND_DRAWN')), 'it has a manifest, so it is not named as one with nothing to render');
});

test('every component in scope renders its manifest and writes no appearance by hand', () => {
  const { adoption, literals, walked, scanned } = collect();
  assert.ok(walked >= 55, 'the literal half walked almost nothing, so it proves almost nothing');
  assert.ok(scanned > 0, 'every file excused would leave this half reading nothing at all');
  assert.deepEqual(adoption, []);
  assert.deepEqual(literals, []);
});

test('the literal half never walks dist/, which holds a copy of each layer', () => {
  const { files } = collect();
  assert.equal(files.some((f) => f.split('/').includes('dist')), false);
});
