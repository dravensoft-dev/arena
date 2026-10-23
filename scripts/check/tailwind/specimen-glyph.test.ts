/* A specimen draws a glyph as an svg use against the repo sprite, from the same class list a
 * component's icon member takes, so the card names the glyph the way a consumer does. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

const win = new Window();
Object.assign(globalThis, { document: win.document });
const { glyph } = await import('../../../frameworks/tailwind/Specimen.js');

const idOf = (node: { querySelector(s: string): { getAttribute(n: string): string | null } | null }) => node.querySelector('use')!.getAttribute('href')!.split('#')[1];

test('a weight class and a glyph token name the symbol of the sprite', () => {
  assert.equal(idOf(glyph('ph-bold ph-x')), 'ph-bold-x');
  assert.equal(idOf(glyph('ph-fill ph-warning-circle')), 'ph-fill-warning-circle');
  assert.equal(idOf(glyph('ph-thin ph-gear')), 'ph-thin-gear');
  assert.equal(idOf(glyph('ph-caret-down ph-duotone')), 'ph-duotone-caret-down');
});

test('a bare ph is the regular weight, and a missing weight is regular too', () => {
  assert.equal(idOf(glyph('ph ph-bell')), 'ph-regular-bell');
  assert.equal(idOf(glyph('ph-bell')), 'ph-regular-bell');
});

test('the use points at the repo sprite and the svg is hidden from assistive technology', () => {
  const svg = glyph('ph-bold ph-x');
  assert.equal(svg.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.match(svg.querySelector('use')!.getAttribute('href')!, /assets\/Icons\.generated\.svg#ph-bold-x$/);
  assert.equal(svg.getAttribute('aria-hidden'), 'true');
  assert.equal(svg.getAttribute('focusable'), 'false');
});

test('classes that are not Phosphor stay, and so does every other prop', () => {
  const svg = glyph('arena-x__caret ph-bold ph-check text-[length:var(--icon-md)]', { 'data-arena-part': 'caret', title: 't' });
  assert.equal(svg.getAttribute('class'), 'arena-x__caret text-[length:var(--icon-md)]');
  assert.equal(svg.getAttribute('data-arena-part'), 'caret');
  assert.equal(svg.getAttribute('title'), 't');
});

test('with no size class the svg is one em square, and a given style is merged', () => {
  const plain = glyph('ph-bold ph-x');
  assert.match(plain.getAttribute('style')!, /width:\s*1em/);
  assert.match(plain.getAttribute('style')!, /height:\s*1em/);
  assert.match(plain.getAttribute('style')!, /fill:\s*currentColor/);
  const styled = glyph('ph-bold ph-x', { style: { fontSize: 'var(--icon-md)', color: 'red' } });
  assert.match(styled.getAttribute('style')!, /font-size:\s*var\(--icon-md\)/);
  assert.match(styled.getAttribute('style')!, /width:\s*1em/);
  assert.doesNotMatch(glyph('ph-bold ph-x size-6').getAttribute('style') ?? '', /width/);
});

test('a class list with no glyph token is an error, not a blank', () => {
  assert.throws(() => glyph('ph-bold text-sm'), /no glyph/);
});
