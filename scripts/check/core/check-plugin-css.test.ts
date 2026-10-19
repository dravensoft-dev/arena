import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { CATALOGUE, SHEET, entries } from './check-catalogue.ts';
import { COMPLETE_CSS } from './check-style-plugin-coverage.ts';
import { node, pluginCssProblems, sheetProblems, sheetsIn, zeroScanProblems } from './check-plugin-css.ts';

const WHERE = 'plugin-style-store/x/plugin.css';

const CLEAN = '/* a witness */\n[data-arena-part="a"] { color: red; }\n[data-arena-part="b"] { margin: 0; }\n';

test('a clean sheet passes', () => {
  assert.deepEqual(sheetProblems(WHERE, CLEAN), []);
});

test('braces inside a comment are not blocks', () => {
  assert.deepEqual(sheetProblems(WHERE, `/* .a { */\n${CLEAN}/* } } */\n`), []);
});

test('a dangling selector fails, by file, line and selector', () => {
  const found = sheetProblems(WHERE, '[data-arena-part="a"] {\n[data-arena-part="b"] { color: red; }\n');
  assert.ok(found.some((one) => one.startsWith(`${WHERE}:1 leaves the block [data-arena-part="a"] open`)),
    found.join('\n'));
});

test('a dangling selector balanced by a later stray brace still fails', () => {
  const found = sheetProblems(WHERE,
    '[data-arena-part="a"] {\n[data-arena-part="b"] { color: red; }\n[data-arena-part="c"] { margin: 0; }\n}\n');
  assert.equal(found.length, 2, found.join('\n'));
  assert.match(found[0] ?? '', /:2 nests the rule \[data-arena-part="b"\] inside \[data-arena-part="a"\]/);
  assert.match(found[1] ?? '', /:3 nests the rule \[data-arena-part="c"\] inside \[data-arena-part="a"\]/);
});

test('a closing brace with no open block fails and names the rule before it', () => {
  const found = sheetProblems(WHERE, `${CLEAN}}\n[data-arena-part="d"] { color: blue; }\n}\n`);
  assert.equal(found.length, 2, found.join('\n'));
  assert.match(found[0] ?? '', /:4 closes a block that was never opened, after the rule \[data-arena-part="b"\]/);
  assert.match(found[1] ?? '', /:6 closes a block that was never opened, after the rule \[data-arena-part="d"\]/);
});

test('a selector rule nested in a selector rule fails', () => {
  const found = sheetProblems(WHERE, '[data-arena-part="a"] { color: red; &:hover { color: blue; } }\n');
  assert.equal(found.length, 1, found.join('\n'));
  assert.match(found[0] ?? '', /nests the rule &:hover inside \[data-arena-part="a"\]/);
});

test('a rule inside an at-rule passes, and a rule inside an at-rule inside a selector fails', () => {
  assert.deepEqual(sheetProblems(WHERE,
    '@media (min-width: 40rem) { [data-arena-part="a"] { color: red; } }\n'
    + '@scope (.x) { [data-arena-part="b"] { color: red; } }\n'
    + '@layer a { [data-arena-part="c"] { color: red; } }\n'
    + '@supports (color: red) { [data-arena-part="d"] { color: red; } }\n'
    + '@container (min-width: 10rem) { [data-arena-part="e"] { color: red; } }\n'), []);
  assert.equal(sheetProblems(WHERE,
    '[data-arena-part="a"] { @media (min-width: 40rem) { [data-arena-part="b"] { color: red; } } }\n').length, 1);
  assert.deepEqual(sheetProblems(WHERE,
    '[data-arena-part="a"] { @media (min-width: 40rem) { color: red; } }\n'), [], 'an at-rule holding only declarations is legitimate');
});

test('an empty scan fails, so a gate that finds no stylesheet is not a clean pass', () => {
  assert.equal(zeroScanProblems([]).length, 1);
  assert.match(zeroScanProblems([])[0] ?? '', /no stylesheet was read/);
  assert.deepEqual(zeroScanProblems([COMPLETE_CSS]), []);
});

test('the node declares the witness and the catalogue sheets it reads', () => {
  assert.equal(node.name, 'check:plugin-css');
  assert.deepEqual(node.reads, [COMPLETE_CSS, `${CATALOGUE}/*/${SHEET}`]);
});

test('the repository stylesheets are the witness and one per catalogue entry, and all of them pass', () => {
  const found = sheetsIn();
  assert.equal(found[0], COMPLETE_CSS);
  assert.equal(found.length, 1 + entries().length);
  for (const where of found) assert.ok(readFileSync(join(repoRoot, where), 'utf8').length > 0, where);
  assert.deepEqual(pluginCssProblems().problems, []);
});
