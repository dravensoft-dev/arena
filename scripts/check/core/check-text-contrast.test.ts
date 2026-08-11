import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLORS, PALETTE, REMOVED, resolvePercent, scopesToMeasure, structureOf, surfacesUnder,
} from './check-text-contrast.ts';

const structure = structureOf([
  ':root, .arena-light {',
  '  --text-strong: var(--color-base-content);',
  '  --text-body: color-mix(in oklab, var(--color-base-content) 82%, transparent);',
  '  --text-muted: var(--mute);',
  '  --mute: color-mix(in oklab, var(--color-base-content) 61%, transparent);',
  '  --loop-a: var(--loop-b);',
  '  --loop-b: var(--loop-a);',
  '  --painted: #ff0000;',
  '}',
].join('\n'));

test('a level that is base-content itself is the whole of it', () => {
  assert.equal(resolvePercent(structure, 'text-strong'), 100);
});

test('a level mixed with transparent resolves to the percentage it keeps', () => {
  assert.equal(resolvePercent(structure, 'text-body'), 82);
});

test('an alias resolves to what it points at, however many hops away that is', () => {
  assert.equal(resolvePercent(structure, 'text-muted'), 61,
    'colors.css names a level twice on purpose, so following one hop is not enough');
});

test('a level nothing declares is absent rather than zero', () => {
  assert.equal(resolvePercent(structure, 'text-nothing'), null,
    'zero would read as a fully transparent level and clear no gate by measuring nothing');
});

test('an alias cycle is named, never followed until the stack ends', () => {
  assert.throws(() => resolvePercent(structure, 'loop-a'), /--loop-a is a circular reference/);
});

test('a level that is a colour rather than a derivation of base-content is refused', () => {
  assert.throws(() => resolvePercent(structure, 'painted'),
    /--painted resolves to "#ff0000", which is neither base-content, a color-mix of it, nor a var\(\) alias/,
    'the gate measures levels derived from one content colour, so a pinned hex is outside what it '
    + 'can compose and is reported instead of silently skipped');
});

test('a retired token carries the token that replaces it, so the failure is actionable', () => {
  assert.ok(REMOVED.length > 0, 'an empty list holds nothing and would pass over any reappearance');
  for (const { token, use } of REMOVED) {
    assert.ok(token && use, `${token} is retired with no replacement named`);
    assert.equal(REMOVED.filter((r) => r.token === token).length, 1, `${token} is listed twice`);
  }
});

test('the two sheets are named once each, and they are not the same sheet', () => {
  assert.match(PALETTE, /^contracts\/design-generated\//);
  assert.match(COLORS, /^contracts\/design\//);
  assert.notEqual(PALETTE, COLORS,
    'the skin values are generated and the derivations are hand-written, and the gate needs both');
});

test('the surfaces text is measured on come from the fill roles, so a reassignment is not measured against the old one', () => {
  const flat = new Map([['fill-surface', 'var(--color-base-100)'], ['fill-surface-floating', 'var(--color-base-200)']]);
  assert.deepEqual(surfacesUnder(flat), ['color-base-100', 'color-base-200']);
  const raised = new Map([['fill-surface', 'var(--color-base-300)'], ['fill-surface-floating', 'var(--color-base-200)']]);
  assert.deepEqual(surfacesUnder(raised), ['color-base-100', 'color-base-300', 'color-base-200']);
});

test('a role that is not a reference contributes no surface, rather than a name nothing declares', () => {
  assert.deepEqual(surfacesUnder(new Map([['fill-surface', '#1d1715']])), ['color-base-100']);
  assert.deepEqual(surfacesUnder(new Map()), ['color-base-100']);
});

test('an extension that moves no fill adds no scope, so the run is not the same measurement twice', () => {
  const css = ':root{--fill-surface:var(--color-base-200)}\n.arena-quiet{--r-surface:22px}\n'
    + '.arena-loud{--fill-surface:var(--color-base-300)}';
  const scopes = scopesToMeasure(css, 'dark', ['quiet', 'loud']);
  assert.deepEqual(scopes.map((s) => s.label), ['no extension', '.arena-loud']);
  assert.deepEqual(scopes[1]?.surfaces, ['color-base-100', 'color-base-300']);
});
