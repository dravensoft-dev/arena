/* The cut of a font: the weights a CSS paints, the plan the file's axis allows, and the subset
 * itself, read back through harfbuzzjs. The fonts are the three the repository ships. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Blob, Face } from 'harfbuzzjs';
import { KEPT_FEATURES, LATIN_1, cutFont, cutPlan, cutSteps, fontAxes, paintedWeights, unicodeRange, weightAxis } from './font-cut.ts';
import type { CutPlan } from './font-cut.ts';
import { loadFontTools } from './font-files.ts';
import { fontToolRoots } from './host.ts';

const fonts = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'assets', 'fonts');
const source = (name: string) => new Uint8Array(readFileSync(join(fonts, name)));
const loaded = loadFontTools(fontToolRoots());
if (!('tools' in loaded)) throw new Error(`the repository installs ${loaded.missing}`);
const { tools } = loaded;

const ROLES = ['display', 'body', 'mono'];

test('paintedWeights reads the roles\' weights from the sheets', () => {
  const css = `
    :root{--font-display:'Archivo',sans-serif;--font-body:'Familjen',sans-serif;--font-mono:'Spline',monospace;
      --ff-heading:var(--font-display);--ff-label:var(--font-body);--fw-heading:800;--fw-bold:700;--fw-control:var(--fw-bold)}
    @font-face{font-family:'Archivo';font-weight:100 900;src:url(a.woff2)}
    .h{font-family:var(--ff-heading);font-weight:var(--fw-heading)}
    .h2{font-family:var(--font-display);font-weight:900}
    .m{font-family:var(--font-mono);font-weight:normal}
    .m b{font-family:var(--font-mono);font-weight:bold}
    .c{font-weight:var(--fw-control)}
    .b{font-weight:400}
    .i{font-weight:inherit}
    .l{font-family:var(--ff-label)}
    @layer x{ .n{font-family:var(--font-body);font-weight:500} }`;
  const out = paintedWeights(css, ROLES);
  assert.deepEqual(out.get('display'), [800, 900]);
  assert.deepEqual(out.get('mono'), [400, 700]);
  assert.deepEqual(out.get('body'), [400, 500, 700]);
});

test('a rule naming a role\'s family and no weight paints that role at 400', () => {
  const out = paintedWeights('.a{font-family:var(--font-mono)}.b{font-family:var(--font-mono);font-weight:700}.c{font-family:var(--font-display);font-weight:800}', ROLES);
  assert.deepEqual(out.get('mono'), [400, 700]);
  assert.deepEqual(out.get('display'), [800]);
});

test('a weight no rule names stays unpainted, and a role nobody paints answers an empty list', () => {
  assert.deepEqual([...paintedWeights('.a{color:red}', ROLES)], [['display', []], ['body', []], ['mono', []]]);
});

test('cutPlan reproduces W7\'s choices', () => {
  assert.deepEqual(cutPlan([800, 900], [100, 900]), { kind: 'range', lo: 800, hi: 900, lost: [] });
  assert.deepEqual(cutPlan([400, 500, 600, 700], [400, 700]), { kind: 'range', lo: 400, hi: 700, lost: [] });
  assert.deepEqual(cutPlan([400, 700], [300, 700]), { kind: 'pins', at: [400, 700], lost: [] });
  assert.deepEqual(cutPlan([700], [400, 700]), { kind: 'pins', at: [700], lost: [] });
  assert.deepEqual(cutPlan([400, 700], null), { kind: 'pins', at: [400, 700] });
  assert.deepEqual(cutPlan([], [400, 700]), { kind: 'range', lo: 400, hi: 700, lost: [] });
  assert.deepEqual(cutSteps(cutPlan([400, 700], [300, 700])).map((one) => (one as { at: number[] }).at), [[400], [700]]);
});

test('unicodeRange collapses the Latin-1 set into runs', () => {
  assert.equal(unicodeRange(), 'U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201A,U+201C-201E,U+20AC');
  assert.equal(LATIN_1.length, 95 + 96 + 9);
  assert.deepEqual(KEPT_FEATURES, ['kern', 'liga', 'calt', 'tnum', 'lnum']);
});

async function codepoints(woff2: Uint8Array) {
  const face = new Face(new Blob(await tools.decompress(woff2)));
  return new Set(face.collectUnicodes());
}

test('a cut keeps Latin-1 and drops the rest', async () => {
  const input = source('familjen-grotesk.woff2');
  const before = await codepoints(input);
  const wide = [...before].find((cp) => cp > 0x20ac && cp !== 0x2122);
  assert.ok(wide !== undefined, 'the source holds a code point outside Latin-1');
  const { bytes } = await cutFont(input, { kind: 'range', lo: 400, hi: 700 }, LATIN_1, tools);
  const after = await codepoints(bytes);
  assert.ok(!after.has(wide as number));
  assert.ok(after.has(0x41) && after.has(0xe9) && after.has(0x20ac) && after.has(0x2014));
  assert.ok([...after].every((cp) => LATIN_1.includes(cp)));
});

test('a cut is smaller than its source and decodes as woff2', async () => {
  const cases: [string, CutPlan][] = [
    ['archivo.woff2', { kind: 'range', lo: 800, hi: 900 }],
    ['familjen-grotesk.woff2', { kind: 'range', lo: 400, hi: 700 }],
    ['spline-sans-mono.woff2', { kind: 'pins', at: [400] }],
  ];
  for (const [name, plan] of cases) {
    const input = source(name);
    const { bytes } = await cutFont(input, plan, LATIN_1, tools);
    assert.ok(bytes.length < input.length, `${name}: ${bytes.length} is not under ${input.length}`);
    assert.deepEqual([...bytes.slice(0, 4)], [0x77, 0x4f, 0x46, 0x32]);
    assert.ok((await tools.decompress(bytes)).length > 0);
  }
});

test('a range keeps the axis and a pin takes it away', async () => {
  const input = source('archivo.woff2');
  const range = await cutFont(input, { kind: 'range', lo: 800, hi: 900 }, LATIN_1, tools);
  const axis = weightAxis(await tools.decompress(range.bytes));
  assert.deepEqual(axis, [800, 900]);
  const pinned = await cutFont(input, { kind: 'pins', at: [800] }, LATIN_1, tools);
  assert.deepEqual(fontAxes(await tools.decompress(pinned.bytes)), []);
  assert.deepEqual(weightAxis(await tools.decompress(input)), [100, 900]);
});

test('a weight outside the axis is reported as lost, and the cut keeps what exists', async () => {
  const input = source('familjen-grotesk.woff2');
  const axis = weightAxis(await tools.decompress(input));
  assert.deepEqual(axis, [400, 700]);
  const plan = cutPlan([300, 500, 900], axis);
  assert.deepEqual(plan, { kind: 'range', lo: 400, hi: 700, lost: [300, 900] });
  const { bytes, lost } = await cutFont(input, plan, LATIN_1, tools);
  assert.deepEqual(lost, [300, 900]);
  assert.deepEqual(weightAxis(await tools.decompress(bytes)), [400, 700]);
});

test('cutFont refuses to run with no tools installed', async () => {
  await assert.rejects(() => cutFont(source('archivo.woff2'), { kind: 'range', lo: 400, hi: 900 }, LATIN_1, null), /no font tools/);
});
