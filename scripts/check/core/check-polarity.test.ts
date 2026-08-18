import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blocksIn, schemeOf, invertOf, vocabularyProblems, declaredProblems, strayProblems, zeroProblems,
  scopeOf, collect,
} from './check-polarity.ts';

const THEMES = [
  { name: 'dark', selector: ':root' },
  { name: 'light', selector: '\\.arena-light' },
];

const sheet = (root: string, light: string) => `:root{ ${root} }\n.arena-light{ ${light} }\n`;

test('the tree as it stands has every theme pointing one way', () => {
  assert.deepEqual(collect().problems, []);
});

test('a block is read past its comments, and a selector declared twice is one body', () => {
  const blocks = blocksIn('/* .arena-light: color-scheme:light */\n:root{a:1}\n:root{b:2}\n');
  assert.equal(blocks.size, 1);
  assert.match(blocks.get(':root') ?? '', /a:1/);
  assert.match(blocks.get(':root') ?? '', /b:2/);
});

test('the reader takes the property and never a name that merely ends in it', () => {
  assert.equal(schemeOf('color-scheme:dark;'), 'dark');
  assert.equal(schemeOf('--my-color-scheme:dark;'), null);
  assert.equal(invertOf('--picker-invert:0;'), '0');
  assert.equal(invertOf(''), null);
});

test('a theme and its stylesheet agreeing is what a pass means', () => {
  const css = sheet('--picker-invert:1; color-scheme:dark;', '--picker-invert:0; color-scheme:light;');
  assert.deepEqual(declaredProblems(blocksIn(css), THEMES), []);
});

test('a scheme naming the other direction is reported, and so is one nobody declared', () => {
  const flipped = sheet('--picker-invert:1; color-scheme:light;', '--picker-invert:0; color-scheme:light;');
  const problems = declaredProblems(blocksIn(flipped), THEMES);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^:root declares color-scheme:light and .* calls it the dark theme/);

  const silent = sheet('--picker-invert:1;', '--picker-invert:0; color-scheme:light;');
  assert.match(declaredProblems(blocksIn(silent), THEMES)[0] ?? '', /color-scheme:\(nothing\)/);
});

test('the two statements of one direction are held against each other', () => {
  const css = sheet('--picker-invert:0; color-scheme:dark;', '--picker-invert:0; color-scheme:light;');
  const problems = declaredProblems(blocksIn(css), THEMES);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /:root declares --picker-invert:0 and a dark theme inverts by 1/);
});

test('a theme with no block at all is reported rather than skipped', () => {
  const problems = declaredProblems(blocksIn(':root{ --picker-invert:1; color-scheme:dark; }'), THEMES);
  assert.equal(problems.length, 1);
  assert.ok((problems[0] ?? '').includes('declares no block answering to /\\.arena-light/'));
});

test('a scope carrying a direction no theme claims is reported', () => {
  const css = `${sheet('--picker-invert:1; color-scheme:dark;', '--picker-invert:0; color-scheme:light;')}`
    + '.arena-sepia{ color-scheme:light; }\n';
  const problems = strayProblems(blocksIn(css), THEMES);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^\.arena-sepia declares a color-scheme/);
});

test('a scope declaring no scheme is not a stray, since most of the sheet is one', () => {
  const css = `${sheet('color-scheme:dark;', 'color-scheme:light;')}:root,.arena-light{ --bg:red; }\n`;
  assert.deepEqual(strayProblems(blocksIn(css), THEMES), []);
});

test('a polarity the property cannot take is reported before any block is read', () => {
  const problems = vocabularyProblems([{ name: 'midnight', selector: '\\.arena-midnight' }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /not one of dark, light/);
  assert.deepEqual(vocabularyProblems(THEMES), []);
});

test('an empty theme table is a failure and not a clean pass', () => {
  assert.equal(zeroProblems(0).length, 1);
  assert.deepEqual(zeroProblems(2), []);
});

test('a theme names the scope it answers to as a pattern, and the pattern is what matches it', () => {
  const blocks = blocksIn(':root{a:1}\n.arena-light{b:2}\n.arena-lightbox{c:3}\n');
  assert.equal(scopeOf(blocks, { selector: '\\.arena-light' }), '.arena-light');
  assert.equal(scopeOf(blocks, { selector: ':root' }), ':root');
  assert.equal(scopeOf(blocks, { selector: '\\.arena-sepia' }), null);
});
