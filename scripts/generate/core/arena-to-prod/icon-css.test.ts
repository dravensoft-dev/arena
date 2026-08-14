import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan, drawn, sheetRules, subset, iconsCss, woff2Source, WEIGHT_CLASSES } from './icon-css.ts';
import type { IconScan } from './icon-css.ts';

const sheet = (selector: string, extra = '') => `@font-face {
  font-family: "Phosphor-Bold";
  src:
    url("./Phosphor-Bold.woff2") format("woff2"),
    url("./Phosphor-Bold.ttf") format("truetype");
  font-weight: normal;
  font-display: block;
}

${selector} {
  /* use !important to beat a browser extension */
  font-family: "Phosphor-Bold" !important;
}

${selector}.ph-bell:before {
  content: "\\e0ce";
}

${selector}.ph-moon:before {
  content: "\\e330";
}
${extra}`;

const list = (found: IconScan) => drawn(found).map(({ weight, glyphs }) => [weight, [...glyphs].sort()]);

test('a weight and a glyph in one class list are read as that pair and no other', () => {
  assert.deepEqual(list(scan('<i class="ph-bold ph-bell"></i>')), [['bold', ['ph-bell']]]);
});

test('the regular weight is read only when a glyph sits beside it', () => {
  assert.deepEqual(list(scan('const ph = 1;')), []);
  assert.deepEqual(list(scan('<i class="ph ph-bell"></i>')), [['regular', ['ph-bell']]]);
});

test('a weight named on its own ships nothing, because a list of weights is not a rendering', () => {
  assert.deepEqual(list(scan("export const ARENA_WEIGHTS = ['ph-thin', 'ph-light', 'ph-bold'];")), []);
});

test('a word merely ending in ph is not a class list', () => {
  assert.deepEqual(list(scan('paragraph-two graph-bar morph-target')), []);
});

test('a glyph with no weight beside it reaches every weight, because the weight is decided elsewhere', () => {
  const found = scan('<i class="ph-bold ph-bell"></i>');
  scan("icon: 'ph-rocket-launch'", found);
  assert.deepEqual(list(found), [['bold', ['ph-bell', 'ph-rocket-launch']]]);
});

test('a loose glyph alone ships nothing, because no weight names a font to draw it with', () => {
  assert.deepEqual(list(scan("icon: 'ph-rocket-launch'")), []);
});

test('one scan accumulates across sources, which is how two trees become one set', () => {
  const found = scan('<i class="ph-bold ph-bell"></i>');
  scan('<i class="ph-fill ph-moon"></i>', found);
  assert.deepEqual(list(found), [['bold', ['ph-bell']], ['fill', ['ph-moon']]]);
});

test('a sheet is read as its font face, its base rule and one entry per glyph', () => {
  const rules = sheetRules(sheet('.ph-bold'), 'bold');
  assert.deepEqual(rules.fontFace?.map(([name]) => name), ['font-family', 'src', 'font-weight', 'font-display']);
  assert.deepEqual(rules.base, [['font-family', '"Phosphor-Bold" !important']]);
  assert.deepEqual([...rules.glyphs.keys()], ['ph-bell', 'ph-moon']);
});

test('only the glyphs asked for survive, and the src becomes the one format a browser reads', () => {
  const { css, missing, kept } = subset(sheet('.ph-bold'), 'bold', new Set(['ph-bell']), '../fonts/b.woff2');
  assert.match(css, /src:url\('\.\.\/fonts\/b\.woff2'\) format\('woff2'\)/);
  assert.doesNotMatch(css, /truetype/);
  assert.match(css, /\.ph-bold\.ph-bell:before\{content:"\\e0ce"\}/);
  assert.doesNotMatch(css, /ph-moon/);
  assert.deepEqual(missing, []);
  assert.equal(kept, 1);
});

test('the src lands beside font-family rather than at the end, which is where Phosphor puts it', () => {
  const { css } = subset(sheet('.ph-bold'), 'bold', new Set(['ph-bell']), './b.woff2');
  const block = /@font-face\{([^}]*)\}/.exec(css);
  assert.ok(block, 'the subset declares no @font-face at all');
  const face = block[1];
  assert.deepEqual((face ?? '').split(';').map((d) => d.split(':')[0]), ['font-family', 'src', 'font-weight', 'font-display']);
});

test('a glyph the weight does not draw is named rather than written', () => {
  const { css, missing } = subset(sheet('.ph-bold'), 'bold', new Set(['ph-bell', 'ph-nope']), './b.woff2');
  assert.deepEqual(missing, ['ph-nope']);
  assert.doesNotMatch(css, /ph-nope/);
});

test('duotone keeps both halves of a glyph, because one of them is the second colour', () => {
  const duotone = sheet('.ph-duotone', '\n.ph-duotone.ph-bell:after {\n  content: "\\e0cf";\n  opacity: 0.2;\n}\n');
  const { css } = subset(duotone, 'duotone', new Set(['ph-bell']), './d.woff2');
  assert.match(css, /\.ph-duotone\.ph-bell:before\{/);
  assert.match(css, /\.ph-duotone\.ph-bell:after\{content:"\\e0cf";opacity:0\.2\}/);
});

test('a sheet shaped unlike Phosphor throws rather than writing a stylesheet that renders nothing', () => {
  assert.throws(() => subset('.ph-bold{}', 'bold', new Set(['ph-bell']), './b.woff2'), /not shaped the way this reads it/);
});

test('the woff2 the font face names is read off the sheet, never guessed from the weight', () => {
  assert.equal(woff2Source(sheet('.ph-bold'), 'bold'), './Phosphor-Bold.woff2');
  assert.equal(woff2Source('@font-face{src:url("./x.ttf") format("truetype")}', 'bold'), null);
});

test('every weight is written into one file and a glyph drawn by any of them counts once', () => {
  const glyphs = new Set(['ph-bell', 'ph-nope']);
  const { css, kept, missing } = iconsCss([
    { weight: 'bold', css: sheet('.ph-bold'), fontPath: './b.woff2', glyphs },
    { weight: 'fill', css: sheet('.ph-fill'), fontPath: './f.woff2', glyphs },
  ], 'src');
  assert.equal(kept, 1);
  assert.deepEqual([...missing.keys()], ['bold', 'fill']);
  assert.equal(css.match(/@font-face/g)?.length, 2);
  assert.match(css, /^\/\* GENERATED by arena-to-prod from src\./);
});

test('the class a weight is written with is the one Phosphor ships, and regular carries no suffix', () => {
  assert.equal(WEIGHT_CLASSES.regular, 'ph');
  assert.equal(WEIGHT_CLASSES.duotone, 'ph-duotone');
});
