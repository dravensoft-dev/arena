/* The sheet a consumer's own Tailwind compiles: Arena's @theme blocks and its @utility rules, and
 * nothing a browser or a second Tailwind would trip on. The block cut is asserted over a fixture,
 * because a cut that miscounts a nested brace passes over the real files until one of them nests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '@tailwindcss/node';
import { THEME_SOURCES, tailwindThemeSheet, topLevelBlocks } from './theme-sheet.ts';

test('topLevelBlocks takes whole blocks, nested braces included, and ignores comments', () => {
  const css = "/* @theme { not: this } */\n@import 'x';\n@theme {\n  --a: 1;\n}\n@utility u {\n  @media (x) { color: red; }\n}\n.plain { color: blue; }\n";
  assert.deepEqual(topLevelBlocks(css, '@theme'), ['@theme {\n  --a: 1;\n}']);
  assert.deepEqual(topLevelBlocks(css, '@utility'), ['@utility u {\n  @media (x) { color: red; }\n}']);
});

test('topLevelBlocks skips a statement that opens no block', () => {
  const css = '@layer theme, base;\n@layer base {\n  a { color: red; }\n}\n';
  assert.deepEqual(topLevelBlocks(css, '@layer'), ['@layer base {\n  a { color: red; }\n}']);
});

test('the sheet carries the themes and the utilities and nothing a browser or a second Tailwind would trip on', () => {
  const sheet = tailwindThemeSheet();
  assert.match(sheet, /--color-\*: initial;/);
  assert.match(sheet, /--color-base-100: var\(--color-base-100\);/);
  assert.match(sheet, /--breakpoint-md:/);
  assert.match(sheet, /@utility case-eyebrow/);
  assert.match(sheet, /@utility arena-pop/);
  assert.doesNotMatch(sheet, /@import/);
  assert.doesNotMatch(sheet, /@keyframes/);
  assert.doesNotMatch(sheet, /^\.arena-/m);
  assert.deepEqual(THEME_SOURCES.theme, ['frameworks/tailwind/Theme.css', 'frameworks/tailwind/Breakpoints.generated.css']);
});

test('the sheet carries both theme blocks, the inline one second', () => {
  const sheet = tailwindThemeSheet();
  const blocks = topLevelBlocks(sheet, '@theme');
  const inlineAt = blocks.findIndex((block) => block.startsWith('@theme inline'));
  assert.ok(inlineAt > 0, 'an @theme inline block follows the plain one');
  assert.match(blocks[0] ?? '', /--color-base-100: var\(--color-base-100\);/);
  assert.doesNotMatch(blocks[0] ?? '', /--color-surface:/);
  assert.match(blocks[inlineAt] ?? '', /--color-surface: var\(--fill-surface\);/);
  assert.match(blocks[inlineAt] ?? '', /--spacing-ctl-h: var\(--dz-ctl-h\);/);
  assert.doesNotMatch(blocks[inlineAt] ?? '', /: initial;/, 'a namespace is cleared once, in the first block');
});

test('a renamed key compiles to the variable it names, so a utility follows its subtree', async () => {
  const compiler = await compile(`@import 'tailwindcss' source(none);\n${tailwindThemeSheet()}`, {
    base: process.cwd(),
    onDependency: () => undefined,
  });
  const css = compiler.build(['bg-surface', 'text-ctl', 'h-ctl-h', 'bg-scrim']).replace(/\s+/g, '');
  assert.match(css, /\.bg-surface\{background-color:var\(--fill-surface\)/);
  assert.match(css, /\.text-ctl\{font-size:var\(--dz-text\)/);
  assert.match(css, /\.h-ctl-h\{height:var\(--dz-ctl-h\)/);
  assert.match(css, /\.bg-scrim\{background-color:var\(--scrim\)/);
});
