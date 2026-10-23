/* The sprite writer: ids, the package layout, one symbol per glyph, what a weight lacks, and the
 * content-hashed name. The reader is a map of strings, so no Phosphor install is read. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { symbolId, glyphFile, spriteSvg, contentName, spriteModule } from './sprite.ts';

const svg = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">${inner}</svg>`;
const reader = (files: Record<string, string>) => (weight: string, name: string) => files[`${weight}/${name}`] ?? null;

test('symbol ids name weight and glyph, and regular for ph', () => {
  assert.equal(symbolId('bold', 'bell'), 'ph-bold-bell');
  assert.equal(symbolId('fill', 'x'), 'ph-fill-x');
  assert.equal(symbolId('regular', 'bell'), 'ph-bell');
});

test('glyphFile follows the package layout', () => {
  assert.equal(glyphFile('/c', 'bold', 'x'), '/c/assets/bold/x-bold.svg');
  assert.equal(glyphFile('/c', 'regular', 'x'), '/c/assets/regular/x.svg');
});

test('the sprite holds one symbol per glyph, sorted, and the same bytes twice', () => {
  const read = reader({ 'bold/b': svg('<path d="B"/>'), 'bold/a': svg('<path d="A"/>'), 'regular/c': svg('<path d="C"/>') });
  const one = [{ weight: 'regular', glyphs: new Set(['c']) }, { weight: 'bold', glyphs: new Set(['b', 'a']) }];
  const out = spriteSvg(one, read);
  assert.equal(out.kept, 3);
  assert.deepEqual([...out.svg.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]), ['ph-bold-a', 'ph-bold-b', 'ph-c']);
  assert.match(out.svg, /<symbol id="ph-bold-a" viewBox="0 0 256 256" fill="currentColor"><path d="A"\/><\/symbol>/);
  assert.ok(!out.svg.includes('xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill'));
  assert.equal(spriteSvg([...one].reverse(), read).svg, out.svg);
  assert.equal(spriteSvg(one, read).svg, out.svg);
});

test('each symbol carries the fill of the source root, since a use inherits from itself and not from the file', () => {
  const read = reader({ 'bold/a': svg('<path d="A"/>'), 'regular/c': svg('<path d="C"/>') });
  const out = spriteSvg([{ weight: 'bold', glyphs: new Set(['a']) }, { weight: 'regular', glyphs: new Set(['c']) }], read);
  const symbols = [...out.svg.matchAll(/<symbol [^>]*>/g)].map((m) => m[0]);
  assert.equal(symbols.length, 2);
  for (const tag of symbols) assert.match(tag, / fill="currentColor"/);
});

test('a glyph the weight lacks is reported, not drawn', () => {
  const out = spriteSvg([{ weight: 'fill', glyphs: new Set(['bell', 'not-a-glyph']) }], reader({ 'fill/bell': svg('<path/>') }));
  assert.deepEqual([...out.missing], [['fill', ['not-a-glyph']]]);
  assert.equal(out.kept, 1);
  assert.ok(!out.svg.includes('not-a-glyph'));
});

test('contentName changes exactly when the bytes do', () => {
  const a = contentName('arena-icons', 'svg', 'one');
  assert.match(a, /^arena-icons-[0-9a-f]{10}\.svg$/);
  assert.equal(contentName('arena-icons', 'svg', new TextEncoder().encode('one')), a);
  assert.notEqual(contentName('arena-icons', 'svg', 'two'), a);
});

test('spriteModule exports the file name', () => {
  assert.deepEqual(spriteModule('arena-icons-0123456789.svg'), {
    js: "export const ARENA_SPRITE = 'arena-icons-0123456789.svg';\n",
    dts: 'export declare const ARENA_SPRITE: string;\n',
  });
});
